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

/**
 * SRS study → feedback → reload-state flow.
 *
 * Complements `student-flashcards.e2e.test.ts` (SM-2 maths, role guard, input
 * validation, malformed id) without overlapping it: every test here exercises a
 * multi-step flow — browse/review/re-read — the way the `/student/flashcards`
 * screen actually drives the API. Contract source is the Page Contract
 * `docs/front-end-design-docs/pages/student-pages/student-srs.md`
 * (`route: /student/flashcards`); no field, path or error code is invented —
 * all codes come from `ErrorCode`, all shapes from the service DTOs.
 *
 * Isolation: two owned student accounts plus fixtures tagged TEST_TAG. Seed rows
 * are never read as fixtures and never mutated (API-012). `after()` runs even
 * when a test fails (node:test guarantee), so fixtures are cleaned up on red
 * too; a pre-run sweep removes leftovers from a killed run.
 */
const PREFIX = 'api/v1';
const STUDENT_A_EMAIL = 'test.srsflow.a@hsk.local';
const STUDENT_B_EMAIL = 'test.srsflow.b@hsk.local';
const OWNED_EMAILS = [STUDENT_A_EMAIL, STUDENT_B_EMAIL];
const TEST_TAG = 'test-srs-flow-e2e';
const PAGE_LIMIT = 100;

type CardState = {
  easeFactor: number;
  repetitionsCount: number;
  intervalDays: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  isSavedByUser: boolean;
  totalReviews: number;
  correctReviews: number;
};

type CardRow = {
  id: string;
  hskLevel: number;
  hanzi: string;
  state: CardState | null;
};

type BrowseBody = {
  data: CardRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

type StatsBody = {
  data: { totalCards: number; dueToday: number; totalReviews: number; retentionRate: number; streak: null };
};

type ReviewBody = {
  data: { flashcardId: string; rating: number; state: CardState };
};

type ErrorBody = { code: string };

type AuthBody = { data: { id: string; accessToken: string } };

let app: INestApplication;
let base: string;
let prisma: PrismaService;
let mongo: Connection;
let tokenA: string;
let tokenB: string;
let userAId: string;
let cardL4Id: string;
let cardL5Id: string;

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

async function req(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json; charset=utf-8';
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: (await response.json().catch(() => null)) as unknown };
}

async function registerApproveLogin(email: string, adminToken: string) {
  const registered = await req('POST', '/auth/register', {
    email,
    password: 'Password123!',
    fullName: email,
    role: 'student',
  });
  const registeredBody = registered.body as AuthBody;
  await req('PATCH', `/admin/users/${registeredBody.data.id}/approve`, undefined, adminToken);
  const login = await req('POST', '/auth/login', { email, password: 'Password123!' });
  const loginBody = login.body as AuthBody;
  return { id: registeredBody.data.id, token: loginBody.data.accessToken };
}

/**
 * Own fixtures share the catalog with production imports (A11 wrote 1,118+
 * cards into the dev database), so a single first page is not guaranteed to
 * hold our card. Walk pages until found — deterministic on any catalog size.
 */
async function findOwnCard(token: string, hskLevel: number, id: string): Promise<CardRow | undefined> {
  let page = 1;
  for (;;) {
    const res = await req(
      'GET',
      `/student/flashcards?hskLevel=${hskLevel}&page=${page}&limit=${PAGE_LIMIT}`,
      undefined,
      token,
    );
    assert.equal(res.status, 200);
    const body = res.body as BrowseBody;
    const found = body.data.find((row) => row.id === id);
    if (found) return found;
    if (page >= body.meta.totalPages) return undefined;
    page += 1;
  }
}

