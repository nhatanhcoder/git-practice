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
 * Foundation/Grammar (S-SELF-2/3) — 02-foundation-grammar.md's invariant gate.
 * Real DBs (Mongo catalog + Postgres accounts/progress) because the seams under
 * test — revision-pinned reads, the unique (userId, contentKind, contentKey)
 * index, A/B ownership isolation, idempotent SET semantics — cannot be proven
 * against mocks.
 *
 * Requires the catalog import (`pnpm --filter api foundation:import`) — the
 * suites assert the audited counts (297 foundation / 76 grammar), so an
 * un-imported database fails loudly instead of passing vacuously.
 *
 * Cleanup deletes only the two students it creates: PG progress rows cascade
 * off the users, and the shared catalog revisions are revision-pinned reads
 * other suites never touch.
 */
const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
let prisma: PrismaService;

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
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app?.close();
});

describe('Foundation — catalog read (F-read)', () => {
  it('serves the audited corpus: 8 groups, exact counts, one revision', async () => {
    const res = await req('GET', '/student/foundation', undefined, aToken);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const { revision, groups } = res.body.data;
    assert.match(revision, /^[0-9a-f]{12}$/, 'revision is the 12-hex import pin');
    const counts = Object.fromEntries(
      Object.entries(groups).map(([g, rows]) => [g, (rows as unknown[]).length]),
    );
    assert.deepEqual(counts, {
      initials: 21,
      finals: 36,
      tones: 4,
      sandhi: 6,
      radicals: 214,
      listening: 6,
      speaking: 6,
      pdfs: 4,
    });
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
  it('lists 76 records with stable order and honest pagination meta', async () => {
    const res = await req('GET', '/student/grammar?limit=50', undefined, aToken);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.meta.total, 76);
    assert.equal(res.body.meta.totalPages, 2);
    const levels = res.body.data.map((g: { level: number }) => g.level);
    const sorted = [...levels].sort((a, b) => a - b);
    assert.deepEqual(levels, sorted, 'level asc within a page');

    const hsk1 = await req('GET', '/student/grammar?hskLevel=1', undefined, aToken);
    assert.equal(hsk1.body.meta.total, 9);
    assert.ok(
      hsk1.body.data.every((g: { level: number }) => g.level === 1),
      'the level filter holds',
    );

    const badLevel = await req('GET', '/student/grammar?hskLevel=99', undefined, aToken);
    assert.equal(badLevel.status, 400, JSON.stringify(badLevel.body));
  });

  it('serves one record; absent ids answer GRAMMAR_NOT_FOUND, not a leak', async () => {
    const one = await req('GET', '/student/grammar/g001', undefined, aToken);
    assert.equal(one.status, 200, JSON.stringify(one.body));
    assert.equal(one.body.data.id, 'g001');
    assert.ok(Array.isArray(one.body.data.tokens), 'tokens stay an array on the wire');

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
      { grammarId: 'g001', studied: true },
      aToken,
    );
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.equal(set.body.data.grammarId, 'g001');

    const bList = await req('GET', '/student/grammar/progress', undefined, bToken);
    assert.ok(
      !bList.body.data.studied.some((s: { grammarId: string }) => s.grammarId === 'g001'),
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
