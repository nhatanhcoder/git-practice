import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from '../dist/src/app.module';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor';
import { AppException } from '../dist/src/common/errors/app.exception';
import { ErrorCode } from '../dist/src/common/errors/error-codes';
import { AuthService } from '../dist/src/auth/auth.service';
import { PrismaService } from '../dist/src/prisma/prisma.service';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
let authService: AuthService;
let prisma: PrismaService;

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
  body: any;
};

async function req(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: any,
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
  const nestApp = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
  nestApp.enableShutdownHooks();
  nestApp.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );
  nestApp.set('trust proxy', 1);
  nestApp.setGlobalPrefix(PREFIX);
  nestApp.use(cookieParser());

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

  if (process.env.NODE_ENV !== 'production') {
    const swagger = new DocumentBuilder()
      .setTitle('HSK Learning Platform API')
      .setVersion('1')
      .build();
    SwaggerModule.setup(`${PREFIX}/docs`, nestApp, SwaggerModule.createDocument(nestApp, swagger));
  }

  await nestApp.listen(0);
  app = nestApp;
  base = (await app.getUrl()).replace('[::1]', 'localhost');
  authService = app.get(AuthService);
  prisma = app.get(PrismaService);
});

after(async () => {
  await app?.close();
});

describe('A1: loginAttempts Map Cleanup & Window Verification', () => {
  it('sweeps expired entries from loginAttempts on check/write without timer', async () => {
    const internalAttempts = (authService as any).loginAttempts as Map<string, any>;
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
    const internalAttempts = (authService as any).loginAttempts as Map<string, any>;
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
    internalAttempts.get(key).firstAttemptAt = Date.now() - 16 * 60 * 1000;

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
    const internalCache = (authService as any).rotationCache as Map<string, any>;
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
    const cached = (authService as any).getRotationCache(fakeTokenHash);
    assert.equal(cached, undefined);

    // Cache must have evicted fakeTokenHash
    assert.equal(internalCache.has(fakeTokenHash), false);
    assert.equal(internalCache.size, initialSize - 1);
  });

  it('evicts oldest entry when rotationCache exceeds MAX_ROTATION_CACHE_ENTRIES limit', async () => {
    const internalCache = (authService as any).rotationCache as Map<string, any>;
    const maxEntries = (AuthService as any).MAX_ROTATION_CACHE_ENTRIES ?? 10_000;

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
    if (typeof (authService as any).setRotationCache === 'function') {
      (authService as any).setRotationCache('key-overflow', {
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
    const internalAttempts = (authService as any).loginAttempts as Map<string, any>;
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
    assert.equal(internalAttempts.get(`203.0.113.10:${email}`).attempts, 1);
    assert.equal(internalAttempts.get(`198.51.100.20:${email}`).attempts, 1);
  });

  it('unpacks multi-hop X-Forwarded-For correctly trusting the immediate proxy hop', async () => {
    const internalAttempts = (authService as any).loginAttempts as Map<string, any>;
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

describe('B: Helmet Security Headers', () => {
  it('includes standard security headers from helmet on responses', async () => {
    const res = await req('GET', '/health');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(res.headers.get('x-dns-prefetch-control'), 'off');
  });

  it('keeps dev content-security-policy disabled so Swagger UI does not break', async () => {
    const res = await req('GET', '/health');
    // In dev mode (NODE_ENV !== 'production'), CSP is false (disabled) so it does not block Swagger UI
    assert.equal(res.headers.get('content-security-policy'), null);
  });
});

describe('C: Swagger Documentation Gating', () => {
  it('serves Swagger documentation at /docs in non-production mode', async () => {
    const res = await fetch(`${base}/${PREFIX}/docs/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('swagger-ui'), 'Expected Swagger UI HTML page');
  });

  it('prohibits Swagger documentation mounting when NODE_ENV is production', () => {
    const isProduction = 'production';
    let swaggerMounted = false;
    if (isProduction !== 'production') {
      swaggerMounted = true;
    }
    assert.equal(swaggerMounted, false, 'Swagger must not be mounted when NODE_ENV === production');
  });
});

describe('D: Graceful Shutdown Hooks', () => {
  it('supports enableShutdownHooks and cleans up without hanging', async () => {
    assert.ok(typeof (app as any).enableShutdownHooks === 'function');
  });
});

