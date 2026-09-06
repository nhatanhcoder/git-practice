import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import cookieParser from 'cookie-parser';
import { Types, type Connection } from 'mongoose';
import { AppModule } from '../dist/src/app.module';
import { AppException } from '../dist/src/common/errors/app.exception';
import { ErrorCode } from '../dist/src/common/errors/error-codes';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor';
import { PrismaService } from '../dist/src/prisma/prisma.service';
import { calculateSm2 } from '../dist/src/flashcards/sm2';

const PREFIX = 'api/v1';
const STUDENT_EMAIL = 'test.srs.student@hsk.local';
const OTHER_EMAIL = 'test.srs.other@hsk.local';
const TEACHER_EMAIL = 'test.srs.teacher@hsk.local';
const OWNED_EMAILS = [STUDENT_EMAIL, OTHER_EMAIL, TEACHER_EMAIL];
const TEST_TAG = 'test-student-srs-e2e';

let app: INestApplication;
let base: string;
let prisma: PrismaService;
let mongo: Connection;
let studentToken: string;
let otherToken: string;
let teacherToken: string;
let studentId: string;
let cardId: string;

function toDetails(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const error of errors) {
    const field = prefix ? `${prefix}.${error.property}` : error.property;
    const messages = Object.values(error.constraints ?? {});
    if (messages.length) out[field] = [...(out[field] ?? []), ...messages];
    if (error.children?.length) Object.assign(out, toDetails(error.children, field));
  }
  return out;
}

async function req(method: 'GET' | 'POST' | 'PATCH', path: string, body?: any, token?: string) {
  const headers: Record<string, string> = {};
  if (body) headers['content-type'] = 'application/json; charset=utf-8';
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function registerApproveLogin(
  email: string,
  role: 'student' | 'teacher',
  adminToken: string,
) {
  const registered = await req('POST', '/auth/register', {
    email,
    password: 'Password123!',
    fullName: email,
    role,
  });
  await req('PATCH', `/admin/users/${registered.body.data.id}/approve`, undefined, adminToken);
  const login = await req('POST', '/auth/login', { email, password: 'Password123!' });
  return { id: registered.body.data.id as string, token: login.body.data.accessToken as string };
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

  const admin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  const adminToken = admin.body.data.accessToken as string;
  const student = await registerApproveLogin(STUDENT_EMAIL, 'student', adminToken);
  const other = await registerApproveLogin(OTHER_EMAIL, 'student', adminToken);
  const teacher = await registerApproveLogin(TEACHER_EMAIL, 'teacher', adminToken);
  studentId = student.id;
  studentToken = student.token;
  otherToken = other.token;
  teacherToken = teacher.token;

  // A killed run may leave Mongo fixtures behind because there is no cross-DB
  // rollback. Clean only rows carrying this suite's explicit ownership tag.
  const leftovers = await mongo
    .collection('flashcards')
    .find({ tags: TEST_TAG })
    .project({ _id: 1 })
    .toArray();
  await mongo
    .collection('user_flashcard_states')
    .deleteMany({ flashcardId: { $in: leftovers.map((row) => row._id) } });
  await mongo.collection('flashcards').deleteMany({ tags: TEST_TAG });

  const inserted = await mongo.collection('flashcards').insertOne({
    hskLevel: 3,
    hanzi: '学习',
    pinyin: 'xuéxí',
    meaning: 'học tập',
    exampleSentence: '我每天学习汉语。',
    tags: ['verb', 'hsk3-core', TEST_TAG],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  cardId = inserted.insertedId.toString();
});

after(async () => {
  await mongo
    .collection('user_flashcard_states')
    .deleteMany({ flashcardId: new Types.ObjectId(cardId) });
  await mongo.collection('flashcards').deleteOne({ _id: new Types.ObjectId(cardId) });
  const users = await prisma.user.findMany({
    where: { email: { in: OWNED_EMAILS } },
    select: { id: true },
  });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app.close();
});

describe('Student SRS flashcards', () => {
  it('implements the canonical SM-2 intervals and ease-factor floor', () => {
    const now = new Date('2026-09-05T00:00:00.000Z');
    const first = calculateSm2(
      { rating: 4, repetitionsCount: 0, intervalDays: 1, easeFactor: 2.5 },
      now,
    );
    assert.equal(first.repetitionsCount, 1);
    assert.equal(first.intervalDays, 1);
    assert.equal(first.easeFactor, 2.5);
    const failed = calculateSm2(
      { rating: 0, repetitionsCount: 8, intervalDays: 100, easeFactor: 1.3 },
      now,
    );
    assert.equal(failed.repetitionsCount, 0);
    assert.equal(failed.intervalDays, 1);
    assert.equal(failed.easeFactor, 1.3);
  });

  it('browses HSK vocabulary and keeps another role out', async () => {
    const student = await req('GET', '/student/flashcards?hskLevel=3', undefined, studentToken);
    assert.equal(student.status, 200);
    const card = student.body.data.find((row: any) => row.id === cardId);
    assert.equal(card.hanzi, '学习');
    assert.equal(card.state, null);
    assert.ok(student.body.meta.total >= 1);

    const teacher = await req('GET', '/student/flashcards?hskLevel=3', undefined, teacherToken);
    assert.equal(teacher.status, 403);
  });

  it('validates HSK level and the four public ratings', async () => {
    const level = await req('GET', '/student/flashcards?hskLevel=10', undefined, studentToken);
    assert.equal(level.status, 400);
    const rating = await req(
      'POST',
      `/student/flashcards/${cardId}/review`,
      { rating: 2 },
      studentToken,
    );
    assert.equal(rating.status, 400);
  });

  it('creates private state on first review and applies SM-2', async () => {
    const reviewed = await req(
      'POST',
      `/student/flashcards/${cardId}/review`,
      { rating: 4 },
      studentToken,
    );
    assert.equal(reviewed.status, 201);
    assert.equal(reviewed.body.data.state.repetitionsCount, 1);
    assert.equal(reviewed.body.data.state.intervalDays, 1);

    const other = await req('GET', '/student/flashcards/due', undefined, otherToken);
    assert.equal(other.status, 200);
    assert.deepEqual(other.body.data, []);
  });

  it('returns ownership-scoped aggregate stats', async () => {
    const mine = await req('GET', '/student/flashcards/stats', undefined, studentToken);
    assert.equal(mine.status, 200);
    assert.equal(mine.body.data.totalCards, 1);
    assert.equal(mine.body.data.totalReviews, 1);
    assert.equal(mine.body.data.retentionRate, 100);
    assert.equal(mine.body.data.streak, null);

    const other = await req('GET', '/student/flashcards/stats', undefined, otherToken);
    assert.equal(other.body.data.totalCards, 0);
  });

  it('maps a malformed or missing id to FLASHCARD_NOT_FOUND', async () => {
    const response = await req(
      'POST',
      '/student/flashcards/not-an-id/review',
      { rating: 0 },
      studentToken,
    );
    assert.equal(response.status, 404);
    assert.equal(response.body.code, ErrorCode.FLASHCARD_NOT_FOUND);
  });
});
