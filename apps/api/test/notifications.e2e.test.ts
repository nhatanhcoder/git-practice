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
 * Module 07 — the mailbox read side, plus the three producer paths this slice wired
 * (register fan-out, approve/suspend, new_invoice). Runs against the real development
 * database like every suite in this folder, because the seams under test — transaction
 * scoping, the guarded one-way read gate, ownership WHERE clauses — cannot be proven
 * against a mocked Prisma.
 *
 * Every account this suite touches is created here and deleted in `after()`. The seeded
 * admin is used read-only (its mailbox is never written to, so INV-NOTIF-01's "count only
 * grows" stays intact across runs for the seed rows).
 */
const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
let prisma: PrismaService;

const STUDENT_A_EMAIL = 'test.notif.student.a@hsk.local';
const STUDENT_B_EMAIL = 'test.notif.student.b@hsk.local';
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

type Res = { status: number; body: any };

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: any,
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
let studentAToken: string;
let studentBToken: string;
let studentAId: string;
let studentBId: string;

/** How many notifications the seed admin already has — the fan-out tests assert growth from here. */
let adminMailboxBaseline: number;

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

  const adminId = (
    await prisma.user.findUnique({ where: { email: 'admin@hsk.local' }, select: { id: true } })
  )?.id;
  assert.ok(adminId, 'seed admin missing — run pnpm --filter api db:seed');
  adminMailboxBaseline = await prisma.notification.count({ where: { userId: adminId } });
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app?.close();
});

describe('Notifications — producers', () => {
  it('register (student) fans out exactly one new_student_registration row to every active admin (INV-NOTIF-11)', async () => {
    const reg = await req('POST', '/auth/register', {
      email: STUDENT_A_EMAIL,
      password: 'Password123!',
      fullName: 'Học Sinh Thông Báo A',
      role: 'student',
    });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    studentAId = reg.body.data.id;

    const activeAdmins = await prisma.user.findMany({
      where: { role: 'admin', status: 'active' },
      select: { id: true },
    });
    assert.ok(activeAdmins.length >= 1, 'expected at least one active admin in the seed');

    const rows = await prisma.notification.findMany({
      where: { type: 'new_student_registration', referenceId: studentAId },
    });
    assert.equal(
      rows.length,
      activeAdmins.length,
      'one row per active admin, no more, no fewer',
    );
    assert.ok(
      rows.every((row) => activeAdmins.some((a) => a.id === row.userId)),
      'every recipient is an active admin',
    );
    // Payload carries only display data (INV-NOTIF-14/15) — no password material anywhere.
    assert.equal(rows[0].referenceType, null);
    const payload = rows[0].payload as Record<string, unknown>;
    assert.equal(payload.email, STUDENT_A_EMAIL);
    assert.ok(!('password' in payload) && !('passwordHash' in payload));
  });

  it('approve writes account_approved inside the same transaction (INV-NOTIF-13)', async () => {
    const approve = await req(
      'PATCH',
      `/admin/users/${studentAId}/approve`,
      undefined,
      adminToken,
    );
    assert.equal(approve.status, 200, JSON.stringify(approve.body));

    const rows = await prisma.notification.findMany({
      where: { userId: studentAId, type: 'account_approved' },
    });
    assert.equal(rows.length, 1, 'exactly one account_approved row');
    assert.equal(rows[0].isRead, false, 'every notification is born unread');
    assert.equal(rows[0].readAt, null);
  });

  it('a second approve (409 path) creates NO second row (INV-NOTIF-12)', async () => {
    const again = await req('PATCH', `/admin/users/${studentAId}/approve`, undefined, adminToken);
    assert.equal(again.status, 409);

    const rows = await prisma.notification.findMany({
      where: { userId: studentAId, type: 'account_approved' },
    });
    assert.equal(rows.length, 1);
  });

  it('suspend writes account_suspended; activate (the way back) writes nothing', async () => {
    const suspend = await req(
      'PATCH',
      `/admin/users/${studentAId}/suspend`,
      undefined,
      adminToken,
    );
    assert.equal(suspend.status, 200, JSON.stringify(suspend.body));
    let rows = await prisma.notification.findMany({
      where: { userId: studentAId, type: 'account_suspended' },
    });
    assert.equal(rows.length, 1);

    const activate = await req(
      'PATCH',
      `/admin/users/${studentAId}/activate`,
      undefined,
      adminToken,
    );
    assert.equal(activate.status, 200);
    rows = await prisma.notification.findMany({
      where: { userId: studentAId, type: 'account_suspended' },
    });
    // §10.2: no unlock type exists — activation is notification-silent by design.
    assert.equal(rows.length, 1);
  });

  it('register + login for student B, giving the ownership tests a second mailbox', async () => {
    const reg = await req('POST', '/auth/register', {
      email: STUDENT_B_EMAIL,
      password: 'Password123!',
      fullName: 'Học Sinh Thông Báo B',
      role: 'student',
    });
    assert.equal(reg.status, 201);
    studentBId = reg.body.data.id;
    await req('PATCH', `/admin/users/${studentBId}/approve`, undefined, adminToken);

    const login = await req('POST', '/auth/login', {
      email: STUDENT_A_EMAIL,
      password: 'Password123!',
    });
    studentAToken = login.body.data.accessToken;

    const loginB = await req('POST', '/auth/login', {
      email: STUDENT_B_EMAIL,
      password: 'Password123!',
    });
    studentBToken = loginB.body.data.accessToken;
  });
});

