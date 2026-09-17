import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../dist/src/app.module.js';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor.js';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter.js';
import { PrismaService } from '../dist/src/prisma/prisma.service.js';

const PREFIX = 'api/v1';
const EMAILS = ['progress.teacher@hsk.local', 'progress.a@hsk.local', 'progress.b@hsk.local', 'progress.empty@hsk.local'];
let app: INestApplication;
let base: string;
let prisma: PrismaService;
let mongo: Connection;
let tokens: Record<string, string>;

function utcMonday(date: Date): Date {
  const value = new Date(date);
  const day = value.getUTCDay();
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() - (day === 0 ? 6 : day - 1));
  return value;
}

async function get(path: string, token?: string) {
  const response = await fetch(`${base}/${PREFIX}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: response.status, body: await response.json().catch(() => null) };
}

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(PREFIX);
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(0);
  base = (await app.getUrl()).replace('[::1]', 'localhost');
  prisma = app.get(PrismaService);
  mongo = app.get<Connection>(getConnectionToken());
  const jwt = app.get(JwtService);

  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  const [teacher, studentA, studentB, empty] = await Promise.all([
    prisma.user.create({ data: { email: EMAILS[0], passwordHash: 'test', role: 'teacher', status: 'active' } }),
    prisma.user.create({ data: { email: EMAILS[1], passwordHash: 'test', role: 'student', status: 'active' } }),
    prisma.user.create({ data: { email: EMAILS[2], passwordHash: 'test', role: 'student', status: 'active' } }),
    prisma.user.create({ data: { email: EMAILS[3], passwordHash: 'test', role: 'student', status: 'active' } }),
  ]);
  tokens = Object.fromEntries(await Promise.all([teacher, studentA, studentB, empty].map(async (user) => [user.email, await jwt.signAsync({ sub: user.id, email: user.email, role: user.role })])));

  const questionId = (await mongo.collection('questions').insertOne({ skill: 'reading', subType: 'fill_in_blank', hskLevel: 3, difficulty: 'medium', content: { prompt: 'PRIVATE PROMPT' }, correctAnswer: 'PRIVATE KEY', createdBy: teacher.id })).insertedId.toString();
  const deletedQuestionId = '507f1f77bcf86cd799439011';
  const cls = await prisma.class.create({ data: { teacherId: teacher.id, name: 'Progress fixture', hskLevel: 3, enrollmentCode: 'PRGTEST1' } });
  const completedMonday = new Date(utcMonday(new Date()).getTime() - 7 * 24 * 60 * 60 * 1000);
  const gradedAt = new Date(completedMonday.getTime() + 24 * 60 * 60 * 1000);

  async function makeAttempt(studentId: string, status: 'graded' | 'submitted', idSuffix: string, qid: string, score: number | null) {
    const assignment = await prisma.assignment.create({ data: { classId: cls.id, teacherId: teacher.id, title: `Progress ${idSuffix}`, type: 'homework', status: 'published', questionIds: [qid] } });
    return prisma.attempt.create({ data: {
      assignmentId: assignment.id, studentId, status, startedAt: gradedAt, submittedAt: gradedAt,
      gradedAt: status === 'graded' ? gradedAt : null, totalScore: score, maxScore: 10,
      answers: { create: { questionId: qid, isCorrect: true, autoScore: 1 } },
    } });
  }
  await makeAttempt(studentA.id, 'graded', 'owned', questionId, 8);
  await makeAttempt(studentA.id, 'graded', 'deleted', deletedQuestionId, 6);
  await makeAttempt(studentA.id, 'graded', 'perfect', questionId, 10);
  await makeAttempt(studentA.id, 'submitted', 'ungraded', questionId, null);
  await makeAttempt(studentB.id, 'graded', 'foreign', questionId, 1);
  await makeAttempt(studentB.id, 'graded', 'foreign-2', questionId, 1);
  await makeAttempt(studentB.id, 'graded', 'foreign-3', questionId, 1);
});

after(async () => {
  const users = await prisma.user.findMany({ where: { email: { in: EMAILS } }, select: { id: true } });
  await mongo.collection('questions').deleteMany({ createdBy: { $in: users.map((user) => user.id) } });
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  await app?.close();
});

describe('GET /student/progress', () => {
  it('aggregates only the caller graded rows, preserves deleted-question totals and leaks no content', async () => {
    const response = await get('/student/progress', tokens[EMAILS[1]]);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.totals.gradedAttempts, 3);
    assert.equal(response.body.data.totals.avgScore, 8);
    assert.equal(response.body.data.heatmap.at(-1).reading, 1);
    const payload = JSON.stringify(response.body);
    assert.equal(payload.includes('PRIVATE PROMPT'), false);
    assert.equal(payload.includes('PRIVATE KEY'), false);
    assert.equal(payload.includes(EMAILS[2]), false);
  });

  it('returns UTC-Monday chart points and excludes submitted rows', async () => {
    const response = await get('/student/progress/chart', tokens[EMAILS[1]]);
    assert.equal(response.status, 200);
    const point = response.body.data.points.at(-1);
    assert.equal(new Date(point.weekStart).getUTCDay(), 1);
    assert.equal(point.count, 3);
    assert.equal(point.avgScore, 8);
  });

  it('returns the explicit empty shape', async () => {
    const overview = await get('/student/progress', tokens[EMAILS[3]]);
    const chart = await get('/student/progress/chart', tokens[EMAILS[3]]);
    assert.deepEqual(overview.body.data.heatmap, []);
    assert.equal(overview.body.data.totals.avgScore, null);
    assert.deepEqual(chart.body.data.points, []);
  });

  it('rejects a teacher and an anonymous caller', async () => {
    assert.equal((await get('/student/progress', tokens[EMAILS[0]])).status, 403);
    assert.equal((await get('/student/progress')).status, 401);
  });
});

describe('GET /student/leaderboard and /student/badges', () => {
  it('returns only anonymized eligible aggregates and identifies the caller', async () => {
    const response = await get('/student/leaderboard', tokens[EMAILS[1]]);
    assert.equal(response.status, 200);
    assert.ok(response.body.data.eligibleCount >= 2);
    assert.equal(response.body.data.me.score, 80);
    assert.equal(response.body.data.me.gradedAttempts, 3);
    const payload = JSON.stringify(response.body);
    for (const email of EMAILS) assert.equal(payload.includes(email), false);
    assert.equal(payload.includes('studentId'), false);
    assert.equal(payload.includes('nickname'), false);
    assert.equal(payload.includes('PRIVATE PROMPT'), false);
  });

  it('computes only the caller badge history and keeps locked milestones explicit', async () => {
    const response = await get('/student/badges', tokens[EMAILS[1]]);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.earnedCount, 2);
    const perfect = response.body.data.badges.find((badge: { id: string }) => badge.id === 'perfect-score');
    const five = response.body.data.badges.find((badge: { id: string }) => badge.id === 'five-grades');
    assert.equal(perfect.earned, true);
    assert.ok(perfect.earnedAt);
    assert.equal(five.current, 3);
    assert.equal(five.earned, false);
    assert.equal(five.earnedAt, null);
  });

  it('rejects teacher and anonymous callers on both routes', async () => {
    for (const path of ['/student/leaderboard', '/student/badges']) {
      assert.equal((await get(path, tokens[EMAILS[0]])).status, 403);
      assert.equal((await get(path)).status, 401);
    }
  });
});
