import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
  it('handles concurrent refresh requests safely without replay lockout — grace window', async () => {
    // Login active user to obtain a fresh refresh token
    const loginRes = await req('POST', '/auth/login', {
      email: 'student@hsk.local',
      password: 'Password123!',
    });
    const initialRefreshToken = extractCookie(loginRes.cookieHeader)!;
    assert.ok(initialRefreshToken);

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
  });

  it('triggers replay attack when rotated token is reused outside grace window', async () => {
    // Login to get a token
    const loginRes = await req('POST', '/auth/login', {
      email: 'student@hsk.local',
      password: 'Password123!',
    });
    const initialRefreshToken = extractCookie(loginRes.cookieHeader)!;

    // Normal rotation
    const rotateRes = await req('POST', '/auth/refresh', undefined, {
      cookie: `refresh_token=${initialRefreshToken}`,
    });
    assert.equal(rotateRes.status, 200);

    // Simulate time elapsed past grace window (> 15s) in DB for the rotated token
    await prisma.refreshToken.updateMany({
      where: {
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
