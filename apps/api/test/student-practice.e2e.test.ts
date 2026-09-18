import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
const EMAIL_A = 'test.practice.student.a@hsk.local';
const EMAIL_B = 'test.practice.student.b@hsk.local';
const EMAILS = [EMAIL_A, EMAIL_B];

let app: INestApplication;
let base: string;
let prisma: PrismaService;
let adminToken: string;
let tokenA: string;
let tokenB: string;

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

interface ResponseValue {
  status: number;
  body: Record<string, unknown>;
}

async function req(
  method: 'GET' | 'PUT' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  token?: string,
): Promise<ResponseValue> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: await response.json() as Record<string, unknown>,
  };
}

function data<T>(response: ResponseValue): T {
  return response.body.data as T;
}

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(PREFIX);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppException(ErrorCode.VALIDATION_ERROR, 'Dữ liệu không hợp lệ', toDetails(errors)),
  }));
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(0);
  base = (await app.getUrl()).replace('[::1]', 'localhost');
  prisma = app.get(PrismaService);
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });

  const admin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  adminToken = data<{ accessToken: string }>(admin).accessToken;

  for (const [email, nickname] of [[EMAIL_A, 'Practice A'], [EMAIL_B, 'Practice B']] as const) {
    const registered = await req('POST', '/auth/register', {
      email,
      password: 'Password123!',
      fullName: nickname,
      role: 'student',
    });
    assert.equal(registered.status, 201, JSON.stringify(registered.body));
    const id = data<{ id: string }>(registered).id;
    const approved = await req('PATCH', `/admin/users/${id}/approve`, undefined, adminToken);
    assert.equal(approved.status, 200, JSON.stringify(approved.body));
    const login = await req('POST', '/auth/login', { email, password: 'Password123!' });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    const token = data<{ accessToken: string }>(login).accessToken;
    if (email === EMAIL_A) tokenA = token;
    else tokenB = token;
  }
});

after(async () => {
  await prisma?.user.deleteMany({ where: { email: { in: EMAILS } } });
  await app?.close();
});