async function sweepTaggedFixtures() {
  const leftovers = await mongo
    .collection('flashcards')
    .find({ tags: TEST_TAG })
    .project({ _id: 1 })
    .toArray();
  await mongo
    .collection('user_flashcard_states')
    .deleteMany({ flashcardId: { $in: leftovers.map((row) => row._id) } });
  await mongo.collection('flashcards').deleteMany({ tags: TEST_TAG });
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
  const adminToken = (admin.body as AuthBody).data.accessToken;
  const a = await registerApproveLogin(STUDENT_A_EMAIL, adminToken);
  const b = await registerApproveLogin(STUDENT_B_EMAIL, adminToken);
  userAId = a.id;
  tokenA = a.token;
  tokenB = b.token;

  // No cross-DB rollback exists: a killed run can leave tagged rows behind.
  // Sweep them before inserting this run's fixtures.
  await sweepTaggedFixtures();

  const cardL4 = await mongo.collection('flashcards').insertOne({
    hskLevel: 4,
    hanzi: '测试卡甲',
    pinyin: 'cèshìkǎjiǎ',
    meaning: 'flow-fixture-A',
    exampleSentence: '这是测试卡甲。',
    tags: ['flow-fixture', TEST_TAG],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const cardL5 = await mongo.collection('flashcards').insertOne({
    hskLevel: 5,
    hanzi: '测试卡乙',
    pinyin: 'cèshìkǎyǐ',
    meaning: 'flow-fixture-B',
    exampleSentence: '这是测试卡乙。',
    tags: ['flow-fixture', TEST_TAG],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  cardL4Id = cardL4.insertedId.toString();
  cardL5Id = cardL5.insertedId.toString();
});

after(async () => {
  await sweepTaggedFixtures();
  const users = await prisma.user.findMany({
    where: { email: { in: OWNED_EMAILS } },
    select: { id: true },
  });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app.close();
});

describe('SRS study → feedback → reload-state flow', () => {
  it('returns an empty page with the envelope intact when the page is out of range', async () => {
    const page = await req('GET', '/student/flashcards?hskLevel=4&page=9999&limit=20', undefined, tokenA);
    assert.equal(page.status, 200);
    const body = page.body as BrowseBody;
    assert.deepEqual(body.data, []);
    assert.ok(body.meta.total >= 1);
    assert.equal(body.meta.page, 9999);
  });

  it('keeps concurrent level browses self-consistent (rapid filter switching)', async () => {
    const [l4, l5] = await Promise.all([
      req('GET', `/student/flashcards?hskLevel=4&limit=${PAGE_LIMIT}`, undefined, tokenA),
      req('GET', `/student/flashcards?hskLevel=5&limit=${PAGE_LIMIT}`, undefined, tokenA),
    ]);
    assert.equal(l4.status, 200);
    assert.equal(l5.status, 200);
    // Each response only carries the level it was asked for: a late-arriving
    // response can never paint the other level's words. Client-side ordering
    // (which response wins on screen) is owned by `isStaleResponse` and is
    // covered by `apps/web/scripts/srs-session.test.mjs`.
    const bodyL4 = l4.body as BrowseBody;
    const bodyL5 = l5.body as BrowseBody;
    assert.ok(bodyL4.data.every((row) => row.hskLevel === 4));
    assert.ok(bodyL5.data.every((row) => row.hskLevel === 5));
    assert.ok(!bodyL5.data.some((row) => row.id === cardL4Id));
    assert.ok((await findOwnCard(tokenA, 4, cardL4Id)) !== undefined);
    assert.ok((await findOwnCard(tokenA, 5, cardL5Id)) !== undefined);
  });

  it('persists a review and reloads the identical state on browse and stats', async () => {
    const reviewed = await req('POST', `/student/flashcards/${cardL4Id}/review`, { rating: 4 }, tokenA);
    assert.equal(reviewed.status, 201);
    const reviewedBody = reviewed.body as ReviewBody;
    assert.equal(reviewedBody.data.state.repetitionsCount, 1);

    // Reload 1: the card row carries the exact state the POST returned.
    const row = await findOwnCard(tokenA, 4, cardL4Id);
    assert.ok(row);
    assert.deepEqual(row.state, reviewedBody.data.state);

    // Reload 2: the aggregates reflect the same single review.
    const stats = await req('GET', '/student/flashcards/stats', undefined, tokenA);
    assert.equal(stats.status, 200);
    const statsBody = stats.body as StatsBody;
    assert.equal(statsBody.data.totalReviews, 1);
    assert.equal(statsBody.data.retentionRate, 100);
    assert.equal(statsBody.data.streak, null);
  });

  it('serves a past-due fixture from the due queue, most overdue first', async () => {
    await mongo.collection('user_flashcard_states').insertOne({
      userId: userAId,
      flashcardId: new Types.ObjectId(cardL5Id),
      easeFactor: 2.5,
      repetitionsCount: 1,
      intervalDays: 1,
      nextReviewDate: new Date(Date.now() - 48 * 3600 * 1000),
      lastReviewedAt: new Date(Date.now() - 48 * 3600 * 1000),
      isSavedByUser: false,
      totalReviews: 1,
      correctReviews: 1,
    });
    const due = await req('GET', '/student/flashcards/due', undefined, tokenA);
    assert.equal(due.status, 200);
    const dueBody = due.body as { data: CardRow[] };
    assert.ok(dueBody.data.some((row) => row.id === cardL5Id));
    assert.ok(dueBody.data.length <= 20);
  });

  it('applies a second rating on top of the reloaded state and clears the due queue', async () => {
    const second = await req('POST', `/student/flashcards/${cardL5Id}/review`, { rating: 5 }, tokenA);
    assert.equal(second.status, 201);
    assert.equal((second.body as ReviewBody).data.state.repetitionsCount, 2);

    const due = await req('GET', '/student/flashcards/due', undefined, tokenA);
    assert.ok(!(due.body as { data: CardRow[] }).data.some((row) => row.id === cardL5Id));
  });

  it('documents the observed behaviour of two parallel reviews of one card', async () => {
    const before = await req('GET', '/student/flashcards/stats', undefined, tokenA);
    const [first, second] = await Promise.all([
      req('POST', `/student/flashcards/${cardL4Id}/review`, { rating: 4 }, tokenA),
      req('POST', `/student/flashcards/${cardL4Id}/review`, { rating: 4 }, tokenA),
    ]);
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    // No idempotency key exists in the approved contract, so the server counts
    // both submissions. Double-click protection lives in the client
    // (`canSubmitRating` + ref lock, covered by srs-session.test.mjs) — that is
    // the documented division of labour, not a silent server dedupe.
    const afterStats = await req('GET', '/student/flashcards/stats', undefined, tokenA);
    assert.equal(
      (afterStats.body as StatsBody).data.totalReviews,
      (before.body as StatsBody).data.totalReviews + 2,
    );
  });

  it('keeps two students’ progress mutually invisible on the shared catalog', async () => {
    const rowB = await findOwnCard(tokenB, 4, cardL4Id);
    assert.ok(rowB);
    assert.equal(rowB.state, null);

    const dueB = await req('GET', '/student/flashcards/due', undefined, tokenB);
    assert.deepEqual((dueB.body as { data: CardRow[] }).data, []);

    const statsB = await req('GET', '/student/flashcards/stats', undefined, tokenB);
    const statsBBody = statsB.body as StatsBody;
    assert.equal(statsBBody.data.totalCards, 0);
    assert.equal(statsBBody.data.totalReviews, 0);

    // B reviewing the same shared card creates B's own private state and leaves A's untouched.
    const reviewB = await req('POST', `/student/flashcards/${cardL4Id}/review`, { rating: 3 }, tokenB);
    assert.equal(reviewB.status, 201);
    const rowA = await findOwnCard(tokenA, 4, cardL4Id);
    assert.ok(rowA?.state);
    // A rated this card three times by now (single + parallel pair); B rated it
    // once. Separate counters prove separate states — reading never leaks.
    assert.ok(rowA.state.totalReviews > (reviewB.body as ReviewBody).data.state.totalReviews);
    const statsA = await req('GET', '/student/flashcards/stats', undefined, tokenA);
    assert.ok((statsA.body as StatsBody).data.totalCards >= 1);
  });

  it('rejects a forged session with 401 and a registered code', async () => {
    const forged = await req('GET', '/student/flashcards/stats', undefined, 'invalid.token.here');
    assert.equal(forged.status, 401);
    assert.equal((forged.body as ErrorBody).code, ErrorCode.AUTH_TOKEN_INVALID);
    const missing = await req('GET', '/student/flashcards/stats');
    assert.equal(missing.status, 401);
    assert.equal((missing.body as ErrorBody).code, ErrorCode.AUTH_TOKEN_INVALID);
  });

  it('maps a well-formed but absent id to FLASHCARD_NOT_FOUND', async () => {
    const absent = await req(
      'POST',
      `/student/flashcards/${new Types.ObjectId().toString()}/review`,
      { rating: 0 },
      tokenA,
    );
    assert.equal(absent.status, 404);
    assert.equal((absent.body as ErrorBody).code, ErrorCode.FLASHCARD_NOT_FOUND);
  });
});
