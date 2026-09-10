import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type ValidationError } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from '../dist/src/auth/auth.controller';
import { parseTrustProxy } from '../dist/src/bootstrap/trust-proxy';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor';
import { AppException } from '../dist/src/common/errors/app.exception';
import { ErrorCode } from '../dist/src/common/errors/error-codes';
import { AuthService } from '../dist/src/auth/auth.service';
import { PrismaService } from '../dist/src/prisma/prisma.service';

const PREFIX = 'api/v1';

let app: NestExpressApplication;
let base: string;
let authService: AuthService;
interface AttemptEntry { attempts: number; firstAttemptAt: number }
interface CacheEntry { accessToken: string; rawRefreshToken: string; expiresAt: number }
interface AuthInternals {
  loginAttempts: Map<string, AttemptEntry>;
  rotationCache: Map<string, CacheEntry>;
  getRotationCache(key: string): CacheEntry | undefined;
  setRotationCache(key: string, entry: CacheEntry): void;
  recordFailedLogin(ip: string, email: string): void;
}
const internals = () => authService as unknown as AuthInternals;

function toDetails(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const err of errors) {
    const field = prefix ? `${prefix}.${err.property}` : err.property;
    const messages = Object.values(err.constraints ?? {});
    if (messages.length) out[field] = [...(out[field] ?? []), ...messages];
    if (err.children?.length) Object.assign(out, toDetails(err.children, field));
  }
  return out;
}

type Res = {
  status: number;
  headers: Headers;
  body: { code?: string };
};

async function req(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<Res> {
  const reqHeaders: Record<string, string> = { ...headers };
  if (body) reqHeaders['content-type'] = 'application/json';

  const res = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: res.status,
    headers: res.headers,
    body: await res.json().catch(() => null),
  };
}

before(async () => {
  // Only persistence is stubbed. Real controller, limiter and bcrypt run over HTTP.
  // Full auth/concurrency suites remain responsible for actual database behavior.
  const prisma = { user: { findUnique: async () => null } } as unknown as PrismaService;
  authService = new AuthService(prisma, new JwtService(), new ConfigService({ JWT_ACCESS_SECRET: 'isolated-test-only' }));
  class FixtureModule {}
  Module({ controllers: [AuthController], providers: [{ provide: AuthService, useValue: authService }] })(FixtureModule);
  const nestApp = await NestFactory.create<NestExpressApplication>(FixtureModule, { logger: false });
  nestApp.setGlobalPrefix(PREFIX);
  nestApp.use(cookieParser());
  nestApp.set('trust proxy', parseTrustProxy('1'));

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new AppException(ErrorCode.VALIDATION_ERROR, 'Dữ liệu không hợp lệ', toDetails(errors)),
    }),
  );
  nestApp.useGlobalInterceptors(new EnvelopeInterceptor());
  nestApp.useGlobalFilters(new GlobalExceptionFilter());

  await nestApp.listen(0);
  app = nestApp;
  base = (await app.getUrl()).replace('[::1]', 'localhost');
  authService = app.get(AuthService);

});

after(async () => {
  await app?.close();
});

