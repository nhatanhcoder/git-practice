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
import bcrypt from 'bcryptjs';

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

let teacherTokenA: string;
let teacherIdA: string;
let teacherTokenB: string;
let teacherIdB: string;
let studentToken: string;
let classAId: string;
let createdSessionId: string;

describe('Teacher Sessions Endpoints (GET /teacher/sessions & Ownership)', () => {
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
          new AppException(
            ErrorCode.VALIDATION_ERROR,
            'Validation failed',
            toDetails(errors),
          ),
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new EnvelopeInterceptor());

    await app.listen(0);
    const addr = app.getHttpServer().address();
    base = typeof addr === 'string' ? addr : `http://localhost:${addr.port}`;
    prisma = app.get(PrismaService);

    // Login Teacher A
    const loginA = await req('POST', '/auth/login', {
      email: 'teacher@hsk.local',
      password: 'Password123!',
    });
    teacherTokenA = loginA.body.data.accessToken;
    teacherIdA = loginA.body.data.user.id;

    // Ensure Teacher B exists & login
    let teacherB = await prisma.user.findUnique({ where: { email: 'teacher_b_sessions@hsk.local' } });
    if (!teacherB) {
      teacherB = await prisma.user.create({
        data: {
          email: 'teacher_b_sessions@hsk.local',
          passwordHash: loginA.body.data.user ? '$2b$12$e8y/oG7xUa3g91lQkP1oGuQpU6yCgC79P9v4x2Y0yH9wW8zZ1.eGm' : '', // dummy or will login via seed
          role: 'teacher',
          status: 'active',
          nickname: 'Teacher B Test',
        },
      });
    }
    // Update password to known password
    const hash = await bcrypt.hash('Password123!', 12);
    await prisma.user.update({
      where: { id: teacherB.id },
      data: { passwordHash: hash, status: 'active' },
    });

    const loginB = await req('POST', '/auth/login', {
      email: 'teacher_b_sessions@hsk.local',
      password: 'Password123!',
    });
    teacherTokenB = loginB.body.data.accessToken;
    teacherIdB = loginB.body.data.user.id;

    // Login Student
    const loginS = await req('POST', '/auth/login', {
      email: 'student@hsk.local',
      password: 'Password123!',
    });
    studentToken = loginS.body.data.accessToken;

    // Ensure Teacher A has a class
    let cls = await prisma.class.findFirst({ where: { teacherId: teacherIdA } });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          teacherId: teacherIdA,
          name: 'Lớp Giáo Viên A',
          hskLevel: 3,
          enrollmentCode: 'TSES' + Math.floor(Math.random() * 9000 + 1000),
          status: 'active',
        },
      });
    }
    classAId = cls.id;
  });

  after(async () => {
    if (app) await app.close();
  });

  it('1. Teacher A creates a session via POST /teacher/sessions', async () => {
    const res = await req(
      'POST',
      '/teacher/sessions',
      {
        classId: classAId,
        scheduledDate: '2026-10-15',
        scheduledStart: '08:00',
        scheduledEnd: '09:30',
        topic: 'Buổi học kiểm tra e2e',
        notes: 'Ghi chú giáo viên A',
      },
      teacherTokenA,
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.data.classId, classAId);
    assert.equal(res.body.data.status, 'scheduled');
    createdSessionId = res.body.data.id;
  });

  it('2. Teacher A lists sessions via GET /teacher/sessions and sees the created session', async () => {
    const res = await req('GET', '/teacher/sessions', undefined, teacherTokenA);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);

    const found = res.body.data.find((s: any) => s.id === createdSessionId);
    assert.ok(found, 'Created session must be returned in teacher A sessions list');
    assert.equal(found.classId, classAId);
    assert.ok(found.className);
    assert.equal(found.scheduledDate, '2026-10-15');
    assert.equal(found.scheduledStart, '08:00');
    assert.equal(found.scheduledEnd, '09:30');
    assert.equal(found.topic, 'Buổi học kiểm tra e2e');
    assert.ok(found.attendanceSummary);
    assert.equal(typeof found.attendanceSummary.total, 'number');
    assert.ok(res.body.meta);
    assert.ok(res.body.meta.total >= 1);
  });

  it('3. Teacher B lists sessions via GET /teacher/sessions and does NOT see Teacher A session (ownership check)', async () => {
    const res = await req('GET', '/teacher/sessions', undefined, teacherTokenB);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));

    const found = res.body.data.find((s: any) => s.id === createdSessionId);
    assert.equal(found, undefined, 'Teacher B must not see Teacher A session');
  });

  it('4. Teacher A filters by classId', async () => {
    const res = await req('GET', `/teacher/sessions?classId=${classAId}`, undefined, teacherTokenA);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((s: any) => s.classId === classAId));
  });

  it('5. Unauthenticated request is rejected with 401', async () => {
    const res = await req('GET', '/teacher/sessions');
    assert.equal(res.status, 401);
  });

  it('6. Student role is rejected with 403', async () => {
    const res = await req('GET', '/teacher/sessions', undefined, studentToken);
    assert.equal(res.status, 403);
  });
});
