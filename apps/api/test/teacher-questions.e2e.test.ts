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
 * Question bank — the only MongoDB-backed module.
 *
 * These cover the cross-field rules in ENTITY_QUESTION.md that no per-field
 * validator can express, because each depends on `skill` and `subType` together,
 * plus ownership, which `@Roles('teacher')` cannot enforce on its own: that guard
 * proves the caller is *a* teacher, never that they own *this* question.
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
  // charset spelled out: the bank is full of Chinese, and a mis-declared encoding
  // silently stores mojibake that only shows up when a student sits the test.
  if (body) headers['content-type'] = 'application/json; charset=utf-8';
  if (token) headers['authorization'] = `Bearer ${token}`;

  const res = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

let teacherToken: string;
let otherTeacherToken: string;
let adminToken: string;

const T1 = 'questions.teacher1@hsk.local';
const T2 = 'questions.teacher2@hsk.local';

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

  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  adminToken = adminLogin.body.data.accessToken;

  for (const [email, name] of [[T1, 'GV Câu Hỏi 1'], [T2, 'GV Câu Hỏi 2']] as const) {
    const reg = await req('POST', '/auth/register', {
      email,
      password: 'Password123!',
      fullName: name,
      role: 'teacher',
    });
    await req('PATCH', `/admin/users/${reg.body.data.id}/approve`, undefined, adminToken);
  }

  teacherToken = (await req('POST', '/auth/login', { email: T1, password: 'Password123!' })).body
    .data.accessToken;
  otherTeacherToken = (await req('POST', '/auth/login', { email: T2, password: 'Password123!' }))
    .body.data.accessToken;
});

after(async () => {
  // Mongo has no cascade from the Postgres user rows, and DEBT-001 means there is
  // no transaction spanning the two — so both stores are cleaned explicitly.
  const users = await prisma.user.findMany({
    where: { email: { in: [T1, T2] } },
    select: { id: true },
  });
  await mongo.collection('questions').deleteMany({ createdBy: { $in: users.map((u) => u.id) } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { email: { in: [T1, T2] } } });
  await app.close();
});

const LISTENING_MCQ = {
  skill: 'listening',
  subType: 'multiple_choice_single',
  hskLevel: 3,
  content: {
    audioUrl: 'https://example.supabase.co/storage/v1/object/sign/audio/hsk3-01.mp3',
    transcript: '女：你昨天去哪儿了？男：我去图书馆看书了。',
  },
  options: [
    { id: 'A', text: '图书馆' },
    { id: 'B', text: '商店' },
    { id: 'C', text: '医院' },
  ],
  correctAnswer: 'A',
};

