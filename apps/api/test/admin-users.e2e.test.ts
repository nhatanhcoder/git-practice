/**
 * End-to-end checks for the Admin users read slice and the Phase 1 envelope.
 *
 * These run the real Nest application against the real development database — the
 * eight rows `prisma/seed.ts` creates — because what is most likely to be wrong here
 * are the seams: guard ordering, the envelope wrapper, Prisma's citext behaviour,
 * pagination stability. A mocked Prisma would assert my own assumptions back at me
 * and prove none of that.
 *
 * Read-only: nothing below writes to the database.
 *
 * Tokens are minted directly with JWT_ACCESS_SECRET rather than through a login
 * endpoint, because there is no login endpoint yet — `01-auth.md` §12 blocks it on
 * the unapproved RefreshToken table. Token *verification* is what is under test.
 */
import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../dist/src/app.module';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor';
import { AppException } from '../dist/src/common/errors/app.exception';
import { ErrorCode } from '../dist/src/common/errors/error-codes';
import { PrismaService } from '../dist/src/prisma/prisma.service';

const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
let jwt: JwtService;
let prisma: PrismaService;

/** Mirrors main.ts. A drift between the two shows up as a failing envelope test. */
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

async function tokenFor(email: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  assert.ok(user, `seed user ${email} is missing — run: pnpm --filter api db:seed`);
  return jwt.signAsync({ sub: user.id, email, role: user.role });
}

type Res = { status: number; body: any };