describe('A1: loginAttempts Map Cleanup & Window Verification', () => {
  it('sweeps expired entries from loginAttempts on check/write without timer', async () => {
    const internalAttempts = internals().loginAttempts;
    const now = Date.now();
    const expiredTimestamp = now - 16 * 60 * 1000; // 16 minutes ago (past 15m window)

    // Seed 6 expired entries
    for (let i = 1; i <= 6; i++) {
      internalAttempts.set(`192.168.1.${i}:user${i}@test.local`, {
        attempts: 2,
        firstAttemptAt: expiredTimestamp,
      });
    }
    assert.ok(internalAttempts.size >= 6);

    // Now trigger a login with a new key at time T
    await req('POST', '/auth/login', {
      email: 'active-user@test.local',
      password: 'WrongPassword123!',
    });

    // All 6 expired keys must have been swept
    for (let i = 1; i <= 6; i++) {
      assert.equal(internalAttempts.has(`192.168.1.${i}:user${i}@test.local`), false);
    }
  });

  it('enforces 5 fails -> 6th fails with 429; 429 does NOT increment counter; resets after 15m', async () => {
    const email = 'rate-limit-test@test.local';
    const ip = '10.20.30.40';
    const internalAttempts = internals().loginAttempts;
    const key = `${ip}:${email}`;

    internalAttempts.delete(key);

    // 5 failed attempts -> 401
    for (let i = 1; i <= 5; i++) {
      const res = await req(
        'POST',
        '/auth/login',
        { email, password: 'WrongPassword!' },
        { 'x-forwarded-for': ip },
      );
      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'AUTH_INVALID_CREDENTIALS');
    }

    assert.equal(internalAttempts.get(key)?.attempts, 5);

    // 6th attempt -> 429 Too Many Requests
    const res6 = await req(
      'POST',
      '/auth/login',
      { email, password: 'WrongPassword!' },
      { 'x-forwarded-for': ip },
    );
    assert.equal(res6.status, 429);
    assert.equal(res6.body.code, 'AUTH_TOO_MANY_REQUESTS');

    // 7th attempt -> 429 Too Many Requests
    const res7 = await req(
      'POST',
      '/auth/login',
      { email, password: 'WrongPassword!' },
      { 'x-forwarded-for': ip },
    );
    assert.equal(res7.status, 429);

    // Counter must remain 5, not 6 or 7
    assert.equal(internalAttempts.get(key)?.attempts, 5);

    // Age the entry past 15m window
    internalAttempts.get(key)!.firstAttemptAt = Date.now() - 16 * 60 * 1000;

    // Next attempt is permitted (401 credentials error instead of 429), resetting attempts to 1
    const resAfterWindow = await req(
      'POST',
      '/auth/login',
      { email, password: 'WrongPassword!' },
      { 'x-forwarded-for': ip },
    );
    assert.equal(resAfterWindow.status, 401);
    assert.equal(resAfterWindow.body.code, 'AUTH_INVALID_CREDENTIALS');
    assert.equal(internalAttempts.get(key)?.attempts, 1);
  });
});

describe('A1: rotationCache Cleanup & Eviction', () => {
  it('deletes expired entry from rotationCache when read', async () => {
    const internalCache = internals().rotationCache;
    const fakeTokenHash = 'hash-expired-test';

    // Insert expired rotation cache entry
    internalCache.set(fakeTokenHash, {
      accessToken: 'fake-access-token',
      rawRefreshToken: 'fake-raw-token',
      expiresAt: Date.now() - 1000, // expired 1s ago
    });

    const initialSize = internalCache.size;
    assert.ok(internalCache.has(fakeTokenHash));

    // Call getRotationCache to read and verify expired entry is pruned
    const cached = internals().getRotationCache(fakeTokenHash);
    assert.equal(cached, undefined);

    // Cache must have evicted fakeTokenHash
    assert.equal(internalCache.has(fakeTokenHash), false);
    assert.equal(internalCache.size, initialSize - 1);
  });

  it('evicts oldest entry when rotationCache exceeds MAX_ROTATION_CACHE_ENTRIES limit', async () => {
    const internalCache = internals().rotationCache;
    const maxEntries = AuthService.MAX_ROTATION_CACHE_ENTRIES;

    internalCache.clear();

    // Fill to maxEntries
    const now = Date.now();
    for (let i = 0; i < maxEntries; i++) {
      internalCache.set(`key-${i}`, {
        accessToken: `at-${i}`,
        rawRefreshToken: `rt-${i}`,
        expiresAt: now + 30_000,
      });
    }

    assert.equal(internalCache.size, maxEntries);
    assert.ok(internalCache.has('key-0')); // oldest entry

    // Add 1 more entry via setRotationCache
    if (typeof internals().setRotationCache === 'function') {
      internals().setRotationCache('key-overflow', {
        accessToken: 'at-overflow',
        rawRefreshToken: 'rt-overflow',
        expiresAt: now + 30_000,
      });

      assert.equal(internalCache.size, maxEntries);
      assert.equal(internalCache.has('key-0'), false); // oldest key evicted
      assert.equal(internalCache.has('key-overflow'), true); // new key present
    } else {
      assert.fail('setRotationCache method not yet implemented on AuthService');
    }
  });
});

