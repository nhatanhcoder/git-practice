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
import { Types } from 'mongoose';

/**
 * Placement (04-placement.md, Task C 2026-09-13).
 *
 * The dev Mongo `questions` collection is shared by every suite and may hold
 * legitimate rows from other lanes — so the e2e never asserts an exact paper.
 * It asserts the invariants that hold regardless of pollution (contiguous bands,
 * stripped keys, deterministic order) and it CONTROLS grading by reading the
 * correct answers straight from Mongo for whatever paper came back. The
 * bank-pollution-sensitive rule (empty band 1 ⇒ empty paper, INV-PLC-02) is
 * covered as a pure-rule test below, where the pool is exactly the fixture.
 *
 * Suites share one database (--test-concurrency=1, DEBT-004) and clean up every
 * fixture they created in both stores.
 */

const PREFIX = 'api/v1';

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

// ---------------------------------------------------------------------------
// Pure rules (04 §4) — no app, no database. These are the invariants the shared
// dev bank cannot demonstrate.
// ---------------------------------------------------------------------------

import { buildPaper, isCorrect, isEligible, placementLevel, type PoolQuestion } from '../dist/src/placement/placement-rules';

function poolQuestion(over: Partial<PoolQuestion>): PoolQuestion {
  return {
    id: over.id ?? `q-${Math.random().toString(36).slice(2)}`,
    hskLevel: over.hskLevel ?? 1,
    skill: over.skill ?? 'listening',
    subType: over.subType ?? 'multiple_choice_single',
    content: over.content ?? { prompt: '选择正确的词。', audioUrl: 'https://cdn.example/a.mp3' },
    options: over.options ?? [
      { id: 'a', text: '认识' },
      { id: 'b', text: '知道' },
    ],
    correctAnswer: over.correctAnswer ?? 'a',
    createdAt: over.createdAt ?? new Date(2026, 0, 1),
  };
}

describe('placement pure rules (04 §4)', () => {
  it('INV-PLC-01: writing (null answer) and multi-answer questions are ineligible', () => {
    assert.equal(isEligible({ options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], correctAnswer: null }), false);
    assert.equal(isEligible({ options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], correctAnswer: ['a', 'b'] }), false);
    assert.equal(isEligible({ options: [{ id: 'a', text: 'x' }], correctAnswer: 'a' }), false); // <2 options
    assert.equal(isEligible({ options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], correctAnswer: 'zzz' }), false); // answer not an option id
    assert.equal(isEligible({ options: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], correctAnswer: 'b' }), true);
  });

  it('INV-PLC-02: bands are contiguous from 1 and stop at the first empty band', () => {
    const { paper } = buildPaper([
      poolQuestion({ hskLevel: 1, id: 'l1a' }),
      poolQuestion({ hskLevel: 1, id: 'l1b' }),
      poolQuestion({ hskLevel: 1, id: 'l1c' }), // over the per-band cap — cut, not rotated in
      poolQuestion({ hskLevel: 3, id: 'l3a' }), // band 2 empty ⇒ band 3 never sampled
    ]);
    assert.deepEqual(paper.map((q) => q.questionId), ['l1a', 'l1b']);
  });

  it('INV-PLC-02: an empty pool yields an empty paper (the PLACEMENT_NO_QUESTIONS case)', () => {
    const { paper, answers } = buildPaper([]);
    assert.equal(paper.length, 0);
    assert.equal(answers.size, 0);
  });

  it('INV-PLC-03: the paper follows the pool order exactly (determinism lives upstream)', () => {
    const pool = [
      poolQuestion({ hskLevel: 1, id: 'first' }),
      poolQuestion({ hskLevel: 1, id: 'second' }),
      poolQuestion({ hskLevel: 2, id: 'third' }),
    ];
    const one = buildPaper(pool);
    const two = buildPaper(pool);
    assert.deepEqual(one.paper.map((q) => q.questionId), ['first', 'second', 'third']);
    assert.deepEqual(two.paper.map((q) => q.questionId), one.paper.map((q) => q.questionId));
  });

  it('INV-PLC-04: grading is exact single-option match', () => {
    assert.equal(isCorrect(['b'], 'b'), true);
    assert.equal(isCorrect(['a'], 'b'), false);
    assert.equal(isCorrect([], 'b'), false);
    assert.equal(isCorrect(['a', 'b'], 'b'), false);
    assert.equal(isCorrect('b', 'b'), false); // a wire string is not an option array
  });

  it('INV-PLC-05: the level rule — no band skipping, floor 1, cap at the paper', () => {
    const bands = (m: Record<number, number>) => new Map(Object.entries(m).map(([k, v]) => [Number(k), v]));
    assert.equal(placementLevel(bands({ 1: 1, 2: 1, 3: 0 }), 3), 2); // wrong band 3 stops it
    assert.equal(placementLevel(bands({ 1: 1, 2: 1, 3: 2 }), 3), 3);
    assert.equal(placementLevel(bands({ 1: 0 }), 1), 1); // all wrong floors at 1
    assert.equal(placementLevel(bands({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }), 6), 6);
    assert.equal(placementLevel(bands({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }), 3), 3); // cap = paper's highest band
    assert.equal(placementLevel(new Map(), 3), 1);
  });
});

