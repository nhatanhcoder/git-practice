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
let teacher1Token: string;
let teacher2Token: string;
let studentToken: string;

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

  // Login as seeded admin
  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  adminToken = adminLogin.body.data.accessToken;

  // Register and approve Teacher 1
  const regT1 = await req('POST', '/auth/register', {
    email: 'test.teacher1@hsk.local',
    password: 'Password123!',
    fullName: 'Giáo Viên 1',
    role: 'teacher',
  });
  await req('PATCH', `/admin/users/${regT1.body.data.id}/approve`, undefined, adminToken);

  const t1Login = await req('POST', '/auth/login', {
    email: 'test.teacher1@hsk.local',
    password: 'Password123!',
  });
  teacher1Token = t1Login.body.data.accessToken;

  // Register and approve Teacher 2
  const regT2 = await req('POST', '/auth/register', {
    email: 'test.teacher2@hsk.local',
    password: 'Password123!',
    fullName: 'Giáo Viên 2',
    role: 'teacher',
  });
  await req('PATCH', `/admin/users/${regT2.body.data.id}/approve`, undefined, adminToken);

  const t2Login = await req('POST', '/auth/login', {
    email: 'test.teacher2@hsk.local',
    password: 'Password123!',
  });
  teacher2Token = t2Login.body.data.accessToken;

  // Login seeded active student
  const studentLogin = await req('POST', '/auth/login', {
    email: 'student@hsk.local',
    password: 'Password123!',
  });
  studentToken = studentLogin.body.data.accessToken;
});

after(async () => {
  // Cleanup test users and cascade-delete their classes
  await prisma.user.deleteMany({
    where: { email: { in: ['test.teacher1@hsk.local', 'test.teacher2@hsk.local'] } },
  });
  await app?.close();
});

describe('Teacher Classes API', () => {
  let classId: string;
  let enrollmentCode: string;

  it('allows teacher to create a class with auto-generated 8-char code — F2.1', async () => {
    const res = await req(
      'POST',
      '/teacher/classes',
      { name: 'HSK 3 Khóa Cấp Tốc', hskLevel: 3, description: 'Luyện đề và ngữ pháp' },
      teacher1Token,
    );

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.name, 'HSK 3 Khóa Cấp Tốc');
    assert.equal(res.body.data.hskLevel, 3);
    assert.equal(res.body.data.status, 'active');
    assert.equal(res.body.data.enrollmentCode.length, 8);
    assert.match(res.body.data.enrollmentCode, /^[A-Z0-9]{8}$/);

    classId = res.body.data.id;
    enrollmentCode = res.body.data.enrollmentCode;
  });

  it('forbids students from creating classes', async () => {
    const res = await req(
      'POST',
      '/teacher/classes',
      { name: 'Fake Class', hskLevel: 1 },
      studentToken,
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'AUTH_INSUFFICIENT_ROLE');
  });

  it('lists teacher own classes — F2.1', async () => {
    const res = await req('GET', '/teacher/classes', undefined, teacher1Token);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((c: any) => c.id === classId));
  });

  it('gets class detail with student roster', async () => {
    const res = await req('GET', `/teacher/classes/${classId}`, undefined, teacher1Token);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, classId);
    assert.equal(res.body.data.name, 'HSK 3 Khóa Cấp Tốc');
    assert.ok(Array.isArray(res.body.data.students));
  });

  it('allows owner to update class info — F2.2', async () => {
    const res = await req(
      'PATCH',
      `/teacher/classes/${classId}`,
      { name: 'HSK 3 Khóa Cấp Tốc (Đã Đổi Tên)' },
      teacher1Token,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'HSK 3 Khóa Cấp Tốc (Đã Đổi Tên)');
  });

  it('regenerates 8-character enrollment code', async () => {
    const res = await req(
      'POST',
      `/teacher/classes/${classId}/enrollment-code/regenerate`,
      undefined,
      teacher1Token,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.enrollmentCode.length, 8);
    assert.notEqual(res.body.data.enrollmentCode, enrollmentCode);
    enrollmentCode = res.body.data.enrollmentCode;
  });

  it('forbids another teacher from editing or regenerating code — INV-CLASS-03', async () => {
    const updateRes = await req(
      'PATCH',
      `/teacher/classes/${classId}`,
      { name: 'Hacked Class' },
      teacher2Token,
    );
    assert.equal(updateRes.status, 403);
    assert.equal(updateRes.body.code, 'CLASS_ACCESS_DENIED');

    const regenRes = await req(
      'POST',
      `/teacher/classes/${classId}/enrollment-code/regenerate`,
      undefined,
      teacher2Token,
    );
    assert.equal(regenRes.status, 403);
    assert.equal(regenRes.body.code, 'CLASS_ACCESS_DENIED');
  });

  it('archives class and prevents further modifications — INV-CLASS-04', async () => {
    const archiveRes = await req('PATCH', `/teacher/classes/${classId}/archive`, undefined, teacher1Token);
    assert.equal(archiveRes.status, 200);
    assert.equal(archiveRes.body.data.status, 'archived');

    // Editing archived class returns 400
    const editRes = await req(
      'PATCH',
      `/teacher/classes/${classId}`,
      { name: 'Cannot Edit' },
      teacher1Token,
    );
    assert.equal(editRes.status, 400);
    assert.equal(editRes.body.code, 'CLASS_ALREADY_ARCHIVED');
  });

  it('allows Admin to list all classes', async () => {
    const res = await req('GET', '/admin/classes', undefined, adminToken);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((c: any) => c.id === classId));
  });
});