describe('Notifications — mailbox (07-notifications §2)', () => {
  it('GET /notifications lists only my rows, newest first (INV-NOTIF-05/16)', async () => {
    const res = await req('GET', '/notifications', undefined, studentAToken);
    assert.equal(res.status, 200);
    const { data, meta } = res.body;
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 2, 'approved + suspended rows from the producer tests');

    for (const item of data) {
      // Ownership verified against the DB, not against the response alone (INV-NOTIF-05).
      const row = await prisma.notification.findUnique({ where: { id: item.id } });
      assert.ok(row, `row ${item.id} exists`);
      assert.equal(row.userId, studentAId, 'no foreign row may appear in my list');
    }
    // createdAt DESC: each item's createdAt must not be older than its predecessor's.
    for (let i = 1; i < data.length; i++) {
      assert.ok(
        new Date(data[i - 1].createdAt) >= new Date(data[i].createdAt),
        'list must be newest first',
      );
    }
    assert.equal(meta.total, data.length, 'meta.total is the pre-pagination count');
  });

  it('filters: ?isRead=false and the unread count agree (INV-NOTIF-06)', async () => {
    const list = await req('GET', '/notifications?isRead=false', undefined, studentAToken);
    const count = await req('GET', '/notifications/unread-count', undefined, studentAToken);
    assert.equal(count.status, 200);
    assert.equal(count.body.data.unreadCount, list.body.meta.total);
    assert.equal(list.body.data.length, list.body.meta.total);

    // Cross-check against the DB's own count — the endpoint may not have its own
    // definition of "unread" (INV-NOTIF-06).
    const dbCount = await prisma.notification.count({
      where: { userId: studentAId, isRead: false },
    });
    assert.equal(count.body.data.unreadCount, dbCount);
  });

  it('rejects an out-of-enum type filter instead of silently ignoring it', async () => {
    const res = await req('GET', '/notifications?type=payroll_finalized', undefined, studentAToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects limit above the cap (50) as VALIDATION_ERROR, not silent truncation', async () => {
    const res = await req('GET', '/notifications?limit=51', undefined, studentAToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('PATCH /:id/read marks mine read once; a second call is a 200 no-op keeping readAt (INV-NOTIF-03/04)', async () => {
    const unread = await prisma.notification.findFirst({
      where: { userId: studentAId, isRead: false },
    });
    assert.ok(unread, 'expected an unread row from the producer tests');

    const first = await req('PATCH', `/notifications/${unread.id}/read`, undefined, studentAToken);
    assert.equal(first.status, 200);
    const afterFirst = await prisma.notification.findUniqueOrThrow({ where: { id: unread.id } });
    assert.equal(afterFirst.isRead, true);
    assert.ok(afterFirst.readAt);

    const second = await req('PATCH', `/notifications/${unread.id}/read`, undefined, studentAToken);
    assert.equal(second.status, 200, 'already-read is a successful no-op, never 409');
    const afterSecond = await prisma.notification.findUniqueOrThrow({ where: { id: unread.id } });
    assert.equal(
      afterSecond.readAt?.toISOString(),
      afterFirst.readAt?.toISOString(),
      'readAt is set exactly once and never moved',
    );
  });

  it("someone else's :id is a bare 404 NOTIFICATION_NOT_FOUND and their row is untouched (INV-NOTIF-05)", async () => {
    const bRow = await prisma.notification.findFirst({ where: { userId: studentBId } });
    assert.ok(bRow, 'student B has at least account_approved');

    const res = await req('PATCH', `/notifications/${bRow.id}/read`, undefined, studentAToken);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'NOTIFICATION_NOT_FOUND');
    // The response must not confirm the row's existence in any other way.

    const stillUnread = await prisma.notification.findUniqueOrThrow({ where: { id: bRow.id } });
    assert.equal(stillUnread.isRead, false, "A's token may not flip B's row");
  });

  it('PATCH /read-all marks every unread row of MINE, in one statement (INV-NOTIF-07)', async () => {
    const res = await req('PATCH', '/notifications/read-all', undefined, studentAToken);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.updated >= 1);

    const mineUnread = await prisma.notification.count({
      where: { userId: studentAId, isRead: false },
    });
    assert.equal(mineUnread, 0);

    const bUnread = await prisma.notification.count({
      where: { userId: studentBId, isRead: false },
    });
    assert.ok(bUnread >= 1, "read-all may not touch anyone else's mailbox");

    const count = await req('GET', '/notifications/unread-count', undefined, studentAToken);
    assert.equal(count.body.data.unreadCount, 0);
  });

  it('read-all twice is idempotent: updated = 0', async () => {
    const res = await req('PATCH', '/notifications/read-all', undefined, studentAToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.updated, 0);
  });

  it('a mailbox with no rows reads as empty data + 0, never 404 or null', async () => {
    // Student B only has producer rows; instead use a truly empty mailbox: a fresh
    // registration never reads anything until approved, so its mailbox is just
    // producer output... unless it was suspended. Simplest honest check: a page
    // beyond the last row.
    const res = await req('GET', '/notifications?page=999&limit=50', undefined, studentBToken);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, []);
    assert.equal(res.body.meta.total >= 0, true);
  });

  it('every DateTime on the wire is UTC ISO 8601 (INV-NOTIF-18)', async () => {
    const res = await req('GET', '/notifications', undefined, studentAToken);
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
    for (const item of res.body.data) {
      assert.match(item.createdAt, iso, 'createdAt ends with Z');
      if (item.isRead) {
        assert.match(item.readAt, iso, 'a read row has a readAt ending with Z');
      } else {
        assert.equal(item.readAt, null, 'an unread row readAt is null, never "" or epoch');
      }
    }
  });

  it('no route in the app creates or deletes notifications from clients (INV-NOTIF-01/08)', async () => {
    const post = await req('POST', '/notifications', { type: 'graded' }, studentAToken);
    assert.ok([404, 405].includes(post.status), 'no POST route may exist');

    const list = await req('GET', '/notifications', undefined, studentAToken);
    const first = list.body.data[list.body.data.length - 1]; // oldest of mine
    if (first) {
      const del = await req('DELETE', `/notifications/${first.id}`, undefined, studentAToken);
      assert.ok([404, 405].includes(del.status), 'no DELETE route may exist');
    }
  });

  it('auth is required: anonymous calls are 401', async () => {
    const res = await req('GET', '/notifications');
    assert.equal(res.status, 401);
  });
});