// ---------------------------------------------------------------------------
// e2e against the real stores
// ---------------------------------------------------------------------------

let app: INestApplication;
let base: string;
let prisma: PrismaService;
let mongo: Connection;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- This test helper accepts heterogeneous endpoint envelopes.
type Res = { status: number; body: any };

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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

const TEACHER = 'plc.teacher@hsk.local';
const STUDENT = 'plc.student@hsk.local';
const OWNED_EMAILS = [TEACHER, STUDENT];

let teacherToken: string;
let studentToken: string;
const createdQuestionIds: string[] = [];

// Mongo _id is an ObjectId; the wire carries hex strings — the $in oracle reads cast.
function toObjectIds(ids: string[]): Types.ObjectId[] {
  return ids.map((id) => new Types.ObjectId(id));
}

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

async function createQuestion(
  over: { hskLevel: number; correctAnswer: string | string[] | null; subType?: string; skill?: string },
): Promise<string> {
  const res = await req(
    'POST',
    '/teacher/questions',
    {
      skill: over.skill ?? 'listening',
      subType: over.subType ?? 'multiple_choice_single',
      hskLevel: over.hskLevel,
      difficulty: 'medium',
      content: {
        prompt: `选择正确的词。(${over.hskLevel})`,
        audioUrl: 'https://cdn.example/plc.mp3',
        rubric: 'Nội dung, từ vựng',
      },
      options: [
        { id: 'a', text: '认识' },
        { id: 'b', text: '知道' },
      ],
      correctAnswer: over.correctAnswer,
    },
    teacherToken,
  );
  assert.equal(res.status, 201, `create question failed: ${JSON.stringify(res.body)}`);
  const id = res.body.data.id as string;
  createdQuestionIds.push(id);
  return id;
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
  studentToken = await registerApproveLogin(STUDENT, 'student');

  // Bands 1–3, two single-MCQ each — the paper's guaranteed floor even on a
  // polluted dev bank. The writing + multi questions at band 1 must be excluded
  // from the paper (INV-PLC-01).
  for (const level of [1, 2, 3]) {
    await createQuestion({ hskLevel: level, correctAnswer: 'a' });
    await createQuestion({ hskLevel: level, correctAnswer: 'b' });
  }
  await createQuestion({ hskLevel: 1, correctAnswer: null, subType: 'essay', skill: 'writing' });
  await createQuestion({ hskLevel: 1, correctAnswer: ['a', 'b'], subType: 'multiple_choice_multi', skill: 'reading' });
});

after(async () => {
  // Own fixtures only — never touch other lanes' rows.
  if (createdQuestionIds.length > 0) {
    await mongo.collection('questions').deleteMany({
      _id: {
        $in: createdQuestionIds.map((id) => id as unknown as Types.ObjectId),
      },
    });
  }
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app.close();
});

