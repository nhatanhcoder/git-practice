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
  body: any;
};

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: any,
  token?: string,
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers['authorization'] = `Bearer ${token}`;

  const res = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: res.status,
    headers: res.headers,
    body: await res.json().catch(() => null),
  };
}

let adminToken: string;
let targetUserId: string;
const targetEmail = `lifecycle.target.${Date.now()}@hsk.local`;

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

  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  adminToken = adminLogin.body.data.accessToken;

  // Register a dedicated test user in pending status with isolated email
  const reg = await req('POST', '/auth/register', {
    email: targetEmail,
    password: 'Password123!',
    fullName: 'Lifecycle Target',
    role: 'teacher',
  });
  targetUserId = reg.body.data.id;
  assert.ok(targetUserId, 'Target user registered successfully');
});

after(async () => {
  if (targetUserId) {
    await prisma.user.deleteMany({
      where: { id: targetUserId },
    });
  }
  await app?.close();
});

describe('Admin User Approval Lifecycle (INV-USERS-08, 09, 10) & 9-Transition Matrix', () => {
  // --- 1. Pending Source State Tests ---
  it('cannot login while status is pending — INV-AUTH-05', async () => {
    const loginRes = await req('POST', '/auth/login', {
      email: targetEmail,
      password: 'Password123!',
    });
    assert.equal(loginRes.status, 403);
    assert.equal(loginRes.body.code, 'AUTH_ACCOUNT_PENDING');
  });

  it('rejects suspend on a pending user with 400 and leaves DB unchanged', async () => {
    const res = await req('PATCH', `/admin/users/${targetUserId}/suspend`, undefined, adminToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'USER_INVALID_STATUS_TRANSITION');

    const dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    assert.equal(dbUser?.status, 'pending');
  });

  it('rejects activate on a pending user with 400 and leaves DB unchanged', async () => {
    const res = await req('PATCH', `/admin/users/${targetUserId}/activate`, undefined, adminToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'USER_INVALID_STATUS_TRANSITION');

    const dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    assert.equal(dbUser?.status, 'pending');
  });

  it('rejects non-admin calling approve endpoint — INV-USERS-01', async () => {
    const res = await req('PATCH', `/admin/users/${targetUserId}/approve`, undefined, undefined);
    assert.equal(res.status, 401);
  });

  it('rejects malformed id with 400 VALIDATION_ERROR on approve/suspend/activate — INV-USERS-17', async () => {
    for (const action of ['approve', 'suspend', 'activate']) {
      const res = await req('PATCH', `/admin/users/not-a-uuid/${action}`, undefined, adminToken);
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'VALIDATION_ERROR');
    }
  });

  it('rejects non-existent uuid with 404 USER_NOT_FOUND on approve/suspend/activate — INV-USERS-17', async () => {
    const nonExistent = '00000000-0000-4000-8000-000000000000';
    for (const action of ['approve', 'suspend', 'activate']) {
      const res = await req('PATCH', `/admin/users/${nonExistent}/${action}`, undefined, adminToken);
      assert.equal(res.status, 404);
      assert.equal(res.body.code, 'USER_NOT_FOUND');
    }
  });

  it('approves pending account to active — INV-USERS-08', async () => {
    const res = await req('PATCH', `/admin/users/${targetUserId}/approve`, undefined, adminToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'active');

    // DB verified
    const dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    assert.equal(dbUser?.status, 'active');

    // Verify user can now log in
    const loginRes = await req('POST', '/auth/login', {
      email: targetEmail,
      password: 'Password123!',
    });
    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.data.accessToken);
  });

  // --- 2. Active Source State Tests ---
  it('returns 409 USER_ALREADY_APPROVED when approving an active user — INV-USERS-08', async () => {
    const res = await req('PATCH', `/admin/users/${targetUserId}/approve`, undefined, adminToken);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'USER_ALREADY_APPROVED');

    const dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    assert.equal(dbUser?.status, 'active');
  });

  it('returns 409 USER_ALREADY_ACTIVE when activating an active user', async () => {
    const res = await req('PATCH', `/admin/users/${targetUserId}/activate`, undefined, adminToken);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'USER_ALREADY_ACTIVE');

    const dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    assert.equal(dbUser?.status, 'active');
  });

  it('suspends active account and blocks authentication — INV-USERS-09', async () => {
    const res = await req('PATCH', `/admin/users/${targetUserId}/suspend`, undefined, adminToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'suspended');

    // DB verified
    const dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    assert.equal(dbUser?.status, 'suspended');

    // Login is blocked with 403
    const loginRes = await req('POST', '/auth/login', {
      email: targetEmail,
      password: 'Password123!',
    });
    assert.equal(loginRes.status, 403);
    assert.equal(loginRes.body.code, 'AUTH_ACCOUNT_SUSPENDED');
  });

  // --- 3. Suspended Source State Tests ---
  it('returns 409 USER_ALREADY_SUSPENDED when suspending an already suspended user', async () => {
    const res = await req('PATCH', `/admin/users/${targetUserId}/suspend`, undefined, adminToken);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'USER_ALREADY_SUSPENDED');

    const dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    assert.equal(dbUser?.status, 'suspended');
  });

  it('rejects approve on a suspended user — must use activate instead', async () => {
    const res = await req('PATCH', `/admin/users/${targetUserId}/approve`, undefined, adminToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'USER_INVALID_STATUS_TRANSITION');

    const dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    assert.equal(dbUser?.status, 'suspended');
  });

  it('activates suspended account and restores access — INV-USERS-10', async () => {
    const res = await req('PATCH', `/admin/users/${targetUserId}/activate`, undefined, adminToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'active');

    // DB verified
    const dbUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    assert.equal(dbUser?.status, 'active');

    // Login succeeds again
    const loginRes = await req('POST', '/auth/login', {
      email: targetEmail,
      password: 'Password123!',
    });
    assert.equal(loginRes.status, 200);
  });
});
