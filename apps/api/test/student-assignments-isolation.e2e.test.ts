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
 * S-ASGN-1 cross-student isolation — what the S3 D-section does not cover.
 *
 * D proves active-vs-dropped inside ONE class. This suite proves the other axis:
 * two actively-enrolled students in DIFFERENT classes never see each other's
 * published assignments, and a draft in your own class stays invisible to you.
 * The scoping lives in `listForStudent` (published + active-enrollment join) —
 * `@Roles('student')` only proves the caller is *a* student.
 *
 * Suites share one database (--test-concurrency=1, DEBT-004) and clean up every
 * fixture they create in both stores (same discipline as assignments.e2e.test.ts).
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

type Row = {
  id: string;
  classId: string;
  className: string;
  title: string;
  type: string;
  status: string;
  dueDate: string | null;
  timeLimitMinutes: number | null;
  questionCount: number;
};

type Res = { status: number; body: { data: Row[]; code: string } };

async function req(
  method: 'GET' | 'POST',
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
  return { status: res.status, body: (await res.json().catch(() => null)) as Res['body'] };
}

const TEACHER = 'saiso.teacher@hsk.local';
const STUDENT_A = 'saiso.student.a@hsk.local';
const STUDENT_B = 'saiso.student.b@hsk.local';
const OWNED_EMAILS = [TEACHER, STUDENT_A, STUDENT_B];

let teacherToken: string;
let studentAToken: string;
let studentBToken: string;
let classAId: string;
let classBId: string;
let publishedAId: string;
let publishedBId: string;
let draftAId: string;

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
  const approve = await req(
    'PATCH',
    `/admin/users/${(reg.body as unknown as { data: { id: string } }).data.id}/approve`,
    undefined,
    (adminLogin.body as unknown as { data: { accessToken: string } }).data.accessToken,
  );
  assert.equal(approve.status, 200, `approve ${email} failed`);
  const login = await req('POST', '/auth/login', { email, password: 'Password123!' });
  return (login.body as unknown as { data: { accessToken: string } }).data.accessToken;
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

  const studentAId = (
    await prisma.user.findUniqueOrThrow({ where: { email: STUDENT_A }, select: { id: true } })
  ).id;
  const studentBId = (
    await prisma.user.findUniqueOrThrow({ where: { email: STUDENT_B }, select: { id: true } })
  ).id;

  const mkClass = async (name: string) => {
    const res = await req('POST', '/teacher/classes', { name, hskLevel: 3 }, teacherToken);
    assert.equal(res.status, 201, `create class ${name} failed`);
    return (res.body as unknown as { data: { id: string } }).data.id;
  };
  classAId = await mkClass('Lớp cách ly A');
  classBId = await mkClass('Lớp cách ly B');

  await prisma.classEnrollment.createMany({
    data: [
      { classId: classAId, studentId: studentAId, status: 'active' },
      { classId: classBId, studentId: studentBId, status: 'active' },
    ],
  });

  // One teacher-owned Mongo question — INV-TASG-03 checks questionIds at write time.
  const q = await req(
    'POST',
    '/teacher/questions',
    {
      skill: 'reading',
      subType: 'multiple_choice_multi',
      hskLevel: 3,
      difficulty: 'medium',
      content: { prompt: '选择正确的词。' },
      options: [
        { id: 'a', text: '认识' },
        { id: 'b', text: '知道' },
      ],
      correctAnswer: ['a'],
    },
    teacherToken,
  );
  const questionId = (q.body as unknown as { data: { id: string } }).data.id;

  const mkAssignment = async (classId: string, title: string, status: string) => {
    const res = await req(
      'POST',
      '/teacher/assignments',
      {
        classId,
        title,
        type: 'homework',
        dueDate: '2026-12-31T17:00:00Z',
        questionIds: [questionId],
        status,
      },
      teacherToken,
    );
    assert.equal(res.status, 201, `create assignment ${title} failed: ${JSON.stringify(res.body)}`);
    return (res.body as unknown as { data: { id: string } }).data.id;
  };
  publishedAId = await mkAssignment(classAId, 'Bài đã phát hành lớp A', 'published');
  draftAId = await mkAssignment(classAId, 'Bài nháp lớp A', 'draft');
  publishedBId = await mkAssignment(classBId, 'Bài đã phát hành lớp B', 'published');

  // The publishes above fanned out new_assignment notifications to A and B;
  // those rows cascade off the users deleted in after().
});

after(async () => {
  const users = await prisma.user.findMany({
    where: { email: { in: OWNED_EMAILS } },
    select: { id: true },
  });
  await mongo.collection('questions').deleteMany({ createdBy: { $in: users.map((u) => u.id) } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app?.close();
});

describe('S-ASGN-1 cross-student isolation — two students, two classes', () => {
  it('student A sees only class A published rows — not the draft, not class B', async () => {
    const res = await req('GET', '/student/assignments', undefined, studentAToken);
    assert.equal(res.status, 200);
    const ids = res.body.data.map((a) => a.id);
    assert.ok(ids.includes(publishedAId), 'own published assignment missing');
    assert.ok(!ids.includes(draftAId), 'own draft leaked to the student');
    assert.ok(!ids.includes(publishedBId), 'other class published assignment leaked');
  });

  it('student B sees only class B published rows — the mirror image', async () => {
    const res = await req('GET', '/student/assignments', undefined, studentBToken);
    assert.equal(res.status, 200);
    const ids = res.body.data.map((a) => a.id);
    assert.ok(ids.includes(publishedBId), 'own published assignment missing');
    assert.ok(!ids.includes(publishedAId), 'other class published assignment leaked');
    assert.ok(!ids.includes(draftAId), 'other class draft leaked');
  });

  it('rows carry the list shape and leak no class credentials', async () => {
    const res = await req('GET', '/student/assignments', undefined, studentAToken);
    assert.equal(res.status, 200);
    const row = res.body.data.find((a) => a.id === publishedAId);
    assert.ok(row);
    assert.equal(row.className, 'Lớp cách ly A');
    assert.equal(row.status, 'published');
    assert.equal(row.questionCount, 1);
    assert.ok(!('enrollmentCode' in row), 'class invite credential must never leak');
  });

  it('anonymous callers are rejected with 401', async () => {
    const res = await req('GET', '/student/assignments');
    assert.equal(res.status, 401);
  });
});
