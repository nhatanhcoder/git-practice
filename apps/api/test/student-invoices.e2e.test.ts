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
import { InvoiceStatus, NotificationType, TuitionBillingCycle } from '@prisma/client';

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

type Res = {
  status: number;
  headers: Headers;
  body: any;
};

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: any,
  token?: string,
  rawQuery?: string,
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers['authorization'] = `Bearer ${token}`;

  const res = await fetch(`${base}/${PREFIX}${path}${rawQuery ?? ''}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: res.status,
    headers: res.headers,
    body: await res.json().catch(() => null),
  };
}

let app: INestApplication;
let base: string;
let prisma: PrismaService;

let adminToken: string;
let studentAToken: string;
let studentBToken: string;
let studentAId: string;
let studentBId: string;
const createdUserIds: string[] = [];
const createdInvoiceIds: string[] = [];
let invoiceA1: string; // student A, unpaid
let invoiceA2: string; // student A, partially paid
let invoiceAVoided: string; // student A, voided — must be invisible to A
let invoiceB1: string; // student B, unpaid

describe('Student Invoices (SCOPE-BILL-01, INV-BILLING-33/34)', () => {
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

    const loginAdmin = await req('POST', '/auth/login', {
      email: 'admin@hsk.local',
      password: 'Password123!',
    });
    adminToken = loginAdmin.body.data.accessToken;

    const ts = Date.now();
    async function makeStudent(label: string): Promise<{ id: string; token: string }> {
      const reg = await req('POST', '/auth/register', {
        email: `${label}.${ts}@hsk.local`,
        password: 'Password123!',
        fullName: `Student ${label} ${ts}`,
        role: 'student',
      });
      const id = reg.body.data.id;
      createdUserIds.push(id);
      await req('PATCH', `/admin/users/${id}/approve`, undefined, adminToken);
      const login = await req('POST', '/auth/login', {
        email: `${label}.${ts}@hsk.local`,
        password: 'Password123!',
      });
      return { id, token: login.body.data.accessToken };
    }

    const a = await makeStudent('invoicea');
    studentAId = a.id;
    studentAToken = a.token;
    const b = await makeStudent('invoiceb');
    studentBId = b.id;
    studentBToken = b.token;

    // Tuition rate rows exist only because INV-BILLING-08 requires one for a
    // student to be invoiceable; this suite reads, it does not create invoices
    // through the admin write path.
    await prisma.studentTuitionRate.create({
      data: {
        studentId: studentAId,
        rateAmount: 1500000,
        billingCycle: TuitionBillingCycle.monthly,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    // Direct DB inserts (not POST /admin/invoices): this suite tests the read
    // path, and seeding through the write path would couple it to code this
    // task did not touch. Plain numbers follow prisma/seed.ts's own usage —
    // Prisma coerces integer-valued money into the Decimal(12,2) columns.
    // Each invoice gets its own month: @@unique([studentId, periodStart,
    // periodEnd]) (INV-BILLING-28) would otherwise reject the void seed, which
    // reuses the period of the first invoice.
    const periods = [
      ['2026-09-01', '2026-09-30'],
      ['2026-10-01', '2026-10-31'],
      ['2026-11-01', '2026-11-30'],
      ['2026-12-01', '2026-12-31'],
    ];
    let periodIdx = 0;
    async function seedInvoice(studentId: string, status: InvoiceStatus, paid: number) {
      const [ps, pe] = periods[periodIdx++ % periods.length];
      const inv = await prisma.studentInvoice.create({
        data: {
          code: `INV-SEED-${Math.floor(Math.random() * 900000 + 100000)}`,
          studentId,
          periodStart: new Date(`${ps}T00:00:00.000Z`),
          periodEnd: new Date(`${pe}T00:00:00.000Z`),
          dueDate: new Date('2026-12-07T00:00:00.000Z'),
          totalAmount: 1500000,
          paidAmount: paid,
          status,
        },
      });
      createdInvoiceIds.push(inv.id);
      return inv.id;
    }

    invoiceA1 = await seedInvoice(studentAId, InvoiceStatus.unpaid, 0);
    invoiceA2 = await seedInvoice(studentAId, InvoiceStatus.partially_paid, 500000);
    invoiceAVoided = await seedInvoice(studentAId, InvoiceStatus.void, 0);
    invoiceB1 = await seedInvoice(studentBId, InvoiceStatus.unpaid, 0);

    // One payment on invoiceA2 so the detail's payments[] has content to order.
    await prisma.tuitionPayment.create({
      data: {
        invoiceId: invoiceA2,
        amount: 500000,
        paidAt: new Date('2026-09-18T03:00:00.000Z'),
        paymentMethod: 'bank_transfer',
        transactionReference: 'FT-SEED-STUDENT-INV',
        recordedBy: (await prisma.user.findUnique({ where: { email: 'admin@hsk.local' } }))!.id,
      },
    });
  });

  after(async () => {
    try {
      await prisma.tuitionPayment.deleteMany({
        where: { invoiceId: { in: createdInvoiceIds } },
      });
      await prisma.studentInvoice.deleteMany({ where: { id: { in: createdInvoiceIds } } });
      await prisma.notification.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.studentTuitionRate.deleteMany({ where: { studentId: studentAId } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  it('GET /student/invoices lists only own non-void invoices (INV-BILLING-33, S-BILL-1)', async () => {
    const res = await req('GET', '/student/invoices', undefined, studentAToken);
    assert.equal(res.status, 200);
    const ids = res.body.data.map((i: any) => i.id);
    assert.ok(ids.includes(invoiceA1), 'own unpaid invoice is listed');
    assert.ok(ids.includes(invoiceA2), 'own partially paid invoice is listed');
    assert.ok(!ids.includes(invoiceAVoided), 'voided invoice is hidden from the student');
    assert.ok(!ids.includes(invoiceB1), "another student's invoice never appears");
    // Ownership is asserted through the id set, not a `studentId` field — the
    // response deliberately carries none (INV-BILLING-34, see the test below).
    assert.equal(res.body.meta.total, 2, 'exactly the two non-void A invoices');
    assert.equal(ids.length, 2);
  });

  it('GET /student/invoices ignores a ?studentId= query param — filter is token-only (INV-BILLING-33)', async () => {
    // Student A asks for student B's list. The param is not part of
    // ListMyInvoicesQuery, so forbidNonWhitelisted answers VALIDATION_ERROR —
    // proving the param cannot influence the WHERE even before it is built.
    const res = await req('GET', '/student/invoices', undefined, studentAToken, `?studentId=${studentBId}`);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(res.body.details && res.body.details.studentId, 'the rejected param is named');
  });

  it('GET /student/invoices money fields are decimal strings and outstanding is server-derived (INV-BILLING-16, ADR-010)', async () => {
    const res = await req('GET', '/student/invoices', undefined, studentAToken);
    const inv = res.body.data.find((i: any) => i.id === invoiceA2);
    assert.equal(inv.totalAmount, '1500000.00');
    assert.equal(inv.paidAmount, '500000.00');
    assert.equal(inv.outstandingAmount, '1000000.00', 'total − paid, computed by the server');
  });

  it('GET /student/invoices/:id returns own detail with embedded payments[] (S-BILL-2)', async () => {
    const res = await req('GET', `/student/invoices/${invoiceA2}`, undefined, studentAToken);
    assert.equal(res.status, 200);
    const inv = res.body.data.invoice;
    assert.equal(inv.id, invoiceA2);
    assert.equal(inv.payments.length, 1);
    assert.equal(inv.payments[0].amount, '500000.00');
    assert.equal(inv.payments[0].paymentMethod, 'bank_transfer');
    assert.ok(inv.payments[0].recordedBy && typeof inv.payments[0].recordedBy.name === 'string');
    assert.ok(inv.payments[0].recordedBy.id, 'recordedBy carries the admin id + display name only');
  });

  it("GET /student/invoices/:id answers 404 INVOICE_NOT_FOUND for another student's invoice (INV-BILLING-33)", async () => {
    const res = await req('GET', `/student/invoices/${invoiceB1}`, undefined, studentAToken);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'INVOICE_NOT_FOUND');
  });

  it('GET /student/invoices/:id answers 404 for a voided invoice of the student (void is invisible)', async () => {
    const res = await req('GET', `/student/invoices/${invoiceAVoided}`, undefined, studentAToken);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'INVOICE_NOT_FOUND');
  });

  it('GET /student/invoices/:id answers 404 for a malformed id, without hitting the DB', async () => {
    const res = await req('GET', '/student/invoices/not-a-uuid', undefined, studentAToken);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'INVOICE_NOT_FOUND');
  });

  it('student invoice responses carry no email or student identity fields (INV-BILLING-34)', async () => {
    const list = await req('GET', '/student/invoices', undefined, studentAToken);
    for (const inv of list.body.data) {
      assert.equal(inv.studentEmail, undefined, 'list item leaks email');
      assert.equal(inv.studentName, undefined, 'list item carries studentName — admin-facing field');
    }
    const detail = await req('GET', `/student/invoices/${invoiceA2}`, undefined, studentAToken);
    const inv = detail.body.data.invoice;
    assert.equal(inv.studentEmail, undefined, 'detail leaks email');
    assert.equal(inv.studentId, undefined, 'detail leaks studentId — the reader already knows who they are');
    assert.equal(JSON.stringify(inv.payments[0].recordedBy).includes('@'), false, 'recordedBy leaks an email');
  });

  it('GET /student/invoices is student-only — admin and teacher tokens are rejected (RBAC_MATRIX)', async () => {
    const adminRes = await req('GET', '/student/invoices', undefined, adminToken);
    assert.equal(adminRes.status, 403, 'admin may not use the student route');

    const ts = Date.now();
    const regT = await req('POST', '/auth/register', {
      email: `t.inv.${ts}@hsk.local`,
      password: 'Password123!',
      fullName: `Teacher ${ts}`,
      role: 'teacher',
    });
    createdUserIds.push(regT.body.data.id);
    await req('PATCH', `/admin/users/${regT.body.data.id}/approve`, undefined, adminToken);
    const loginT = await req('POST', '/auth/login', {
      email: `t.inv.${ts}@hsk.local`,
      password: 'Password123!',
    });
    const teacherRes = await req('GET', '/student/invoices', undefined, loginT.body.data.accessToken);
    assert.equal(teacherRes.status, 403, 'teacher may not use the student route');
  });

  it('status filter narrows within own invoices; requesting status=void still hides void (SCOPE-BILL-01)', async () => {
    const unpaid = await req('GET', '/student/invoices', undefined, studentAToken, '?status=unpaid');
    assert.equal(unpaid.status, 200);
    assert.equal(unpaid.body.data.length, 1);
    assert.equal(unpaid.body.data[0].id, invoiceA1);

    const voidReq = await req('GET', '/student/invoices', undefined, studentAToken, '?status=void');
    assert.equal(voidReq.status, 200);
    assert.equal(voidReq.body.data.length, 0, 'voided invoices stay hidden even when asked for');
  });
});