describe('A2: Trust Proxy & IP Strategy', () => {
  it('extracts real client IP from trusted reverse proxy and partitions rate limiting', async () => {
    const internalAttempts = internals().loginAttempts;
    const email = 'trust-proxy-user@test.local';

    // Client 1 behind proxy: X-Forwarded-For: 203.0.113.10
    // Client 2 behind proxy: X-Forwarded-For: 198.51.100.20
    await req(
      'POST',
      '/auth/login',
      { email, password: 'BadPassword!' },
      { 'x-forwarded-for': '203.0.113.10' },
    );

    await req(
      'POST',
      '/auth/login',
      { email, password: 'BadPassword!' },
      { 'x-forwarded-for': '198.51.100.20' },
    );

    // There should be two separate entries for the two IPs
    assert.equal(internalAttempts.has(`203.0.113.10:${email}`), true);
    assert.equal(internalAttempts.has(`198.51.100.20:${email}`), true);
    assert.equal(internalAttempts.get(`203.0.113.10:${email}`)!.attempts, 1);
    assert.equal(internalAttempts.get(`198.51.100.20:${email}`)!.attempts, 1);
  });

  it('unpacks multi-hop X-Forwarded-For correctly trusting the immediate proxy hop', async () => {
    const internalAttempts = internals().loginAttempts;
    const email = 'multi-hop-user@test.local';

    // Client sends spoofed client hop: "spoofed.client.ip, real.client.ip"
    // With trust proxy: 1, Express treats 'real.client.ip' (1 hop before the proxy) as req.ip
    await req(
      'POST',
      '/auth/login',
      { email, password: 'BadPassword!' },
      { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    );

    assert.equal(internalAttempts.has(`5.6.7.8:${email}`), true);
    assert.equal(internalAttempts.has(`1.2.3.4:${email}`), false);
  });
});

describe('A2: explicit deployment trust configuration', () => {
  it('keeps trust off unless configured and rejects unrestricted trust', () => {
    for (const value of [undefined, '', 'false', '0']) assert.equal(parseTrustProxy(value), false);
    assert.equal(parseTrustProxy('1'), 1);
    assert.deepEqual(parseTrustProxy('loopback, 10.0.0.0/8'), ['loopback', '10.0.0.0/8']);
    for (const value of ['true', '-1', '9007199254740992', 'loopback,']) {
      assert.throws(() => parseTrustProxy(value));
    }
  });

  it('ignores forged XFF from a direct peer when trust is not configured', async () => {
    app.set('trust proxy', parseTrustProxy(undefined));
    const email = 'direct-peer@test.local';
    internals().loginAttempts.clear();
    try {
      for (const ip of ['203.0.113.10', '198.51.100.20']) {
        const response = await req('POST', '/auth/login', { email, password: 'WrongPassword!' }, { 'x-forwarded-for': ip });
        assert.equal(response.status, 401);
      }
      const attempts = internals().loginAttempts;
      assert.equal(attempts.size, 1);
      assert.equal([...attempts.values()][0].attempts, 2);
      assert.equal(attempts.has(`203.0.113.10:${email}`), false);
      assert.equal(attempts.has(`198.51.100.20:${email}`), false);
    } finally { app.set('trust proxy', parseTrustProxy('1')); }
  });
});

describe('A1: write sweep coverage', () => {
  it('sweeps expired unrelated entries on write, preserving live attempts', () => {
    const attempts = internals().loginAttempts;
    attempts.clear();
    for (let i = 0; i < 6; i++) attempts.set(`old-${i}`, { attempts: 5, firstAttemptAt: Date.now() - 16 * 60_000 });
    attempts.set('still-live', { attempts: 4, firstAttemptAt: Date.now() });
    internals().recordFailedLogin('192.0.2.1', 'new@test.local');
    assert.equal(attempts.size, 2);
    assert.equal(attempts.get('still-live')?.attempts, 4);
    assert.equal(attempts.get('192.0.2.1:new@test.local')?.attempts, 1);
  });
});