async function get(path: string, token?: string): Promise<Res> {
  const res = await fetch(`${base}/${PREFIX}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(PREFIX);
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

  // Port 0: the OS picks a free one, so the suite cannot collide with a server already
  // holding 3001 — which is exactly what happened during the database setup.
  await app.listen(0);
  base = (await app.getUrl()).replace('[::1]', 'localhost');

  jwt = app.get(JwtService);
  prisma = app.get(PrismaService);
});

after(async () => {
  await app?.close();
});

describe('access control', () => {
  it('refuses an unauthenticated request', async () => {
    const res = await get('/admin/users');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'AUTH_TOKEN_INVALID');
  });

  it('refuses a malformed token', async () => {
    const res = await get('/admin/users', 'not-a-jwt');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'AUTH_TOKEN_INVALID');
  });

  it('refuses a token signed with the wrong secret', async () => {
    const forged = await new JwtService({ secret: 'wrong-secret' }).signAsync({ sub: 'x' });
    const res = await get('/admin/users', forged);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'AUTH_TOKEN_INVALID');
  });

  it('refuses an expired token', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@hsk.local' } });
    const expired = await jwt.signAsync({ sub: admin!.id }, { expiresIn: '-1s' });
    const res = await get('/admin/users', expired);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'AUTH_TOKEN_EXPIRED');
  });

  it('refuses a teacher — INV-USERS-01', async () => {
    const res = await get('/admin/users', await tokenFor('teacher@hsk.local'));
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'AUTH_INSUFFICIENT_ROLE');
  });

  it('refuses a suspended account before the role check', async () => {
    const res = await get('/admin/users', await tokenFor('student.suspended@hsk.local'));
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'AUTH_ACCOUNT_SUSPENDED');
  });

  it('refuses a pending account', async () => {
    const res = await get('/admin/users', await tokenFor('teacher.pending@hsk.local'));
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'AUTH_ACCOUNT_PENDING');
  });

  it('leaves /health public', async () => {
    const res = await get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ok');
  });
});

describe('GET /admin/users', () => {
  let admin: string;
  before(async () => {
    admin = await tokenFor('admin@hsk.local');
  });

  it('returns the list envelope with pagination meta', async () => {
    const res = await get('/admin/users', admin);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.deepEqual(Object.keys(res.body).sort(), ['data', 'meta']);
    assert.equal(res.body.meta.page, 1);
    assert.equal(res.body.meta.limit, 20);
    assert.equal(res.body.meta.totalPages, Math.ceil(res.body.meta.total / 20));
  });

  it('never exposes passwordHash — INV-USERS-02', async () => {
    const res = await get('/admin/users', admin);
    assert.ok(!JSON.stringify(res.body).toLowerCase().includes('passwordhash'));
    for (const row of res.body.data) {
      assert.deepEqual(Object.keys(row).sort(), [
        'avatarUrl',
        'createdAt',
        'email',
        'id',
        'lastLoginAt',
        'nickname',
        'role',
        'status',
      ]);
    }
  });

  it('applies role and status filters together — INV-USERS-03', async () => {
    const res = await get('/admin/users?role=teacher&status=pending', admin);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    for (const row of res.body.data) {
      assert.equal(row.role, 'teacher');
      assert.equal(row.status, 'pending');
    }
    assert.equal(res.body.meta.total, res.body.data.length);
  });

  it('rejects an out-of-enum filter instead of widening the set — INV-USERS-04', async () => {
    const res = await get('/admin/users?status=deleted', admin);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.details.status));
  });

  it('rejects an unknown query parameter rather than ignoring it', async () => {
    const res = await get('/admin/users?rolee=admin', admin);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('matches q case-insensitively on email — INV-USERS-05', async () => {
    const res = await get('/admin/users?q=mixed.case', admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].email.toLowerCase(), 'mixed.case@hsk.local');
  });

  it('treats a blank q as not sent — INV-USERS-05', async () => {
    const blank = await get('/admin/users?q=%20%20', admin);
    const none = await get('/admin/users', admin);
    assert.equal(blank.status, 200);
    assert.equal(blank.body.meta.total, none.body.meta.total);
  });

  it('counts before paginating — INV-USERS-06', async () => {
    const res = await get('/admin/users?limit=3', admin);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length <= 3);
    assert.ok(res.body.meta.total > 3, 'seed should provide more than 3 users');
    assert.equal(res.body.meta.totalPages, Math.ceil(res.body.meta.total / 3));
  });

  // Depends on the user table holding still for the duration of the walk. The suites in
  // this directory share one database, and `admin-approval-concurrency` and
  // `admin-user-lifecycle` both create users — run in parallel, this test saw the total
  // move from 7 to 9 mid-walk and failed as if rows had been duplicated. The package
  // script now passes `--test-concurrency=1`; if this ever goes flaky again, check that
  // flag before suspecting the pagination code.
  it('pages without duplicates or gaps — INV-USERS-07', async () => {
    const first = await get('/admin/users?limit=3&page=1', admin);
    const total = first.body.meta.total;
    const seen: string[] = [];
    for (let page = 1; page <= first.body.meta.totalPages; page++) {
      const res = await get(`/admin/users?limit=3&page=${page}`, admin);
      seen.push(...res.body.data.map((u: { id: string }) => u.id));
    }
    assert.equal(seen.length, total);
    assert.equal(new Set(seen).size, total, 'a row appeared on two pages');
  });

  it('caps limit at 100', async () => {
    const res = await get('/admin/users?limit=500', admin);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('returns UTC ISO 8601 timestamps — INV-USERS-18', async () => {
    const res = await get('/admin/users', admin);
    for (const row of res.body.data) {
      assert.match(row.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      assert.ok(row.lastLoginAt === null || row.lastLoginAt.endsWith('Z'));
    }
  });
});

describe('GET /admin/users/:id', () => {
  let admin: string;
  before(async () => {
    admin = await tokenFor('admin@hsk.local');
  });

  it('returns a single object under data, not data.user', async () => {
    const list = await get('/admin/users?limit=1', admin);
    const id = list.body.data[0].id;
    const res = await get(`/admin/users/${id}`, admin);

    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body), ['data']);
    assert.equal(res.body.data.id, id);
    assert.ok(!('user' in res.body.data), 'envelope is { data: {...} } per API_CONVENTIONS.md');
    assert.ok('hskLevelGoal' in res.body.data);
    assert.ok('bio' in res.body.data);
    assert.ok('updatedAt' in res.body.data);
    assert.ok(!('passwordHash' in res.body.data));
  });

  it('404s on a well-formed but absent id — INV-USERS-17', async () => {
    const res = await get('/admin/users/11111111-1111-4111-8111-111111111111', admin);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'USER_NOT_FOUND');
  });

  it('400s on a malformed id rather than letting the driver 500', async () => {
    const res = await get('/admin/users/not-a-uuid', admin);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });
});

describe('error envelope', () => {
  it('is flat — no success flag, no nested error object', async () => {
    const res = await get('/admin/users');
    assert.equal(res.body.statusCode, 401);
    assert.equal(typeof res.body.error, 'string');
    assert.equal(typeof res.body.code, 'string');
    assert.equal(typeof res.body.message, 'string');
    assert.equal(typeof res.body.timestamp, 'string');
    assert.equal(res.body.path, `/${PREFIX}/admin/users`);
    assert.ok(!('success' in res.body));
    assert.ok(!('details' in res.body), 'details appears only on VALIDATION_ERROR');
  });
});