describe('placement e2e (04-placement.md)', () => {
  it('INV-PLC-08: anonymous gets 401, a teacher token gets 403', async () => {
    const anon = await req('GET', '/student/placement');
    assert.equal(anon.status, 401);
    const teacher = await req('GET', '/student/placement', undefined, teacherToken);
    assert.equal(teacher.status, 403);
  });

  it('INV-PLC-01/02: the paper is contiguous bands, MCQ-only, answers stripped', async () => {
    const res = await req('GET', '/student/placement', undefined, studentToken);
    assert.equal(res.status, 200);
    const paper = res.body.data.questions as Array<Record<string, unknown>>;
    assert.ok(paper.length >= 6, 'fixtures guarantee bands 1–3, two questions each');

    const bands = [...new Set(paper.map((q) => q.hskLevel as number))].sort((a, b) => a - b);
    assert.equal(bands[0], 1, 'the paper always starts at band 1');
    for (let i = 1; i < bands.length; i++) {
      assert.equal(bands[i], bands[i - 1] + 1, `bands must be contiguous, got ${bands}`);
    }
    for (const q of paper) {
      assert.ok(Array.isArray(q.options) && (q.options as unknown[]).length >= 2);
      assert.equal('correctAnswer' in q, false, 'INV-PLC-04: no key on the wire');
      assert.equal('explanation' in q, false);
      const ids = (q.options as Array<{ id: string }>).map((o) => o.id);
      assert.ok(new Set(ids).size === ids.length);
    }
  });

  it('INV-PLC-03: two GETs return the identical paper', async () => {
    const one = await req('GET', '/student/placement', undefined, studentToken);
    const two = await req('GET', '/student/placement', undefined, studentToken);
    const idsOne = (one.body.data.questions as Array<{ questionId: string }>).map((q) => q.questionId);
    const idsTwo = (two.body.data.questions as Array<{ questionId: string }>).map((q) => q.questionId);
    assert.deepEqual(idsTwo, idsOne);
  });

  it('INV-PLC-04/05/06: all-correct grades to the paper cap and persists the level', async () => {
    const paperRes = await req('GET', '/student/placement', undefined, studentToken);
    const paper = paperRes.body.data.questions as Array<{ questionId: string; hskLevel: number; options: { id: string }[] }>;
    const highestBand = Math.max(...paper.map((q) => q.hskLevel));

    // Read the key from Mongo as the test's own oracle — the wire never carries it.
    const docs = await mongo
      .collection('questions')
      .find({ _id: { $in: toObjectIds(paper.map((q) => q.questionId)) } })
      .toArray();
    const keyById = new Map(docs.map((d) => [String(d._id), d.correctAnswer as string]));

    const answers = paper.map((q) => ({ questionId: q.questionId, selectedOptions: [keyById.get(q.questionId)] }));
    const res = await req('POST', '/student/placement', { answers }, studentToken);
    assert.equal(res.status, 200, `submit failed: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.data.level, highestBand, 'acing every band caps at the paper');
    assert.equal(res.body.data.total, paper.length);
    assert.equal(res.body.data.savedLevel, highestBand);

    // INV-PLC-06: persisted — a fresh GET reports it as the saved level.
    const after = await req('GET', '/student/placement', undefined, studentToken);
    assert.equal(after.body.data.savedLevel, highestBand);
  });

  it('INV-PLC-05: all-wrong floors at level 1', async () => {
    const paperRes = await req('GET', '/student/placement', undefined, studentToken);
    const paper = paperRes.body.data.questions as Array<{ questionId: string; options: { id: string }[] }>;
    // Fixtures alternate a/b keys, so "not 'a'" is not reliably wrong — read the key
    // from Mongo and pick an option that is not it.
    const docs = await mongo
      .collection('questions')
      .find({ _id: { $in: toObjectIds(paper.map((q) => q.questionId)) } })
      .toArray();
    const keyById = new Map(docs.map((d) => [String(d._id), d.correctAnswer as string]));
    const answers = paper.map((q) => ({
      questionId: q.questionId,
      selectedOptions: [q.options.find((o) => o.id !== keyById.get(q.questionId))?.id ?? q.options[0].id],
    }));
    const res = await req('POST', '/student/placement', { answers }, studentToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.level, 1);
    assert.equal(res.body.data.total, 0);
  });

  it('INV-PLC-05: correct through band 2 only stops at level 2', async () => {
    const paperRes = await req('GET', '/student/placement', undefined, studentToken);
    const paper = paperRes.body.data.questions as Array<{ questionId: string; hskLevel: number; options: { id: string }[] }>;
    const docs = await mongo
      .collection('questions')
      .find({ _id: { $in: toObjectIds(paper.map((q) => q.questionId)) } })
      .toArray();
    const keyById = new Map(docs.map((d) => [String(d._id), d.correctAnswer as string]));

    const answers = paper.map((q) => ({
      questionId: q.questionId,
      // Bands 1–2 get the key; every later band gets an option that provably is not
      // the key (dev-bank leftovers may carry any key, never assume 'a' is wrong).
      selectedOptions: [
        q.hskLevel <= 2
          ? (keyById.get(q.questionId) as string)
          : (q.options.find((o) => o.id !== keyById.get(q.questionId))?.id ?? q.options[0].id),
      ],
    }));
    const res = await req('POST', '/student/placement', { answers }, studentToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.level, 2, 'a wrong/unanswered band 3 caps the level at 2');
    assert.ok(
      (res.body.data.correctByLevel['1'] ?? 0) >= 1,
      'band 1 contributed correct answers',
    );
    assert.ok(
      (res.body.data.correctByLevel['2'] ?? 0) >= 1,
      'band 2 contributed correct answers',
    );
  });

  it('INV-PLC-07: malformed bodies are rejected by the whitelist pipe', async () => {
    const bad = await req(
      'POST',
      '/student/placement',
      { answers: [{ questionId: 'x', selectedOptions: ['a'], hacker: true }] },
      studentToken,
    );
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, 'VALIDATION_ERROR');
  });
});