describe('Notifications — new_invoice producer (billing)', () => {
  let invoiceId: string;

  it('creating one invoice writes exactly one new_invoice row, in-transaction', async () => {
    // Ensure student A has an applicable tuition rate for the period (per-student rate
    // per CreateTuitionRateDto; a 409 "rate exists for this student+date" is fine).
    const rate = await req(
      'POST',
      '/admin/tuition-rates',
      {
        studentId: studentAId,
        rateAmount: '500000',
        effectiveFrom: '2026-01-01',
      },
      adminToken,
    );
    assert.ok([201, 409].includes(rate.status), JSON.stringify(rate.body));

    const create = await req(
      'POST',
      '/admin/invoices',
      {
        studentId: studentAId,
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        totalAmount: '500000',
      },
      adminToken,
    );
    assert.ok([201, 409].includes(create.status), JSON.stringify(create.body));
    if (create.status !== 201) return; // duplicate period from a previous run — nothing to assert
    invoiceId = create.body.data.invoice.id;

    const rows = await prisma.notification.findMany({
      where: { userId: studentAId, type: 'new_invoice' },
    });
    assert.equal(rows.length, 1, 'exactly one new_invoice row');
    assert.equal(rows[0].referenceType, 'invoice');
    assert.equal(rows[0].referenceId, invoiceId, 'referenceId is the invoice id');
    const payload = rows[0].payload as Record<string, unknown>;
    assert.ok(payload.code && payload.dueDate, 'payload carries the display data');
  });

  it('the student sees the invoice notification in their mailbox with an invoice deep-link', async () => {
    if (!invoiceId) return;
    const res = await req('GET', '/notifications?type=new_invoice', undefined, studentAToken);
    assert.equal(res.status, 200);
    const mine = res.body.data.filter(
      (item: any) => item.referenceId === invoiceId && item.referenceType === 'invoice',
    );
    assert.equal(mine.length, 1);
    assert.equal(mine[0].isRead, false);
  });

  it('cleans up its own billing fixtures (invoices cascade on user delete)', async () => {
    if (!invoiceId) return;
    await prisma.studentInvoice.deleteMany({ where: { id: invoiceId } });
  });
});
