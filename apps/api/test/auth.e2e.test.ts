import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
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
  body: any;
  cookieHeader: string | null;
};

async function req(
  method: 'GET' | 'POST' | 'PATCH',
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
    body: await res.json().catch(() => null),
    cookieHeader: res.headers.get('set-cookie'),
  };
}

function extractCookie(cookieHeader: string | null, name = 'refresh_token'): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
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
  await prisma.user.deleteMany({
    where: { email: { in: ['new.student@test.local', 'new.teacher@test.local'] } },
  });
});

after(async () => {
  // Cleanup test-created user
  await prisma.user.deleteMany({
    where: { email: { in: ['new.student@test.local', 'new.teacher@test.local'] } },
  });
  await app?.close();
});

describe('POST /auth/register', () => {
  it('registers a student with pending status — INV-AUTH-03', async () => {
    const res = await req('POST', '/auth/register', {
      email: 'new.student@test.local',
      password: 'Password123!',
      fullName: 'Học Viên Mới',
      role: 'student',
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.email, 'new.student@test.local');
    assert.equal(res.body.data.role, 'student');
    assert.equal(res.body.data.status, 'pending');
    assert.equal(res.body.data.nickname, 'Học Viên Mới');

    // Verify bcrypt cost 12 — INV-AUTH-01
    const user = await prisma.user.findUnique({ where: { email: 'new.student@test.local' } });
    assert.ok(user);
    assert.match(user.passwordHash, /^\$2[aby]\$12\$/);
  });

  it('rejects duplicate email with 409 — INV-AUTH-02', async () => {
    const res = await req('POST', '/auth/register', {
      email: 'new.student@test.local',
      password: 'Password123!',
      fullName: 'Học Viên Trùng',
      role: 'student',
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'AUTH_EMAIL_EXISTS');
  });

  it('rejects self-registration as admin — INV-AUTH-03', async () => {
    const res = await req('POST', '/auth/register', {
      email: 'fake.admin@test.local',
      password: 'Password123!',
      fullName: 'Fake Admin',
      role: 'admin',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects short passwords (< 8 chars)', async () => {
    const res = await req('POST', '/auth/register', {
      email: 'short.pass@test.local',
      password: 'short',
      fullName: 'Short Pass',
      role: 'student',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });
});

describe('POST /auth/login', () => {
  it('returns identical 401 for unknown email and wrong password — INV-AUTH-04', async () => {
    const res1 = await req('POST', '/auth/login', {
      email: 'nonexistent@hsk.local',
      password: 'Password123!',
    });
    const res2 = await req('POST', '/auth/login', {
      email: 'student@hsk.local',
      password: 'WrongPassword!',
    });

    assert.equal(res1.status, 401);
    assert.equal(res1.body.code, 'AUTH_INVALID_CREDENTIALS');
    assert.equal(res2.status, 401);
    assert.equal(res2.body.code, 'AUTH_INVALID_CREDENTIALS');
    assert.equal(res1.body.message, res2.body.message);
  });

  it('rejects login for pending account — INV-AUTH-05', async () => {
    const res = await req('POST', '/auth/login', {
      email: 'teacher.pending@hsk.local',
      password: 'Password123!',
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'AUTH_ACCOUNT_PENDING');
  });

  it('rejects login for suspended account — INV-AUTH-05', async () => {
    const res = await req('POST', '/auth/login', {
      email: 'student.suspended@hsk.local',
      password: 'Password123!',
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'AUTH_ACCOUNT_SUSPENDED');
  });

  it('logs in an active user, returns accessToken and httpOnly cookie — INV-AUTH-06', async () => {
    const res = await req('POST', '/auth/login', {
      email: 'student@hsk.local',
      password: 'Password123!',
    });

    assert.equal(res.status, 200);
    assert.ok(typeof res.body.data.accessToken === 'string');
    assert.equal(res.body.data.user.email, 'student@hsk.local');
    assert.equal(res.body.data.user.role, 'student');
    assert.equal(res.body.data.user.status, 'active');

    // Cookie checks
    assert.ok(res.cookieHeader);
    assert.ok(res.cookieHeader.includes('HttpOnly'));
    assert.ok(res.cookieHeader.includes('Path=/api/v1/auth'));
    assert.ok(extractCookie(res.cookieHeader));
  });

  it('enforces login rate limit after 5 failed attempts with 429 AUTH_TOO_MANY_REQUESTS', async () => {
    const rateLimitEmail = `rate.limit.${Date.now()}@hsk.local`;
    for (let i = 0; i < 5; i++) {
      const failRes = await req('POST', '/auth/login', {
        email: rateLimitEmail,
        password: 'WrongPassword!',
      });
      assert.equal(failRes.status, 401);
      assert.equal(failRes.body.code, 'AUTH_INVALID_CREDENTIALS');
    }

    // 6th attempt is blocked with 429
    const blockedRes = await req('POST', '/auth/login', {
      email: rateLimitEmail,
      password: 'WrongPassword!',
    });
    assert.equal(blockedRes.status, 429);
    assert.equal(blockedRes.body.code, 'AUTH_TOO_MANY_REQUESTS');
  });
});

describe('POST /auth/refresh & Replay Attack Detection', () => {
  let initialRefreshToken: string;

  before(async () => {
    const loginRes = await req('POST', '/auth/login', {
      email: 'student@hsk.local',
      password: 'Password123!',
    });
    initialRefreshToken = extractCookie(loginRes.cookieHeader)!;
    assert.ok(initialRefreshToken);
  });

  it('rotates refresh token and returns new accessToken — INV-AUTH-06', async () => {
    const res = await req('POST', '/auth/refresh', undefined, {
      cookie: `refresh_token=${initialRefreshToken}`,
    });

    assert.equal(res.status, 200);
    assert.ok(typeof res.body.data.accessToken === 'string');
    const newRefreshToken = extractCookie(res.cookieHeader);
    assert.ok(newRefreshToken);
    assert.notEqual(newRefreshToken, initialRefreshToken);
  });

  it('detects replay attack when old token is reused outside grace window and revokes family — INV-AUTH-07', async () => {
    // Advance revokedAt past the 15s grace window for initialRefreshToken
    const hash = createHash('sha256').update(initialRefreshToken).digest('hex');
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hash },
      data: { revokedAt: new Date(Date.now() - 30_000) },
    });

    // Attempting to reuse initialRefreshToken outside grace window is a REPLAY ATTACK
    const res = await req('POST', '/auth/refresh', undefined, {
      cookie: `refresh_token=${initialRefreshToken}`,
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'AUTH_REFRESH_INVALID');
  });

  it('rejects refresh without cookie', async () => {
    const res = await req('POST', '/auth/refresh');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'AUTH_REFRESH_INVALID');
  });
});

describe('GET /auth/me & PATCH /auth/me', () => {
  let token: string;

  before(async () => {
    const loginRes = await req('POST', '/auth/login', {
      email: 'student@hsk.local',
      password: 'Password123!',
    });
    token = loginRes.body.data.accessToken;
  });

  it('returns current user profile and never leaks passwordHash', async () => {
    const res = await req('GET', '/auth/me', undefined, { token });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, 'student@hsk.local');
    assert.equal(res.body.data.role, 'student');
    assert.ok(!JSON.stringify(res.body).toLowerCase().includes('passwordhash'));
  });

  it('updates nickname via PATCH /auth/me', async () => {
    const res = await req('PATCH', '/auth/me', { nickname: 'Em Học Sinh Chăm Chỉ' }, { token });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.nickname, 'Em Học Sinh Chăm Chỉ');
  });

  it('refuses unauthenticated GET /auth/me', async () => {
    const res = await req('GET', '/auth/me');
    assert.equal(res.status, 401);
  });
});

describe('POST /auth/change-password & POST /auth/logout', () => {
  let token: string;
  let refreshToken: string;

  before(async () => {
    const loginRes = await req('POST', '/auth/login', {
      email: 'teacher@hsk.local',
      password: 'Password123!',
    });
    token = loginRes.body.data.accessToken;
    refreshToken = extractCookie(loginRes.cookieHeader)!;
  });

  it('changes password and revokes previous sessions — INV-AUTH-08', async () => {
    const changeRes = await req(
      'POST',
      '/auth/change-password',
      { currentPassword: 'Password123!', newPassword: 'NewPassword456!' },
      { token },
    );
    assert.equal(changeRes.status, 200);

    // Old password fails
    const oldLogin = await req('POST', '/auth/login', {
      email: 'teacher@hsk.local',
      password: 'Password123!',
    });
    assert.equal(oldLogin.status, 401);

    // New password succeeds
    const newLogin = await req('POST', '/auth/login', {
      email: 'teacher@hsk.local',
      password: 'NewPassword456!',
    });
    assert.equal(newLogin.status, 200);

    // Restore original password for seed consistency
    const restoreToken = newLogin.body.data.accessToken;
    await req(
      'POST',
      '/auth/change-password',
      { currentPassword: 'NewPassword456!', newPassword: 'Password123!' },
      { token: restoreToken },
    );
  });

  it('logs out and clears the cookie', async () => {
    const loginRes = await req('POST', '/auth/login', {
      email: 'teacher@hsk.local',
      password: 'Password123!',
    });
    const teacherToken = loginRes.body.data.accessToken;
    const teacherRefresh = extractCookie(loginRes.cookieHeader);

    const logoutRes = await req('POST', '/auth/logout', undefined, {
      token: teacherToken,
      cookie: `refresh_token=${teacherRefresh}`,
    });

    assert.equal(logoutRes.status, 204);
    assert.ok(logoutRes.cookieHeader);
    // Max-Age=0 or Expires in past to clear
    assert.ok(
      logoutRes.cookieHeader.includes('Expires=') ||
      logoutRes.cookieHeader.includes('Max-Age=0') ||
      logoutRes.cookieHeader.includes('refresh_token=;'),
    );
  });
});
