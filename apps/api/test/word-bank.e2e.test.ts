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

/**
 * Word bank (S-SRS-6/7) — 02-word-bank.md's invariant gate. Real DB (Mongo for the bank
 * and catalog, Postgres for accounts) because the seams under test — the unique
 * (userId, hanzi) index, ownership scoping, no-state-leak rules — cannot be proven
 * against mocks.
 *
 * The suite creates two fresh students, saves/reads/deletes only its own words, and
 * leaves one catalog fixture behind only when it had to create it (the dev database's
 * flashcards collection is shared with other suites' expectations — A11's importer owns
 * its contents; a deliberately-fabricated hanzi that no other suite references is safe,
 * but a seeded-card assumption is not, so catalog matches are only ever ADDITIVE reads).
 */
const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
let prisma: PrismaService;

const STUDENT_A_EMAIL = 'test.wbank.student.a@hsk.local';
const STUDENT_B_EMAIL = 'test.wbank.student.b@hsk.local';
const OWNED_EMAILS = [STUDENT_A_EMAIL, STUDENT_B_EMAIL];

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

// Test responses have different envelope shapes, asserted per case.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = { status: number; body: any };

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
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
  return { status: res.status, body: await res.json().catch(() => null) };
}

let adminToken: string;
let aToken: string;
let bToken: string;
let aId: string;
let bId: string;

/** A catalog hanzi this suite may freely save/expect — unique enough not to collide with seed data. */
const CATALOG_HANZI = '测试词库甲';
const FABRIC_HANZI = '诶哦呸嗖唔'; // guaranteed absent from the catalog

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

  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });

  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  adminToken = adminLogin.body.data.accessToken;

  for (const [email, name] of [
    [STUDENT_A_EMAIL, 'Học Sinh Kho Từ A'],
    [STUDENT_B_EMAIL, 'Học Sinh Kho Từ B'],
  ] as const) {
    const reg = await req('POST', '/auth/register', {
      email,
      password: 'Password123!',
      fullName: name,
      role: 'student',
    });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    await req('PATCH', `/admin/users/${reg.body.data.id}/approve`, undefined, adminToken);
    const login = await req('POST', '/auth/login', { email, password: 'Password123!' });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    if (email === STUDENT_A_EMAIL) {
      aToken = login.body.data.accessToken;
      aId = reg.body.data.id;
    } else {
      bToken = login.body.data.accessToken;
      bId = reg.body.data.id;
    }
  }
});

after(async () => {
  // Bank rows are Mongo-side but keyed by these PG uuids; deleting the accounts makes the
  // orphan rows unreachable by any ownership-scoped read, and the next run's saves upsert
  // fresh rows for its own new ids. (A cleanup helper on the Mongo model would need the
  // app still open — it is, so do it here while it lives.)
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app?.close();
});

function saveBody(over: Record<string, unknown> = {}) {
  return {
    hanzi: CATALOG_HANZI,
    pinyin: 'cè shì cí kù jiǎ',
    meaning: 'từ giả định cho test kho từ',
    sourceType: 'flashcard_browser',
    ...over,
  };
}

