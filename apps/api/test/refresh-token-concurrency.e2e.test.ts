import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../dist/src/app.module';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor';
import { AppException } from '../dist/src/common/errors/app.exception';
import { ErrorCode } from '../dist/src/common/errors/error-codes';
import { PrismaService } from '../dist/src/prisma/prisma.service';

const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
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
  cookieHeader: string | null;
  body: any;
};

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: any,
  options?: { token?: string; cookie?: string },
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (body) headers['content-type'] = 'application/json';
  if (options?.token) headers['authorization'] = `Bearer ${options.token}`;
  if (options?.cookie) headers['cookie'] = options.cookie;

  const res = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: res.status,
    headers: res.headers,
    cookieHeader: res.headers.get('set-cookie'),
    body: await res.json().catch(() => null),
  };
}

function extractCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/refresh_token=([^;]+)/);
  return match ? match[1] : null;
}

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(PREFIX);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new AppException(ErrorCode.VALIDATION_ERROR, 'Dữ liệu không hợp lệ', toDetails(errors)),
    }),
  );
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(0);
  base = (await app.getUrl()).replace('[::1]', 'localhost');
  prisma = app.get(PrismaService);
});

after(async () => {
  await app?.close();
});

describe('Refresh Token Atomic Rotation & Grace Window Concurrency', () => {
  it('handles concurrent refresh requests safely, yields exactly 1 active child, and returns a usable cookie', async () => {
    // Login active user to obtain a fresh refresh token
    const loginRes = await req('POST', '/auth/login', {
      email: 'student@hsk.local',
      password: 'Password123!',
    });
    const initialRefreshToken = extractCookie(loginRes.cookieHeader)!;
    assert.ok(initialRefreshToken);

    const initialHash = createHash('sha256').update(initialRefreshToken).digest('hex');
    const parentToken = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash: initialHash } });

    // Fire 2 concurrent refresh requests using the identical initial refresh token
    const [res1, res2] = await Promise.all([
      req('POST', '/auth/refresh', undefined, { cookie: `refresh_token=${initialRefreshToken}` }),
      req('POST', '/auth/refresh', undefined, { cookie: `refresh_token=${initialRefreshToken}` }),
    ]);

    // Both requests must succeed (one via atomic rotation, one via grace window)
    assert.equal(res1.status, 200, 'Request 1 succeeds');
    assert.equal(res2.status, 200, 'Request 2 succeeds within grace window');
    assert.ok(typeof res1.body.data.accessToken === 'string');
    assert.ok(typeof res2.body.data.accessToken === 'string');

    // Exactly one active child token exists in the DB for that family (INV-AUTH-10)
    const activeTokens = await prisma.refreshToken.findMany({
      where: { familyId: parentToken.familyId, revokedAt: null },
    });
    assert.equal(activeTokens.length, 1, 'Only one active child token exists in the family');

    // Both requests return the valid child cookie (satisfying lost response recovery)
    const cookie1 = extractCookie(res1.cookieHeader);
    const cookie2 = extractCookie(res2.cookieHeader);
    assert.ok(cookie1 || cookie2, 'At least one response set a cookie');
    const childCookie = cookie1 || cookie2;

    // Verify the resulting child cookie can be used for a subsequent refresh
    const nextRefresh = await req('POST', '/auth/refresh', undefined, {
      cookie: `refresh_token=${childCookie}`,
    });
    assert.equal(nextRefresh.status, 200, 'Child token rotates successfully to next token');
    assert.ok(nextRefresh.body.data.accessToken);
  });

  it('rejects refresh inside grace window if parent token has expired', async () => {
    const loginRes = await req('POST', '/auth/login', {
      email: 'student@hsk.local',
      password: 'Password123!',
    });
    const refreshToken = extractCookie(loginRes.cookieHeader)!;
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    // Normal rotation
    const rotateRes = await req('POST', '/auth/refresh', undefined, {
      cookie: `refresh_token=${refreshToken}`,
    });
    assert.equal(rotateRes.status, 200);

    // Simulate parent token having expired
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 5000) },
    });

    // Re-presenting token must be rejected with 401 AUTH_TOKEN_EXPIRED (expiry cannot be undone in grace)
    const expiredRes = await req('POST', '/auth/refresh', undefined, {
      cookie: `refresh_token=${refreshToken}`,
    });
    assert.equal(expiredRes.status, 401);
    assert.equal(expiredRes.body.code, 'AUTH_TOKEN_EXPIRED');
  });

  it('rejects refresh inside grace window if user account has been suspended', async () => {
    // Register & approve a dedicated user for suspension check
    const email = `grace.suspend.${Date.now()}@hsk.local`;
    const regRes = await req('POST', '/auth/register', {
      email,
      password: 'Password123!',
      fullName: 'Grace Suspend User',
      role: 'student',
    });
    const userId = regRes.body.data.id;

    // Approve
    const adminLogin = await req('POST', '/auth/login', {
      email: 'admin@hsk.local',
      password: 'Password123!',
    });
    await req('PATCH', `/admin/users/${userId}/approve`, undefined, {
      token: adminLogin.body.data.accessToken,
    });

    // Login user
    const loginRes = await req('POST', '/auth/login', {
      email,
      password: 'Password123!',
    });
    const refreshToken = extractCookie(loginRes.cookieHeader)!;

    // Rotate once
    await req('POST', '/auth/refresh', undefined, {
      cookie: `refresh_token=${refreshToken}`,
    });

    // Suspend user
    await req('PATCH', `/admin/users/${userId}/suspend`, undefined, {
      token: adminLogin.body.data.accessToken,
    });

    // Re-presenting within grace window MUST reject suspended user with 403
    const res = await req('POST', '/auth/refresh', undefined, {
      cookie: `refresh_token=${refreshToken}`,
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'AUTH_ACCOUNT_SUSPENDED');

    // Cleanup
    await prisma.user.delete({ where: { id: userId } });
  });

  it('triggers replay attack when rotated token is reused outside grace window', async () => {
    // Login to get a token
    const loginRes = await req('POST', '/auth/login', {
      email: 'student@hsk.local',
      password: 'Password123!',
    });
    const initialRefreshToken = extractCookie(loginRes.cookieHeader)!;
    const initialTokenHash = createHash('sha256').update(initialRefreshToken).digest('hex');

    // Normal rotation
    const rotateRes = await req('POST', '/auth/refresh', undefined, {
      cookie: `refresh_token=${initialRefreshToken}`,
    });
    assert.equal(rotateRes.status, 200);

    // Simulate time elapsed past grace window (> 15s) in DB ONLY for this specific token
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: initialTokenHash,
        revokedReason: 'rotated',
      },
      data: {
        revokedAt: new Date(Date.now() - 30_000), // 30 seconds ago
      },
    });

    // Attempting to reuse the expired rotated token triggers REPLAY ATTACK
    const replayRes = await req('POST', '/auth/refresh', undefined, {
      cookie: `refresh_token=${initialRefreshToken}`,
    });
    assert.equal(replayRes.status, 401);
    assert.equal(replayRes.body.code, 'AUTH_REFRESH_INVALID');
  });
});
