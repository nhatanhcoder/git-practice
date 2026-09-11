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
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

/**
 * Assignments module — docs/api/modules/teacher/03-assignments.md.
 *
 * Covers the invariants `@Roles('teacher')` cannot enforce on its own:
 * ownership (INV-TASG-01), the mock_test time-limit cross-field rule
 * (INV-TASG-02), the Mongo existence check before the Postgres write
 * (INV-TASG-03), the attempt freeze (INV-TASG-04), publish-only-once
 * (INV-TASG-05), the notification fan-out (INV-TASG-06), read-time stats
 * (INV-TASG-07) and questionIds order preservation (INV-TASG-08), plus
 * S-ASGN-1: students see published assignments of active classes only.
 *
 * Suites share one database (--test-concurrency=1, DEBT-004) and clean up
 * every fixture they create — both stores: DEBT-001 means no cross-DB
 * transaction, so Postgres rows and Mongo questions are removed explicitly.
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

type Res = { status: number; body: any };

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: any,
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

let adminToken: string;
let teacherToken: string;
let otherTeacherToken: string;
let studentToken: string;
let outsiderToken: string;

const T1 = 'asgn.teacher1@hsk.local';
const T2 = 'asgn.teacher2@hsk.local';
const S1 = 'asgn.student1@hsk.local';
const S2 = 'asgn.student2@hsk.local';

let teacherId: string;
let classId: string;
let questionIds: string[] = [];

const validAssignment = (extra: Record<string, unknown> = {}) => ({
  classId,
  title: 'Bài tập thử nghiệm',
  type: 'homework',
  dueDate: '2026-12-31T17:00:00Z',
  questionIds,
  ...extra,
});

async function createClassFor(token: string, name: string): Promise<string> {
  const res = await req('POST', '/teacher/classes', { name, hskLevel: 3 }, token);
  return res.body.data.id as string;
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

  adminToken = (await req('POST', '/auth/login', { email: 'admin@hsk.local', password: 'Password123!' }))
    .body.data.accessToken;

  const accounts: Array<[string, 'teacher' | 'student', string]> = [
    [T1, 'teacher', 'GV Bài Tập 1'],
    [T2, 'teacher', 'GV Bài Tập 2'],
    [S1, 'student', 'HS Bài Tập 1'],
    [S2, 'student', 'HS Bài Tập 2'],
  ];
  for (const [email, role, fullName] of accounts) {
    const reg = await req('POST', '/auth/register', {
      email,
      password: 'Password123!',
      fullName,
      role,
    });
    await req('PATCH', `/admin/users/${reg.body.data.id}/approve`, undefined, adminToken);
  }

  const login = (email: string) =>
    req('POST', '/auth/login', { email, password: 'Password123!' });
  teacherToken = (await login(T1)).body.data.accessToken;
  otherTeacherToken = (await login(T2)).body.data.accessToken;
  studentToken = (await login(S1)).body.data.accessToken;
  outsiderToken = (await login(S2)).body.data.accessToken;

  const me = await req('GET', '/auth/me', undefined, teacherToken);
  teacherId = me.body.data.id;

  classId = await createClassFor(teacherToken, 'Lớp bài tập thử');

  // Two Mongo questions owned by T1 — INV-TASG-03 checks these at write time.
  // Both use reading sub-types (SUB_TYPES_BY_SKILL): multiple_choice_single is a
  // LISTENING sub-type, and listening needs audioUrl (API-011), so the pair here is
  // multiple_choice_multi + sentence_ordering — both legal without audio.
  const q1 = await req(
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
  const q2 = await req(
    'POST',
    '/teacher/questions',
    {
      // reading/sentence_ordering — one of the nine real sub-types
      // (SUB_TYPES_BY_SKILL, ENTITY_QUESTION.md), multi-answer by the same rule.
      skill: 'reading',
      subType: 'sentence_ordering',
      hskLevel: 3,
      difficulty: 'easy',
      content: { prompt: 'Sắp xếp: 我 去 学校' },
      options: [
        { id: 'w1', text: '我' },
        { id: 'w2', text: '去' },
        { id: 'w3', text: '学校' },
      ],
      correctAnswer: ['w1', 'w2', 'w3'],
    },
    teacherToken,
  );
  questionIds = [q1.body.data.id, q2.body.data.id];
});

after(async () => {
  const users = await prisma.user.findMany({
    where: { email: { in: [T1, T2, S1, S2] } },
    select: { id: true },
  });
  await mongo.collection('questions').deleteMany({ createdBy: { $in: users.map((u) => u.id) } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { email: { in: [T1, T2, S1, S2] } } });
  await app.close();
});

describe('A · create — INV-TASG-01/02/03/08', () => {
  it('creates a draft homework assignment (201) and returns it with questionIds in order', async () => {
    const res = await req('POST', '/teacher/assignments', validAssignment(), teacherToken);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'draft');
    assert.equal(res.body.data.teacherId, teacherId);
    // INV-TASG-08: stored and returned exactly as submitted.
    assert.deepEqual(res.body.data.questionIds, questionIds);
  });

  it('rejects a class the teacher does not own with 404 (INV-TASG-01)', async () => {
    const foreign = await createClassFor(otherTeacherToken, 'Lớp của GV khác');
    const res = await req(
      'POST',
      '/teacher/assignments',
      validAssignment({ classId: foreign }),
      teacherToken,
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'CLASS_NOT_FOUND');
  });

  it('rejects a mock_test without timeLimitMinutes (INV-TASG-02)', async () => {
    const res = await req(
      'POST',
      '/teacher/assignments',
      validAssignment({ type: 'mock_test', timeLimitMinutes: null }),
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects homework that carries a time limit (INV-TASG-02)', async () => {
    const res = await req(
      'POST',
      '/teacher/assignments',
      validAssignment({ timeLimitMinutes: 30 }),
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects a questionId that does not exist in Mongo with 404 (INV-TASG-03)', async () => {
    const res = await req(
      'POST',
      '/teacher/assignments',
      validAssignment({ questionIds: [questionIds[0], '507f1f77bcf86cd799439011'] }),
      teacherToken,
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'QUESTION_NOT_FOUND');
  });

  it('rejects duplicate questionIds (INV-TASG-03 non-empty & unique)', async () => {
    const res = await req(
      'POST',
      '/teacher/assignments',
      validAssignment({ questionIds: [questionIds[0], questionIds[0]] }),
      teacherToken,
    );
    assert.equal(res.status, 400);
  });

  it('rejects an empty questionIds list', async () => {
    const res = await req(
      'POST',
      '/teacher/assignments',
      validAssignment({ questionIds: [] }),
      teacherToken,
    );
    assert.equal(res.status, 400);
  });

  it('denies a student calling the teacher surface (403)', async () => {
    const res = await req('POST', '/teacher/assignments', validAssignment(), studentToken);
    assert.equal(res.status, 403);
  });
});

describe('B · list & detail — INV-TASG-01/07/08', () => {
  let draftId: string;

  before(async () => {
    const res = await req('POST', '/teacher/assignments', validAssignment(), teacherToken);
    draftId = res.body.data.id;
  });

  it('lists only the caller\u2019s assignments (INV-TASG-01)', async () => {
    const mine = await req('GET', '/teacher/assignments', undefined, teacherToken);
    const other = await req('GET', '/teacher/assignments', undefined, otherTeacherToken);
    assert.ok(mine.body.data.length >= 1);
    assert.equal(other.body.data.length, 0);
    assert.ok(mine.body.data.every((a: any) => a.classId === classId));
  });

  it('filters by classId and status', async () => {
    const res = await req(
      'GET',
      `/teacher/assignments?classId=${classId}&status=draft`,
      undefined,
      teacherToken,
    );
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data.every((a: any) => a.status === 'draft'));
  });

  it('detail returns stats derived at read time (INV-TASG-07)', async () => {
    const res = await req('GET', `/teacher/assignments/${draftId}`, undefined, teacherToken);
    assert.equal(res.status, 200);
    const stats = res.body.data.stats;
    assert.equal(stats.enrolledActive, 0);
    assert.equal(stats.submittedCount, 0);
    assert.equal(stats.notStartedCount, 0);
    assert.deepEqual(res.body.data.questionIds, questionIds);
  });

  it('another teacher\u2019s detail read is 404, not 403 (INV-TASG-01)', async () => {
    const res = await req(
      'GET',
      `/teacher/assignments/${draftId}`,
      undefined,
      otherTeacherToken,
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ASSIGNMENT_NOT_FOUND');
  });
});

describe('C · update, freeze and delete — INV-TASG-02/04/05', () => {
  let id: string;

  before(async () => {
    const res = await req('POST', '/teacher/assignments', validAssignment(), teacherToken);
    id = res.body.data.id;
  });

  it('updates a draft (title + questionIds), keeping order as submitted', async () => {
    const res = await req(
      'PATCH',
      `/teacher/assignments/${id}`,
      { title: 'Đã sửa', questionIds: [...questionIds].reverse() },
      teacherToken,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, 'Đã sửa');
    assert.deepEqual(res.body.data.questionIds, [...questionIds].reverse());
  });

  it('refuses published → draft (INV-TASG-05)', async () => {
    const pub = await req('PATCH', `/teacher/assignments/${id}`, { status: 'published' }, teacherToken);
    assert.equal(pub.status, 200);
    const res = await req('PATCH', `/teacher/assignments/${id}`, { status: 'draft' }, teacherToken);
    assert.equal(res.status, 400);
  });

  it('freezes edit and delete once an attempt exists (INV-TASG-04)', async () => {
    const student = await prisma.user.findUniqueOrThrow({ where: { email: S1 } });
    await prisma.attempt.create({
      data: {
        assignmentId: id,
        studentId: student.id,
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    const edit = await req('PATCH', `/teacher/assignments/${id}`, { title: 'X' }, teacherToken);
    assert.equal(edit.status, 409);
    assert.equal(edit.body.code, 'ASSIGNMENT_ALREADY_SUBMITTED');

    const del = await req('DELETE', `/teacher/assignments/${id}`, undefined, teacherToken);
    assert.equal(del.status, 409);
    assert.equal(del.body.code, 'ASSIGNMENT_ALREADY_SUBMITTED');
  });

  it('deletes an attempt-free draft with 204', async () => {
    const fresh = await req('POST', '/teacher/assignments', validAssignment(), teacherToken);
    const res = await req('DELETE', `/teacher/assignments/${fresh.body.data.id}`, undefined, teacherToken);
    assert.equal(res.status, 204);
    const gone = await req('GET', `/teacher/assignments/${fresh.body.data.id}`, undefined, teacherToken);
    assert.equal(gone.status, 404);
  });

  it('another teacher cannot delete (404, INV-TASG-01)', async () => {
    const fresh = await req('POST', '/teacher/assignments', validAssignment(), teacherToken);
    const res = await req(
      'DELETE',
      `/teacher/assignments/${fresh.body.data.id}`,
      undefined,
      otherTeacherToken,
    );
    assert.equal(res.status, 404);
  });
});

describe('D · publish fan-out & student visibility — INV-TASG-05/06, S-ASGN-1', () => {
  let publishedId: string;
  let draftId: string;
  let enrolledStudentId: string;
  let droppedStudentId: string;

  before(async () => {
    enrolledStudentId = (await prisma.user.findUniqueOrThrow({ where: { email: S1 } })).id;
    droppedStudentId = (await prisma.user.findUniqueOrThrow({ where: { email: S2 } })).id;

    // S1 active, S2 dropped — INV-TASG-06 notifies actives only.
    await prisma.classEnrollment.create({
      data: { classId, studentId: enrolledStudentId, status: 'active' },
    });
    await prisma.classEnrollment.create({
      data: { classId, studentId: droppedStudentId, status: 'dropped' },
    });

    const draft = await req('POST', '/teacher/assignments', validAssignment(), teacherToken);
    draftId = draft.body.data.id;
    const pub = await req(
      'POST',
      '/teacher/assignments',
      validAssignment({ title: 'Đã phát hành', status: 'published' }),
      teacherToken,
    );
    publishedId = pub.body.data.id;
  });

  it('publishing notifies exactly the active-enrolled students, once each (INV-TASG-06)', async () => {
    const rows = await prisma.notification.findMany({
      where: { referenceId: publishedId, type: 'new_assignment' },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.userId, enrolledStudentId);
  });

  it('drafts never notify', async () => {
    const rows = await prisma.notification.findMany({
      where: { referenceId: draftId, type: 'new_assignment' },
    });
    assert.equal(rows.length, 0);
  });

  it('S-ASGN-1: an active student sees published assignments of their classes', async () => {
    const res = await req('GET', '/student/assignments', undefined, studentToken);
    assert.equal(res.status, 200);
    const titles = res.body.data.map((a: any) => a.id);
    assert.ok(titles.includes(publishedId));
    assert.ok(!titles.includes(draftId));
    const row = res.body.data.find((a: any) => a.id === publishedId);
    assert.equal(row.className, 'Lớp bài tập thử');
  });

  it('S-ASGN-1: a dropped student sees nothing', async () => {
    const res = await req('GET', '/student/assignments', undefined, outsiderToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 0);
  });

  it('teachers cannot read the student surface (403)', async () => {
    const res = await req('GET', '/student/assignments', undefined, teacherToken);
    assert.equal(res.status, 403);
  });
});