describe('Word bank — save (S-SRS-6)', () => {
  it('saves a word and returns the bank row; a smuggled userId is rejected outright (INV-WB-01)', async () => {
    // forbidNonWhitelisted rejects the smuggled field with 400 — stronger than stripping:
    // the row's owner can only ever be the token, and a client trying to set it learns so.
    const smuggle = await req('POST', '/student/word-bank', saveBody({ userId: bId }), aToken);
    assert.equal(smuggle.status, 400, JSON.stringify(smuggle.body));
    assert.equal(smuggle.body.code, 'VALIDATION_ERROR');
    assert.ok(smuggle.body.details.userId, 'the rejection names the forbidden field');

    const res = await req('POST', '/student/word-bank', saveBody(), aToken);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const row = res.body.data.row ?? res.body.data;
    assert.ok(row.id);
    assert.equal(row.hanzi, CATALOG_HANZI);
    assert.equal(row.sourceType, 'flashcard_browser');
    assert.match(row.savedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('re-saving the same hanzi upserts: one row, savedAt bumped, meaning updated (INV-WB-02)', async () => {
    const first = await req('POST', '/student/word-bank', saveBody(), aToken);
    const second = await req(
      'POST',
      '/student/word-bank',
      saveBody({ meaning: 'nghĩa cập nhật lần 2', note: 'ghi chú cá nhân' }),
      aToken,
    );
    assert.equal(second.status, 201, JSON.stringify(second.body));

    const list = await req('GET', '/student/word-bank', undefined, aToken);
    const rows = list.body.data.filter((r: { hanzi: string; id: string }) => r.hanzi === CATALOG_HANZI);
    assert.equal(rows.length, 1, 'the unique (userId, hanzi) index must keep one row');
    assert.equal(rows[0].meaning, 'nghĩa cập nhật lần 2');
    assert.equal(rows[0].note, 'ghi chú cá nhân');
    assert.ok(
      new Date(rows[0].savedAt).getTime() >=
        new Date(first.body.data?.savedAt ?? first.body.data?.row?.savedAt).getTime(),
    );
  });

  it('rejects an invented sourceType instead of storing it (INV-WB-05)', async () => {
    const res = await req(
      'POST',
      '/student/word-bank',
      saveBody({ sourceType: 'dashboard' }),
      aToken,
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects a bookmark with no CJK character', async () => {
    const res = await req('POST', '/student/word-bank', saveBody({ hanzi: 'hello' }), aToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('saving never creates a UserFlashcardState (INV-WB-06)', async () => {
    // The save in the first test ran against a hanzi that may or may not exist in the
    // catalog; either way, the bank write alone must produce zero states.
    const before = await countStates(aId);
    await req('POST', '/student/word-bank', saveBody({ hanzi: FABRIC_HANZI }), aToken);
    const after = await countStates(aId);
    assert.equal(after, before, 'a save is a bookmark, never an SRS write');
  });
});

describe('Word bank — list & ownership (S-SRS-7, INV-WB-03)', () => {
  it("B's list shows none of A's words", async () => {
    const bList = await req('GET', '/student/word-bank', undefined, bToken);
    assert.equal(bList.status, 200);
    const leaked = bList.body.data.filter((r: { hanzi: string; id: string }) => r.hanzi === CATALOG_HANZI);
    assert.equal(leaked.length, 0, "A's bookmark must never appear in B's bank");
    assert.equal(bList.body.meta.total, bList.body.data.length);
  });

  it("B deleting A's row id is a bare 404 and A's row survives (INV-WB-03)", async () => {
    const aList = await req('GET', '/student/word-bank', undefined, aToken);
    const aRow = aList.body.data.find((r: { hanzi: string; id: string }) => r.hanzi === CATALOG_HANZI);
    assert.ok(aRow, 'A has the saved word from the previous tests');

    const res = await req('DELETE', `/student/word-bank/${aRow.id}`, undefined, bToken);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'WORD_BANK_NOT_FOUND');

    const stillThere = await req('GET', '/student/word-bank', undefined, aToken);
    assert.ok(
      stillThere.body.data.some((r: { hanzi: string; id: string }) => r.id === aRow.id),
      "B's delete attempt must not touch A's row",
    );
  });

  it('a non-student token is rejected by the role guard', async () => {
    const res = await req('GET', '/student/word-bank', undefined, adminToken);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'AUTH_INSUFFICIENT_ROLE');
  });
});

describe('Word bank — review session (S-SRS-7)', () => {
  it('a banked word WITH a catalog match hydrates to a real card id; without one, id is null (INV-WB-07)', async () => {
    // Guarantee the catalog side: insert a card for CATALOG_HANZI if none exists (the
    // suite owns this hanzi; A11's importer never wrote it).
    const cardId = await ensureCatalogCard();
    await req('POST', '/student/word-bank', saveBody({ hanzi: FABRIC_HANZI }), aToken);

    const res = await req('GET', '/student/word-bank/review', undefined, aToken);
    assert.equal(res.status, 200);
    const byHanzi = new Map(res.body.data.map((c: { hanzi: string; id: string | null; state: unknown }) => [c.hanzi, c]));

    const matched = byHanzi.get(CATALOG_HANZI);
    assert.ok(matched, 'the catalog-backed bookmark is in the session');
    assert.equal(matched.id, cardId, 'hydrated to the catalog card id, module-01 shape');

    const unreviewable = byHanzi.get(FABRIC_HANZI);
    assert.ok(unreviewable, 'the unmatched bookmark is listed too');
    assert.equal(unreviewable.id, null, 'no catalog row ⇒ no card id to send to SM-2');
    assert.equal(unreviewable.state, null);
  });

  it('deleting a banked word with SRS state leaves the state intact (INV-WB-08)', async () => {
    const cardId = await ensureCatalogCard();
    // Give the state a real row by reviewing the catalog card once through module 01.
    const review = await req(
      'POST',
      `/student/flashcards/${cardId}/review`,
      { rating: 4 },
      aToken,
    );
    assert.ok([200, 201].includes(review.status), JSON.stringify(review.body));

    const list = await req('GET', '/student/word-bank', undefined, aToken);
    const row = list.body.data.find((r: { hanzi: string; id: string }) => r.hanzi === CATALOG_HANZI);
    assert.ok(row);

    const del = await req('DELETE', `/student/word-bank/${row.id}`, undefined, aToken);
    assert.equal(del.status, 204);

    const statesAfter = await countStates(aId);
    assert.ok(statesAfter >= 1, 'the SRS state survives the bookmark deletion');
  });
});

/** Direct Mongo count through the app's registered model — the DB is the witness, not the API. */
async function countStates(userId: string): Promise<number> {
  const { getModelToken } = await import('@nestjs/mongoose');
  const model = app.get(getModelToken('UserFlashcardState'), { strict: false });
  if (!model) throw new Error('UserFlashcardState model not resolvable');
  return model.countDocuments({ userId });
}

/**
 * Ensures a catalog card exists for CATALOG_HANZI and returns its id. The suite owns this
 * hanzi — A11's importer only wrote real HSK words, so an insert here can never collide
 * with seeded expectations.
 */
async function ensureCatalogCard(): Promise<string> {
  const { getModelToken } = await import('@nestjs/mongoose');
  const model = app.get(getModelToken('Flashcard'), { strict: false });
  if (!model) throw new Error('Flashcard model not resolvable');
  const existing = await model.findOne({ hanzi: CATALOG_HANZI });
  if (existing) return String(existing._id);
  const created = await model.create({
    hskLevel: 3,
    hanzi: CATALOG_HANZI,
    pinyin: 'cè shì cí kù jiǎ',
    meaning: 'từ giả định cho test kho từ',
    exampleSentence: null,
    examplePinyin: null,
    exampleMeaning: null,
    audioUrl: null,
    tags: ['test-fixture'],
    source: 'test-suite',
  });
  return String(created._id);
}
