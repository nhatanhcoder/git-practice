import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import cookieParser from 'cookie-parser';
import { AppModule } from '../dist/src/app.module';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor';
import { AppException } from '../dist/src/common/errors/app.exception';
import { ErrorCode } from '../dist/src/common/errors/error-codes';
import { PrismaService } from '../dist/src/prisma/prisma.service';

/**
 * Foundation/Grammar (S-SELF-2/3) — 02-foundation-grammar.md's invariant gate.
 * Real DBs (Mongo catalog + Postgres accounts/progress) because the seams under
 * test — revision-pinned reads, the unique (userId, contentKind, contentKey)
 * index, A/B ownership isolation, idempotent SET semantics — cannot be proven
 * against mocks.
 *
 * Own fixtures only (placement/word-bank discipline): a fixed `foundation-e2e`
 * revision with a handful of records, created in `before()` and deleted in
 * `after()`. Never the imported corpus — CI runs disposable databases where no
 * import has ever run, and leaning on shared rows is exactly what API-012 and
 * DEBT-004 forbid. The full-corpus shape (297/76 audited counts) is pinned by
 * `test/foundation-extract.test.ts`, which needs no database at all.
 *
 * PG progress rows cascade off the two owned students on user delete.
 */
const PREFIX = 'api/v1';
const E2E_REVISION = 'foundation-e2e';

let app: INestApplication;
let base: string;
let prisma: PrismaService;
let mongo: Connection;

const STUDENT_A_EMAIL = 'test.found.student.a@hsk.local';
const STUDENT_B_EMAIL = 'test.found.student.b@hsk.local';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = { status: number; body: any };