describe('student live practice routes', () => {
  it('protects every catalog behind Student RBAC', async () => {
    assert.equal((await req('GET', '/student/writing')).status, 401);
    assert.equal((await req('GET', '/student/lego', undefined, adminToken)).status, 403);
    assert.equal((await req('GET', '/student/workplace', undefined, adminToken)).status, 403);
  });

  it('serves Writing and persists only an own practised marker', async () => {
    const list = await req('GET', '/student/writing', undefined, tokenA);
    assert.equal(list.status, 200, JSON.stringify(list.body));
    assert.equal(data<unknown[]>(list).length, 587);

    const detail = await req('GET', '/student/writing/ch-1', undefined, tokenA);
    assert.equal(detail.status, 200, JSON.stringify(detail.body));
    assert.equal(data<{ char: string }>(detail).char, '人');
    assert.ok(!('score' in data<Record<string, unknown>>(detail)));

    const save = await req('PUT', '/student/writing/ch-1/progress', { practised: true }, tokenA);
    assert.equal(save.status, 200, JSON.stringify(save.body));
    const repeat = await req('PUT', '/student/writing/ch-1/progress', { practised: true }, tokenA);
    assert.equal(repeat.status, 200, JSON.stringify(repeat.body));
    const progressA = data<{ practised: Array<{ characterId: string }> }>(
      await req('GET', '/student/writing/progress', undefined, tokenA),
    );
    const progressB = data<{ practised: Array<{ characterId: string }> }>(
      await req('GET', '/student/writing/progress', undefined, tokenB),
    );
    assert.equal(progressA.practised.filter((row) => row.characterId === 'ch-1').length, 1);
    assert.equal(progressB.practised.some((row) => row.characterId === 'ch-1'), false);

    const missing = await req('GET', '/student/writing/not-here', undefined, tokenA);
    assert.equal(missing.status, 404);
    assert.equal(missing.body.code, 'WRITING_CHAR_NOT_FOUND');
  });

  it('serves shuffled Lego blocks and grades a complete attempt on the server', async () => {
    const stations = await req('GET', '/student/lego', undefined, tokenA);
    assert.equal(stations.status, 200, JSON.stringify(stations.body));
    assert.equal(data<{ stations: unknown[] }>(stations).stations.length, 7);

    const station = await req('GET', '/student/lego/stations/st-1', undefined, tokenA);
    assert.equal(station.status, 200, JSON.stringify(station.body));
    const stationData = data<{ sentences: Array<{ id: string; blocks: Array<{ id: string }> }> }>(station);
    assert.equal('pinyin' in stationData.sentences[0], false);

    const corpus = JSON.parse(readFileSync(join(process.cwd(), 'content', 'lego.json'), 'utf8')) as {
      sentences: Array<{ id: string; blocks: Array<{ id: string }> }>;
    };
    const ids = new Set(stationData.sentences.map((item) => item.id));
    const answers = corpus.sentences.filter((item) => ids.has(item.id)).map((item) => ({
      sentenceId: item.id,
      blockIds: item.blocks.map((block) => block.id),
    }));
    const attempt = await req(
      'POST',
      '/student/lego/stations/st-1/attempt',
      { answers },
      tokenA,
    );
    assert.equal(attempt.status, 200, JSON.stringify(attempt.body));
    assert.equal(data<{ progress: { stars: number } }>(attempt).progress.stars, 3);
    assert.ok(data<{ results: Array<{ correct: boolean }> }>(attempt).results.every((r) => r.correct));

    const bStations = data<{ stations: Array<{ progress: { attempted: boolean } }> }>(
      await req('GET', '/student/lego', undefined, tokenB),
    );
    assert.equal(bStations.stations[0].progress.attempted, false);
    const invalid = await req(
      'POST',
      '/student/lego/stations/st-1/attempt',
      { answers: answers.slice(0, 1) },
      tokenA,
    );
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.code, 'VALIDATION_ERROR');
  });

  it('withholds Workplace models, validates order, and reveals without a score', async () => {
    const list = await req('GET', '/student/workplace', undefined, tokenA);
    assert.equal(list.status, 200, JSON.stringify(list.body));
    assert.equal(data<{ scenarios: unknown[] }>(list).scenarios.length, 6);

    const detail = await req('GET', '/student/workplace/sc-quotation', undefined, tokenA);
    assert.equal(detail.status, 200, JSON.stringify(detail.body));
    const scenario = data<{ turns: Array<Record<string, unknown>> }>(detail);
    assert.equal('model' in scenario.turns[0], false);
    assert.equal('keywords' in scenario.turns[0], false);

    const skip = await req(
      'POST',
      '/student/workplace/sc-quotation/turns/t2/reveal',
      { reply: '先回答第二轮' },
      tokenA,
    );
    assert.equal(skip.status, 400);
    const blank = await req(
      'POST',
      '/student/workplace/sc-quotation/turns/t1/reveal',
      { reply: '   ' },
      tokenA,
    );
    assert.equal(blank.status, 400);

    for (const turnId of ['t1', 't2', 't3']) {
      const reveal = await req(
        'POST',
        `/student/workplace/sc-quotation/turns/${turnId}/reveal`,
        { reply: `我的练习回答 ${turnId}` },
        tokenA,
      );
      assert.equal(reveal.status, 200, JSON.stringify(reveal.body));
      const revealData = data<Record<string, unknown>>(reveal);
      assert.equal(typeof revealData.model, 'string');
      assert.equal('score' in revealData, false);
      assert.equal('keywords' in revealData, false);
    }
    const after = data<{ scenarios: Array<{ id: string; progress: { completed: boolean } }> }>(
      await req('GET', '/student/workplace', undefined, tokenA),
    );
    assert.equal(after.scenarios.find((item) => item.id === 'sc-quotation')?.progress.completed, true);
    const other = data<{ scenarios: Array<{ progress: { completedTurns: number } }> }>(
      await req('GET', '/student/workplace', undefined, tokenB),
    );
    assert.equal(other.scenarios[0].progress.completedTurns, 0);
  });
});