describe('Teacher Question Bank (MongoDB)', () => {
  it('creates a listening question and stores Chinese text intact', async () => {
    const res = await req('POST', '/teacher/questions', LISTENING_MCQ, teacherToken);
    assert.equal(res.status, 201);
    // Round-tripping the CJK is the point: a wrong charset stores '?????' and the
    // failure only becomes visible to a student mid-exam.
    assert.equal(res.body.data.content.transcript, LISTENING_MCQ.content.transcript);
    assert.deepEqual(
      res.body.data.options.map((o: any) => o.text),
      ['图书馆', '商店', '医院'],
    );
    assert.match(res.body.data.createdAt, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  it('rejects a sub-type that does not belong to the skill', async () => {
    // Two independent enum checks both pass here — "listening" is a skill and
    // "essay" is a sub-type. Only the pairing is nonsense.
    const res = await req(
      'POST',
      '/teacher/questions',
      { skill: 'listening', subType: 'essay', hskLevel: 2, correctAnswer: 'x' },
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, ErrorCode.VALIDATION_ERROR);
    assert.ok(res.body.details.subType);
  });

  it('refuses a writing question that carries a correctAnswer', async () => {
    // ENTITY_QUESTION.md: writing has correctAnswer = null and is graded against
    // content.rubric. An answer here would let auto-grading mark essays.
    const res = await req(
      'POST',
      '/teacher/questions',
      {
        skill: 'writing',
        subType: 'essay',
        hskLevel: 5,
        content: { rubric: 'Bố cục, từ vựng, ngữ pháp' },
        correctAnswer: 'A',
      },
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.ok(res.body.details.correctAnswer);
  });

  it('requires a rubric on a writing question', async () => {
    const res = await req(
      'POST',
      '/teacher/questions',
      { skill: 'writing', subType: 'essay', hskLevel: 5, correctAnswer: null },
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.ok(res.body.details['content.rubric']);
  });

  it('requires audio on a listening question — QUESTION_AUDIO_REQUIRED', async () => {
    const res = await req(
      'POST',
      '/teacher/questions',
      {
        skill: 'listening',
        subType: 'short_answer',
        hskLevel: 2,
        content: { transcript: '你好' },
        correctAnswer: '你好',
      },
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, ErrorCode.QUESTION_AUDIO_REQUIRED);
  });

  it('refuses an answer that matches no option id', async () => {
    // WEB-006 B2: options were bare strings and one question stored "A + B" as its
    // answer, which nothing could match, so the preview marked every choice wrong.
    const res = await req(
      'POST',
      '/teacher/questions',
      { ...LISTENING_MCQ, correctAnswer: 'Z' },
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.ok(res.body.details.correctAnswer);
  });

  it('requires an array answer for a multi-answer sub-type', async () => {
    const res = await req(
      'POST',
      '/teacher/questions',
      {
        skill: 'reading',
        subType: 'multiple_choice_multi',
        hskLevel: 4,
        options: [
          { id: 'A', text: '一' },
          { id: 'B', text: '二' },
        ],
        correctAnswer: 'A',
      },
      teacherToken,
    );
    assert.equal(res.status, 400);
  });

  it('filters by skill and HSK level, and never leaks another teacher bank', async () => {
    await req('POST', '/teacher/questions', { ...LISTENING_MCQ, hskLevel: 6 }, teacherToken);
    await req('POST', '/teacher/questions', LISTENING_MCQ, otherTeacherToken);

    const mine = await req('GET', '/teacher/questions?skill=listening&hskLevel=6', undefined, teacherToken);
    assert.equal(mine.status, 200);
    assert.ok(mine.body.data.length >= 1);
    assert.ok(mine.body.data.every((q: any) => q.hskLevel === 6));

    // The other teacher created one question; ours must not appear in their bank.
    const theirs = await req('GET', '/teacher/questions', undefined, otherTeacherToken);
    assert.equal(theirs.body.meta.total, 1);
  });

  it('blocks read, update and delete of another teacher question', async () => {
    const created = await req('POST', '/teacher/questions', LISTENING_MCQ, teacherToken);
    const id = created.body.data.id;

    for (const [method, body] of [
      ['GET', undefined],
      ['PATCH', { hskLevel: 9 }],
      ['DELETE', undefined],
    ] as const) {
      const res = await req(method, `/teacher/questions/${id}`, body, otherTeacherToken);
      assert.equal(res.status, 403, `${method} should be forbidden`);
      assert.equal(res.body.code, ErrorCode.QUESTION_NOT_OWNER);
    }
  });

  it('validates the merged document on PATCH, not just the patch', async () => {
    const created = await req('POST', '/teacher/questions', LISTENING_MCQ, teacherToken);
    const id = created.body.data.id;

    // Individually valid: both fields are legal values. Together with the existing
    // correctAnswer they make a writing question that can be auto-graded.
    const res = await req(
      'PATCH',
      `/teacher/questions/${id}`,
      { skill: 'writing', subType: 'essay' },
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.ok(res.body.details.correctAnswer);
  });

  it('answers a malformed ObjectId with 404 rather than a 500', async () => {
    // Left to Mongoose this is a CastError, which the global filter renders as a
    // 500 — an internal error for what is plainly a client mistake.
    const res = await req('GET', '/teacher/questions/not-an-objectid', undefined, teacherToken);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, ErrorCode.QUESTION_NOT_FOUND);
  });

  it('keeps admins out of a teacher-only route', async () => {
    const res = await req('GET', '/teacher/questions', undefined, adminToken);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, ErrorCode.AUTH_INSUFFICIENT_ROLE);
  });

  it('deletes an own question', async () => {
    const created = await req('POST', '/teacher/questions', LISTENING_MCQ, teacherToken);
    const id = created.body.data.id;

    const del = await req('DELETE', `/teacher/questions/${id}`, undefined, teacherToken);
    assert.equal(del.status, 200);

    const after = await req('GET', `/teacher/questions/${id}`, undefined, teacherToken);
    assert.equal(after.status, 404);
  });
});