async function req(
  method: 'GET' | 'PUT' | 'POST' | 'PATCH' | 'DELETE',
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

async function seedCatalogFixtures(): Promise<void> {
  await mongo.collection('foundation_items').deleteMany({ revision: E2E_REVISION });
  await mongo.collection('grammar_items').deleteMany({ revision: E2E_REVISION });
  await mongo.collection('content_revisions').deleteMany({ revision: E2E_REVISION });

  const F = (group: string, key: string, data: Record<string, unknown>) => ({
    revision: E2E_REVISION,
    group,
    key,
    data,
  });
  await mongo.collection('foundation_items').insertMany([
    F('initials', 'b', { id: 'ini-e2e-b', sound: 'b', ipa: '[p]', hanzi: '爸', pinyin: 'bà', vi: 'bố', group: 'Môi' }),
    F('initials', 'p', { id: 'ini-e2e-p', sound: 'p', ipa: '[pʰ]', hanzi: '跑', pinyin: 'pǎo', vi: 'chạy', group: 'Môi' }),
    F('finals', 'a', { id: 'fin-e2e-a', sound: 'a', ipa: '[a]', hanzi: '八', pinyin: 'bā', vi: 'tám', group: 'Đơn' }),
    F('tones', '1', { id: 1, name: 'Thanh 1', mark: 'ā', contour: '55', pitch: 'cao bằng', desc: 'giữ cao', hanzi: '妈', pinyin: 'mā', vi: 'mẹ', path: '8,12 92,12' }),
    F('sandhi', 's-e2e', { id: 's-e2e', title: 'quy tắc thử', rule: 'quy tắc' }),
    F('radicals', '1', { no: 1, char: '一', strokes: 1, pinyin: 'yī', meaning: 'một', hanViet: 'Nhất' }),
    F('radicals', '2', { no: 2, char: '丨', strokes: 1, pinyin: 'gǔn', meaning: 'nét sổ', hanViet: 'Cổn' }),
    F('listening', 'l-e2e', { id: 'l-e2e', title: 'nghe thử', transcript: 'nǐ hǎo', vi: 'xin chào', level: 1 }),
    F('speaking', 'sp-e2e', { id: 'sp-e2e', prompt: '你好', pinyin: 'nǐ hǎo', vi: 'xin chào', focus: 'thanh điệu', level: 1 }),
  ]);
  const G = (key: string, level: number, category: string) => ({
    revision: E2E_REVISION,
    key,
    level,
    category,
    data: {
      id: key, level, category, name: `điểm ${key}`, formula: 'A + B', hanzi: '我爱你',
      pinyin: 'wǒ ài nǐ', vi: 'tôi yêu bạn', note: 'ghi chú', key: '爱', tokens: ['我', '爱', '你'], frequency: 'cao',
    },
  });
  await mongo.collection('grammar_items').insertMany([
    G('g-e2e-1', 1, 'Trật tự câu'),
    G('g-e2e-2', 2, 'Trợ từ'),
  ]);
  const now = new Date();
  await mongo.collection('content_revisions').insertMany([
    { name: 'foundation', revision: E2E_REVISION, sourceHash: 'e2e', counts: {}, importedAt: now },
    { name: 'grammar', revision: E2E_REVISION, sourceHash: 'e2e', counts: {}, importedAt: now },
  ]);
}

async function cleanCatalogFixtures(): Promise<void> {
  await mongo.collection('foundation_items').deleteMany({ revision: E2E_REVISION });
  await mongo.collection('grammar_items').deleteMany({ revision: E2E_REVISION });
  await mongo.collection('content_revisions').deleteMany({ revision: E2E_REVISION });
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
  // A killed run may leave this revision behind (no cross-DB transaction can
  // prevent it) — sweep before seeding so the run starts deterministic.
  await cleanCatalogFixtures();
  await seedCatalogFixtures();

  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  adminToken = adminLogin.body.data.accessToken;

  for (const [email, name] of [
    [STUDENT_A_EMAIL, 'Hoc Sinh Nen Tang A'],
    [STUDENT_B_EMAIL, 'Hoc Sinh Nen Tang B'],
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
    if (email === STUDENT_A_EMAIL) aToken = login.body.data.accessToken;
    else bToken = login.body.data.accessToken;
  }
});

after(async () => {
  // Own fixtures only — the shared catalog (if any) is never touched.
  await cleanCatalogFixtures();
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app?.close();
});

describe('Foundation — catalog read (F-read)', () => {
  it('serves the pinned revision with all 8 groups, source fields verbatim', async () => {
    const res = await req('GET', '/student/foundation', undefined, aToken);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const { revision, groups } = res.body.data;
    assert.equal(revision, E2E_REVISION, 'reads pin the seeded revision');
    assert.deepEqual(
      Object.keys(groups).sort(),
      ['finals', 'initials', 'listening', 'pdfs', 'radicals', 'sandhi', 'speaking', 'tones'],
    );
    assert.deepEqual(
      groups.initials.map((s: { sound: string }) => s.sound).sort(),
      ['b', 'p'],
    );
    assert.deepEqual(groups.pdfs, [], 'groups with no fixture rows read as empty, not missing');
  });

  it('keeps source fields verbatim: no invented variants, tone geometry is coordinates', async () => {
    const res = await req('GET', '/student/foundation', undefined, aToken);
    const { groups } = res.body.data;
    const r1 = groups.radicals.find((r: { no: number }) => r.no === 1);
    assert.ok(r1, 'radical no=1 exists');
    assert.ok(!('variants' in r1), 'radicals carry no invented `variants`');
    assert.ok(!('examples' in r1), 'radicals carry no invented examples');
    const t1 = groups.tones.find((t: { id: number }) => t.id === 1);
    assert.ok(t1, 'tone 1 exists');
    assert.match(
      t1.path,
      /^[\d.,\s]+$/,
      'tone path is numeric coordinate pairs, not an SVG path',
    );
    assert.ok(!t1.path.startsWith('M'), 'tone path is not the mock SVG invention');
  });

  it('rejects anonymous reads: the catalog is behind the student login', async () => {
    const res = await req('GET', '/student/foundation');
    assert.equal(res.status, 401, JSON.stringify(res.body));
  });
});

describe('Foundation — studied-state (F-progress / F-save)', () => {
  it('sets, reads, and unsets one row; repeating a body is a no-op (D3 idempotent SET)', async () => {
    const first = await req(
      'PUT',
      '/student/foundation/progress',
      { kind: 'pinyin', key: 'b', studied: true },
      aToken,
    );
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.deepEqual(
      { kind: first.body.data.kind, key: first.body.data.key, studied: first.body.data.studied },
      { kind: 'pinyin', key: 'b', studied: true },
    );
    assert.match(first.body.data.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

    const repeat = await req(
      'PUT',
      '/student/foundation/progress',
      { kind: 'pinyin', key: 'b', studied: true },
      aToken,
    );
    assert.equal(repeat.status, 200, JSON.stringify(repeat.body));

    const list = await req('GET', '/student/foundation/progress', undefined, aToken);
    const mine = list.body.data.studied.filter(
      (s: { kind: string; key: string }) => s.kind === 'pinyin' && s.key === 'b',
    );
    assert.equal(mine.length, 1, 'the unique index keeps exactly one row');

    const unset = await req(
      'PUT',
      '/student/foundation/progress',
      { kind: 'pinyin', key: 'b', studied: false },
      aToken,
    );
    assert.equal(unset.status, 200, JSON.stringify(unset.body));
    assert.equal(unset.body.data.studied, false);

    // An explicitly unmarked row must not read back as studied.
    const afterUnset = await req('GET', '/student/foundation/progress', undefined, aToken);
    assert.ok(
      !afterUnset.body.data.studied.some(
        (s: { kind: string; key: string; studied: boolean }) =>
          s.kind === 'pinyin' && s.key === 'b' && s.studied === true,
      ),
      'unmarked rows never read back as studied',
    );
  });

  it('isolates learners: B never sees A’s rows (service-level ownership)', async () => {
    await req(
      'PUT',
      '/student/foundation/progress',
      { kind: 'radicals', key: '1', studied: true },
      aToken,
    );
    const bList = await req('GET', '/student/foundation/progress', undefined, bToken);
    assert.equal(bList.status, 200, JSON.stringify(bList.body));
    assert.ok(
      !bList.body.data.studied.some(
        (s: { kind: string; key: string }) => s.kind === 'radicals' && s.key === '1',
      ),
      'B’s list must not contain A’s row',
    );
  });

  it('rejects unknown kind/key and malformed bodies with VALIDATION_ERROR', async () => {
    const badKind = await req(
      'PUT',
      '/student/foundation/progress',
      { kind: 'pdfs', key: 'p1', studied: true },
      aToken,
    );
    assert.equal(badKind.status, 400, JSON.stringify(badKind.body));
    assert.equal(badKind.body.code, 'VALIDATION_ERROR');

    const badKey = await req(
      'PUT',
      '/student/foundation/progress',
      { kind: 'radicals', key: '9999', studied: true },
      aToken,
    );
    assert.equal(badKey.status, 400, JSON.stringify(badKey.body));
    assert.equal(badKey.body.code, 'VALIDATION_ERROR');

    const smuggle = await req(
      'PUT',
      '/student/foundation/progress',
      // forbidNonWhitelisted: the owner can only ever be the token.
      { kind: 'pinyin', key: 'a', studied: true, userId: 'someone-else' },
      aToken,
    );
    assert.equal(smuggle.status, 400, JSON.stringify(smuggle.body));
    assert.equal(smuggle.body.code, 'VALIDATION_ERROR');
    assert.ok(smuggle.body.details.userId, 'the rejection names the forbidden field');
  });
});

describe('Grammar — list and detail (G-read)', () => {
  it('lists fixtures with stable order and honest pagination meta', async () => {
    const res = await req('GET', '/student/grammar?limit=50', undefined, aToken);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.meta.total, 2);
    assert.equal(res.body.meta.totalPages, 1);
    const levels = res.body.data.map((g: { level: number }) => g.level);
    assert.deepEqual(levels, [1, 2], 'level asc');

    const hsk1 = await req('GET', '/student/grammar?hskLevel=1', undefined, aToken);
    assert.equal(hsk1.body.meta.total, 1);
    assert.ok(
      hsk1.body.data.every((g: { level: number }) => g.level === 1),
      'the level filter holds',
    );

    const cat = await req(
      'GET',
      `/student/grammar?category=${encodeURIComponent('Trợ từ')}`,
      undefined,
      aToken,
    );
    assert.equal(cat.body.meta.total, 1);
    assert.equal(cat.body.data[0].id, 'g-e2e-2');

    // Pinyin folds diacritics: bare-ASCII queries match marked pinyin.
    const folded = await req('GET', '/student/grammar?search=wo%20ai', undefined, aToken);
    assert.ok(
      folded.body.data.some((g: { id: string }) => g.id === 'g-e2e-1'),
      'unmarked query must match marked pinyin',
    );

    const badLevel = await req('GET', '/student/grammar?hskLevel=99', undefined, aToken);
    assert.equal(badLevel.status, 400, JSON.stringify(badLevel.body));
  });

  it('serves one record; absent ids answer GRAMMAR_NOT_FOUND, not a leak', async () => {
    const one = await req('GET', '/student/grammar/g-e2e-1', undefined, aToken);
    assert.equal(one.status, 200, JSON.stringify(one.body));
    assert.equal(one.body.data.id, 'g-e2e-1');
    assert.ok(!('tokens' in one.body.data), 'the reorder answer never rides list/detail');

    const missing = await req('GET', '/student/grammar/gx-no-such', undefined, aToken);
    assert.equal(missing.status, 404, JSON.stringify(missing.body));
    assert.equal(missing.body.code, 'GRAMMAR_NOT_FOUND');
  });
});

describe('Grammar — studied-state (G-progress / G-save)', () => {
  it('sets and isolates one grammar row; unknown ids 404', async () => {
    const set = await req(
      'PUT',
      '/student/grammar/progress',
      { grammarId: 'g-e2e-1', studied: true },
      aToken,
    );
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.equal(set.body.data.grammarId, 'g-e2e-1');

    const bList = await req('GET', '/student/grammar/progress', undefined, bToken);
    assert.ok(
      !bList.body.data.studied.some((s: { grammarId: string }) => s.grammarId === 'g-e2e-1'),
      'B must not see A’s grammar row',
    );

    const unknown = await req(
      'PUT',
      '/student/grammar/progress',
      { grammarId: 'gx-no-such', studied: true },
      aToken,
    );
    assert.equal(unknown.status, 404, JSON.stringify(unknown.body));
    assert.equal(unknown.body.code, 'GRAMMAR_NOT_FOUND');
  });
});

describe('Grammar — reorder practice (G-practice)', () => {
  // Fixture g-e2e-1 carries tokens ['我', '爱', '你'] (seeded above).
  const RIGHT = ['我', '爱', '你'];
  const WRONG = ['你', '爱', '我'];
  const SUBMIT = (submissionId: string, answer: string[]) => ({ submissionId, answer });

  it('serves a shuffled bank without ever revealing the order', async () => {
    const first = await req('GET', '/student/grammar/g-e2e-1/practice', undefined, aToken);
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.data.id, 'g-e2e-1');
    assert.equal(first.body.data.hanziLength, 3);
    assert.deepEqual([...first.body.data.tokens].sort(), [...RIGHT].sort());

    const second = await req('GET', '/student/grammar/g-e2e-1/practice', undefined, aToken);
    assert.deepEqual(second.body.data.tokens, first.body.data.tokens, 'deterministic per point');

    const missing = await req('GET', '/student/grammar/gx-no-such/practice', undefined, aToken);
    assert.equal(missing.status, 404, JSON.stringify(missing.body));
    assert.equal(missing.body.code, 'GRAMMAR_NOT_FOUND');
  });

  it('grades server-side; replay is idempotent, conflict is rejected', async () => {
    const { randomUUID } = await import('node:crypto');
    const sub1 = randomUUID();
    const sub2 = randomUUID();

    const good = await req(
      'POST',
      '/student/grammar/g-e2e-1/practice',
      SUBMIT(sub1, RIGHT),
      aToken,
    );
    assert.equal(good.status, 200, JSON.stringify(good.body));
    assert.equal(good.body.data.correct, true);
    assert.deepEqual(good.body.data.expected, RIGHT);
    assert.equal(good.body.data.attemptCount, 1);
    assert.equal(good.body.data.correctCount, 1);

    const bad = await req(
      'POST',
      '/student/grammar/g-e2e-1/practice',
      SUBMIT(sub2, WRONG),
      aToken,
    );
    assert.equal(bad.status, 200, JSON.stringify(bad.body));
    assert.equal(bad.body.data.correct, false);
    assert.equal(bad.body.data.attemptCount, 2);
    assert.equal(bad.body.data.correctCount, 1);

    // Lost-response replay: same submission, same answer — no double count.
    const replay = await req(
      'POST',
      '/student/grammar/g-e2e-1/practice',
      SUBMIT(sub1, RIGHT),
      aToken,
    );
    assert.equal(replay.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.data.correct, true);
    assert.equal(replay.body.data.attemptCount, 2, 'replay must not insert a second row');
    assert.equal(replay.body.data.correctCount, 1);

    // Same submission, different answer — the retry is corrupt, reject it.
    const conflict = await req(
      'POST',
      '/student/grammar/g-e2e-1/practice',
      SUBMIT(sub1, WRONG),
      aToken,
    );
    assert.equal(conflict.status, 409, JSON.stringify(conflict.body));
    assert.equal(conflict.body.code, 'GRAMMAR_PRACTICE_CONFLICT');
  });

  it('validates the submission envelope and the caller', async () => {
    const { randomUUID } = await import('node:crypto');

    const anon = await req(
      'POST',
      '/student/grammar/g-e2e-1/practice',
      SUBMIT(randomUUID(), RIGHT),
    );
    assert.equal(anon.status, 401, JSON.stringify(anon.body));

    const badUuid = await req(
      'POST',
      '/student/grammar/g-e2e-1/practice',
      SUBMIT('not-a-uuid', RIGHT),
      aToken,
    );
    assert.equal(badUuid.status, 400, JSON.stringify(badUuid.body));
    assert.equal(badUuid.body.code, 'VALIDATION_ERROR');

    const empty = await req(
      'POST',
      '/student/grammar/g-e2e-1/practice',
      SUBMIT(randomUUID(), []),
      aToken,
    );
    assert.equal(empty.status, 400, JSON.stringify(empty.body));

    const smuggle = await req(
      'POST',
      '/student/grammar/g-e2e-1/practice',
      { ...SUBMIT(randomUUID(), RIGHT), userId: 'someone-else' },
      aToken,
    );
    assert.equal(smuggle.status, 400, JSON.stringify(smuggle.body));
    assert.equal(smuggle.body.code, 'VALIDATION_ERROR');
  });

  it('exposes derived per-point counts in progress (no stored counters)', async () => {
    const progress = await req('GET', '/student/grammar/progress', undefined, aToken);
    const stats = progress.body.data.practice.find(
      (s: { grammarId: string }) => s.grammarId === 'g-e2e-1',
    );
    assert.ok(stats, 'practice stats ride along with progress');
    assert.equal(stats.attempts, 2);
    assert.equal(stats.correct, 1);
  });
});
