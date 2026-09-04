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
});

after(async () => {
  await prisma.user.deleteMany({
    where: { email: { contains: 'concurrency.target' } },
  });
  await app?.close();
});

describe('Admin Approval Concurrency & Race Condition Protection', () => {
  it('prevents double-approval on concurrent approve requests', async () => {
    // Register a fresh pending user
    const email = `concurrency.target.${Date.now()}@hsk.local`;
    const reg = await req('POST', '/auth/register', {
      email,
      password: 'Password123!',
      fullName: 'Race Target User',
      role: 'student',
    });
    const targetId = reg.body.data.id;
    assert.ok(targetId);

    // Fire 2 concurrent approval requests simultaneously
    const [res1, res2] = await Promise.all([
      req('PATCH', `/admin/users/${targetId}/approve`, undefined, adminToken),
      req('PATCH', `/admin/users/${targetId}/approve`, undefined, adminToken),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [200, 409], 'Exactly one request succeeds and the other receives 409');

    const winner = res1.status === 200 ? res1 : res2;
    const loser = res1.status === 409 ? res1 : res2;

    assert.equal(winner.body.data.status, 'active');
    assert.equal(loser.body.code, 'USER_ALREADY_APPROVED');

    // DB state is consistently active
    const finalUser = await prisma.user.findUnique({ where: { id: targetId } });
    assert.equal(finalUser?.status, 'active');
  });

  it('prevents double-suspension on concurrent suspend requests', async () => {
    // Register and approve user to active
    const email = `concurrency.target.suspend.${Date.now()}@hsk.local`;
    const reg = await req('POST', '/auth/register', {
      email,
      password: 'Password123!',
      fullName: 'Suspend Race User',
      role: 'teacher',
    });
    const targetId = reg.body.data.id;
    await req('PATCH', `/admin/users/${targetId}/approve`, undefined, adminToken);

    // Fire 2 concurrent suspend requests simultaneously
    const [res1, res2] = await Promise.all([
      req('PATCH', `/admin/users/${targetId}/suspend`, undefined, adminToken),
      req('PATCH', `/admin/users/${targetId}/suspend`, undefined, adminToken),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [200, 409], 'Exactly one request succeeds and the other receives 409');

    const loser = res1.status === 409 ? res1 : res2;
    assert.equal(loser.body.code, 'USER_ALREADY_SUSPENDED');

    const finalUser = await prisma.user.findUnique({ where: { id: targetId } });
    assert.equal(finalUser?.status, 'suspended');
  });
});
