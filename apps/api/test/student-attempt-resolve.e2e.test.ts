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
import { ErrorCode } from '../src/common/errors/error-codes';
import { PrismaService } from '../dist/src/prisma/prisma.service';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

/**
 * INV-ATLP-12 — GET /student/assignments/:id/attempt (added 2026-09-13, Task C).
 *
 * The endpoint exists so /student/exams/[examId]/result can deep-link to the one
 * result renderer without guessing attempt ids. These tests pin the two properties
 * that make it safe: it is a pure own-attempt lookup (a foreign assignment id is
 * indistinguishable from one never started — no existence probing), and it returns
 * ids/status only, never content.
 */

const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
let prisma: PrismaService;
let mongo: Connection;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- This test helper accepts heterogeneous endpoint envelopes.
type Res = { status: number; body: any };

async function req(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  token?: string,
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (body) headers['content-type'] = 'application/json; charset=utf-8';
  if (token) headers['authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const TEACHER = 'atlr.teacher@hsk.local';
const STUDENT_A = 'atlr.student.a@hsk.local';
const STUDENT_B = 'atlr.student.b@hsk.local';
const OWNED_EMAILS = [TEACHER, STUDENT_A, STUDENT_B];

let teacherToken: string;
let studentAToken: string;
let studentBToken: string;
let assignmentId: string;
const createdQuestionIds: string[] = [];

async function registerApproveLogin(email: string, role: 'teacher' | 'student'): Promise<string> {
  const reg = await req('POST', '/auth/register', {
    email,
    password: 'Password123!',
    fullName: email,
    role,
  });
  assert.equal(reg.status, 201, `register ${email} failed: ${JSON.stringify(reg.body)}`);
  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  const adminToken = adminLogin.body.data.accessToken;
  const approve = await req(
    'PATCH',
    `/admin/users/${reg.body.data.id}/approve`,
    undefined,
    adminToken,
  );
  assert.equal(approve.status, 200, `approve ${email} failed`);
  const login = await req('POST', '/auth/login', { email, password: 'Password123!' });
  return login.body.data.accessToken;
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
  mongo = app.get<Connection>(getConnectionToken());

  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });

  teacherToken = await registerApproveLogin(TEACHER, 'teacher');
  studentAToken = await registerApproveLogin(STUDENT_A, 'student');
  studentBToken = await registerApproveLogin(STUDENT_B, 'student');

  const cls = await req('POST', '/teacher/classes', { name: 'Lớp resolve', hskLevel: 2 }, teacherToken);
  const classId = cls.body.data.id as string;
  const studentAId = (
    await prisma.user.findUniqueOrThrow({ where: { email: STUDENT_A }, select: { id: true } })
  ).id;
  await prisma.classEnrollment.create({
    data: { classId, studentId: studentAId, status: 'active' },
  });

  const mcq = await req(
    'POST',
    '/teacher/questions',
    {
      skill: 'listening',
      subType: 'multiple_choice_single',
      hskLevel: 2,
      difficulty: 'medium',
      content: { prompt: '选择正确的词。', audioUrl: 'https://cdn.example/atlr.mp3' },
      options: [
        { id: 'a', text: '认识' },
        { id: 'b', text: '知道' },
      ],
      correctAnswer: 'a',
    },
    teacherToken,
  );
  const mcqId = mcq.body.data.id as string;
  createdQuestionIds.push(mcqId);

  const mk = await req(
    'POST',
    '/teacher/assignments',
    {
      classId,
      title: `Resolve mock ${Date.now()}`,
      type: 'mock_test',
      questionIds: [mcqId],
      timeLimitMinutes: 30,
    },
    teacherToken,
  );
  assert.equal(mk.status, 201, `assignment failed: ${JSON.stringify(mk.body)}`);
  const published = await req(
    'PATCH',
    `/teacher/assignments/${mk.body.data.id}`,
    { status: 'published' },
    teacherToken,
  );
  assert.equal(published.status, 200, `publish failed: ${JSON.stringify(published.body)}`);
  assignmentId = mk.body.data.id as string;
});

after(async () => {
  if (createdQuestionIds.length > 0) {
    await mongo.collection('questions').deleteMany({
      _id: { $in: createdQuestionIds },
    });
  }
  // Attempt/assignment/enrollment rows cascade with the users.
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app.close();
});

describe('INV-ATLP-12 — GET /student/assignments/:id/attempt', () => {
  it('resolves to null before any attempt exists (no existence probing)', async () => {
    const res = await req(
      'GET',
      `/student/assignments/${assignmentId}/attempt`,
      undefined,
      studentAToken,
    );
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, { attemptId: null, status: null });

    // A random uuid and a malformed id read the same way — the route cannot be
    // used to learn which assignments exist.
    const random = await req(
      'GET',
      `/student/assignments/00000000-0000-4000-8000-000000000000/attempt`,
      undefined,
      studentAToken,
    );
    assert.equal(random.status, 200);
    assert.deepEqual(random.body.data, { attemptId: null, status: null });
    const malformed = await req('GET', '/student/assignments/not-a-uuid/attempt', undefined, studentAToken);
    assert.equal(malformed.status, 200);
    assert.deepEqual(malformed.body.data, { attemptId: null, status: null });
  });

  it('resolves the caller’s own attempt with id + status, nothing else', async () => {
    const start = await req('POST', `/student/assignments/${assignmentId}/attempts`, undefined, studentAToken);
    assert.equal(start.status, 201, `start failed: ${JSON.stringify(start.body)}`);

    const res = await req(
      'GET',
      `/student/assignments/${assignmentId}/attempt`,
      undefined,
      studentAToken,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.attemptId, start.body.data.attempt.id);
    assert.equal(res.body.data.status, 'in_progress');
    assert.equal('questions' in res.body.data, false, 'ids and status only — never content');
    assert.equal('correctAnswer' in res.body.data, false);

    await req('POST', `/student/attempts/${start.body.data.attempt.id}/submit`, undefined, studentAToken);
    const after = await req(
      'GET',
      `/student/assignments/${assignmentId}/attempt`,
      undefined,
      studentAToken,
    );
    assert.equal(after.body.data.status, 'submitted');
  });

  it('student B resolving A’s assignment sees null, not A’s attempt', async () => {
    const res = await req(
      'GET',
      `/student/assignments/${assignmentId}/attempt`,
      undefined,
      studentBToken,
    );
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, { attemptId: null, status: null });
  });

  it('a teacher token gets 403 (student-lane route)', async () => {
    const res = await req(
      'GET',
      `/student/assignments/${assignmentId}/attempt`,
      undefined,
      teacherToken,
    );
    assert.equal(res.status, 403);
  });
});
