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

const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
let prisma: PrismaService;

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
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers['authorization'] = `Bearer ${token}`;

  const res = await fetch(`${base}/${PREFIX}${path}`, {
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

let adminToken: string;
let teacherToken: string;
let teacherId: string;
let studentId: string;
let testClassId: string;

describe('Admin & Teacher Live Endpoints (Modules 04, 05, 06, 08)', () => {
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

    // Login admin
    const loginAdmin = await req('POST', '/auth/login', {
      email: 'admin@hsk.local',
      password: 'Password123!',
    });
    adminToken = loginAdmin.body.data.accessToken;

    const ts = Date.now();
    // Register & approve fresh test teacher
    const regT = await req('POST', '/auth/register', {
      email: `t.${ts}@hsk.local`,
      password: 'Password123!',
      fullName: `Teacher ${ts}`,
      role: 'teacher',
    });
    teacherId = regT.body.data.id;
    await req('PATCH', `/admin/users/${teacherId}/approve`, undefined, adminToken);

    const loginTeacher = await req('POST', '/auth/login', {
      email: `t.${ts}@hsk.local`,
      password: 'Password123!',
    });
    teacherToken = loginTeacher.body.data.accessToken;

    // Register & approve fresh test student
    const regS = await req('POST', '/auth/register', {
      email: `s.${ts}@hsk.local`,
      password: 'Password123!',
      fullName: `Student ${ts}`,
      role: 'student',
    });
    studentId = regS.body.data.id;
    await req('PATCH', `/admin/users/${studentId}/approve`, undefined, adminToken);

    // Initial rates from 2026-01-01
    await req(
      'POST',
      '/admin/pay-rates',
      {
        teacherId,
        rateType: 'per_session',
        rateAmount: '350000.00',
        effectiveFrom: '2026-01-01',
      },
      adminToken,
    );

    await req(
      'POST',
      '/admin/tuition-rates',
      {
        studentId,
        rateAmount: '1500000.00',
        effectiveFrom: '2026-01-01',
      },
      adminToken,
    );

    // Create class and enroll student
    const code = `C${Math.floor(Math.random() * 899999 + 100000)}`;
    const cls = await prisma.class.create({
      data: {
        teacherId,
        name: `Lớp Test ${ts}`,
        hskLevel: 4,
        enrollmentCode: code,
        status: 'active',
      },
    });
    testClassId = cls.id;

    await prisma.classEnrollment.create({
      data: {
        classId: testClassId,
        studentId,
        status: 'active',
      },
    });
  });

  after(async () => {
    // Clean up test data
    try {
      if (testClassId) await prisma.class.deleteMany({ where: { id: testClassId } });
      if (teacherId) await prisma.user.deleteMany({ where: { id: teacherId } });
      if (studentId) await prisma.user.deleteMany({ where: { id: studentId } });
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  // --------------------------------------------------------------------------
  // SESSIONS (Module 04 + Teacher Gate 3)
  // --------------------------------------------------------------------------
  describe('Sessions Lifecycle & Review (Module 04)', () => {
    let pendingSessionId: string;

    it('teacher creates, starts, ends, marks attendance, and submits session (GATE 3)', async () => {
      // 1. Teacher creates scheduled session
      const createRes = await req(
        'POST',
        '/teacher/sessions',
        {
          classId: testClassId,
          scheduledDate: '2026-09-08',
          scheduledStart: '14:00',
          scheduledEnd: '15:30',
          topic: 'Live Test Session: Ngữ pháp HSK 4',
        },
        teacherToken,
      );
      assert.equal(createRes.status, 201);
      const sessionId = createRes.body.data.id;
      assert.ok(sessionId);

      // 2. Teacher starts session
      const startRes = await req('PATCH', `/teacher/sessions/${sessionId}/start`, {}, teacherToken);
      assert.equal(startRes.status, 200);
      assert.equal(startRes.body.data.status, 'in_progress');
      assert.ok(startRes.body.data.actualStart);

      // 3. Teacher ends session
      const endRes = await req('PATCH', `/teacher/sessions/${sessionId}/end`, {}, teacherToken);
      assert.equal(endRes.status, 200);
      assert.ok(endRes.body.data.actualEnd);

      // 4. Teacher marks attendance
      const attRes = await req(
        'POST',
        `/teacher/sessions/${sessionId}/attendance`,
        {
          records: [{ studentId, status: 'present' }],
        },
        teacherToken,
      );
      assert.equal(attRes.status, 201);

      // 5. Teacher submits session for review
      const subRes = await req('PATCH', `/teacher/sessions/${sessionId}/submit`, {}, teacherToken);
      assert.equal(subRes.status, 200);
      assert.equal(subRes.body.data.status, 'completed_pending');
      pendingSessionId = sessionId;
    });

    it('GET /admin/sessions/pending returns only completed_pending sessions with attendanceSummary (INV-SESSION-10, 11, 12)', async () => {
      const res = await req('GET', '/admin/sessions/pending', undefined, adminToken);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.meta.total >= 1);

      const item = res.body.data.find((s: any) => s.id === pendingSessionId);
      assert.ok(item, 'Pending session should be returned');
      assert.equal(item.status, 'completed_pending');
      assert.ok(item.attendanceSummary);
      assert.equal(typeof item.attendanceSummary.present, 'number');
      assert.equal(typeof item.attendanceSummary.marked, 'number');
    });

    it('PATCH /admin/sessions/:id/reject fails if rejectionReason is too short or empty (INV-SESSION-04)', async () => {
      const res = await req(
        'PATCH',
        `/admin/sessions/${pendingSessionId}/reject`,
        { rejectionReason: 'ngan' },
        adminToken,
      );
      assert.equal(res.status, 400);
    });

    it('PATCH /admin/sessions/:id/approve successfully approves session and emits notification (INV-SESSION-01, 02, 08)', async () => {
      const res = await req('PATCH', `/admin/sessions/${pendingSessionId}/approve`, {}, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'approved');
      assert.equal(res.body.data.rejectionReason, null);

      // Verify notification created
      const notif = await prisma.notification.findFirst({
        where: {
          userId: teacherId,
          referenceId: pendingSessionId,
          type: 'session_approved',
        },
      });
      assert.ok(notif, 'Notification should be created for teacher');
    });

    it('PATCH /admin/sessions/:id/approve again fails with 409 SESSION_ALREADY_REVIEWED (INV-SESSION-01, 07)', async () => {
      const res = await req('PATCH', `/admin/sessions/${pendingSessionId}/approve`, {}, adminToken);
      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'SESSION_ALREADY_REVIEWED');
    });
  });

  // --------------------------------------------------------------------------
  // PAY RATES & PAYROLL (Module 05)
  // --------------------------------------------------------------------------
  describe('Pay Rates & Payroll Period Lifecycle (Module 05)', () => {
    let createdPeriodId: string;

    it('POST /admin/pay-rates appends a new rate (ADR-008, INV-PAYROLL-16)', async () => {
      const res = await req(
        'POST',
        '/admin/pay-rates',
        {
          teacherId,
          rateType: 'per_session',
          rateAmount: '400000.00',
          effectiveFrom: '2026-10-01',
        },
        adminToken,
      );
      assert.equal(res.status, 201);
      assert.equal(res.body.data.teacherId, teacherId);
      assert.equal(res.body.data.rateAmount, '400000.00');
    });

    it('POST /admin/pay-rates with backdated effectiveFrom fails (INV-PAYROLL-16)', async () => {
      const res = await req(
        'POST',
        '/admin/pay-rates',
        {
          teacherId,
          rateType: 'per_session',
          rateAmount: '420000.00',
          effectiveFrom: '2026-05-01',
        },
        adminToken,
      );
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'RATE_EFFECTIVE_DATE_IN_PAST');
    });

    it('GET /admin/pay-rates returns teacher list with active rate', async () => {
      const res = await req('GET', '/admin/pay-rates', undefined, adminToken);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      const entry = res.body.data.find((e: any) => e.teacherId === teacherId);
      assert.ok(entry);
      assert.ok(entry.current);
    });

    it('POST /admin/payroll creates draft period and calculates total (INV-PAYROLL-01)', async () => {
      const res = await req(
        'POST',
        '/admin/payroll',
        {
          teacherId,
          periodStart: '2026-09-01',
          periodEnd: '2026-09-30',
        },
        adminToken,
      );
      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'draft');
      assert.ok(res.body.data.code);
      createdPeriodId = res.body.data.id;
    });

    it('POST /admin/payroll rejects overlapping period (Q-PAY-3, ADR-012)', async () => {
      const res = await req(
        'POST',
        '/admin/payroll',
        {
          teacherId,
          periodStart: '2026-09-15',
          periodEnd: '2026-10-15',
        },
        adminToken,
      );
      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'PAYROLL_PERIOD_OVERLAP');
    });

    it('GET /admin/payroll/:id returns breakdown per session', async () => {
      const res = await req('GET', `/admin/payroll/${createdPeriodId}`, undefined, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, createdPeriodId);
      assert.ok(Array.isArray(res.body.data.sessions));
    });

    it('DELETE /admin/payroll/:id unassigns sessions and deletes draft period (API-003, ADR-012)', async () => {
      const res = await req('DELETE', `/admin/payroll/${createdPeriodId}`, undefined, adminToken);
      assert.equal(res.status, 200);

      // Verify period is deleted
      const check = await prisma.payrollPeriod.findUnique({ where: { id: createdPeriodId } });
      assert.equal(check, null);
    });
  });

  // --------------------------------------------------------------------------
  // BILLING, TUITION RATES & INVOICES (Module 06)
  // --------------------------------------------------------------------------
  describe('Tuition Rates, Invoices & Payments (Module 06)', () => {
    let testInvoiceId: string;

    it('POST /admin/tuition-rates appends rate (ADR-008, INV-BILLING-04, 05)', async () => {
      const res = await req(
        'POST',
        '/admin/tuition-rates',
        {
          studentId,
          rateAmount: '2000000.00',
          effectiveFrom: '2026-10-01',
        },
        adminToken,
      );
      assert.equal(res.status, 201);
      assert.equal(res.body.data.rate.studentId, studentId);
      assert.equal(res.body.data.rate.rateAmount, '2000000.00');
    });

    it('GET /admin/tuition-rates returns list with current active rate', async () => {
      const res = await req('GET', '/admin/tuition-rates', undefined, adminToken);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      const entry = res.body.data.find((e: any) => e.studentId === studentId);
      assert.ok(entry);
      assert.ok(entry.current);
    });

    it('POST /admin/invoices creates invoice and resolves rate automatically (INV-BILLING-01)', async () => {
      const res = await req(
        'POST',
        '/admin/invoices',
        {
          studentId,
          periodStart: '2026-09-01',
          periodEnd: '2026-09-30',
        },
        adminToken,
      );
      assert.equal(res.status, 201);
      assert.equal(res.body.data.invoice.studentId, studentId);
      assert.equal(res.body.data.invoice.status, 'unpaid');
      assert.ok(res.body.data.invoice.totalAmount);
      testInvoiceId = res.body.data.invoice.id;
    });

    it('GET /admin/invoices/summary calculates receivables and breakdown', async () => {
      const res = await req('GET', '/admin/invoices/summary', undefined, adminToken);
      assert.equal(res.status, 200);
      assert.ok(res.body.data.summary);
      assert.ok(res.body.data.summary.invoiceCount >= 1);
      assert.equal(typeof res.body.data.summary.totalInvoiced, 'string');
    });

    it('POST /admin/invoices/:id/payments records partial payment (INV-BILLING-10, 11, 12)', async () => {
      const res = await req(
        'POST',
        `/admin/invoices/${testInvoiceId}/payments`,
        {
          amount: '500000.00',
          paymentMethod: 'bank_transfer',
          transactionReference: 'TEST-PAY-001',
        },
        adminToken,
      );
      assert.equal(res.status, 201);
      assert.equal(res.body.data.invoice.status, 'partially_paid');
      assert.equal(res.body.data.invoice.paidAmount, '500000.00');
    });

    it('POST /admin/invoices/:id/payments rejects overpayment (INV-BILLING-10, Q-BILL-6)', async () => {
      const res = await req(
        'POST',
        `/admin/invoices/${testInvoiceId}/payments`,
        {
          amount: '99999999.00',
          paymentMethod: 'bank_transfer',
        },
        adminToken,
      );
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVOICE_PAYMENT_EXCEEDS_TOTAL');
    });

    it('PATCH /admin/invoices/:id/void rejects void on invoice with payments > 0 (ADR-013, Q-BILL-5)', async () => {
      const res = await req(
        'PATCH',
        `/admin/invoices/${testInvoiceId}/void`,
        { reason: 'Muon huy hoa don nay' },
        adminToken,
      );
      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'INVOICE_VOID_WITH_PAYMENTS_FORBIDDEN');
    });

    it('POST /admin/invoices/batch/preview simulates batch generation with previewHash (Q-BILL-16)', async () => {
      const res = await req(
        'POST',
        '/admin/invoices/batch/preview',
        {
          periodStart: '2026-10-01',
          periodEnd: '2026-10-31',
        },
        adminToken,
      );
      assert.equal(res.status, 201);
      assert.ok(res.body.data.rows);
      assert.ok(res.body.data.summary);
      assert.ok(res.body.data.previewHash);
    });
  });

  // --------------------------------------------------------------------------
  // DASHBOARD & MONITORING (Module 08)
  // --------------------------------------------------------------------------
  describe('Dashboard & Platform Monitoring (Module 08, ADR-014)', () => {
    it('GET /admin/dashboard/stats returns real aggregation metrics', async () => {
      const res = await req('GET', '/admin/dashboard/stats', undefined, adminToken);
      assert.equal(res.status, 200);
      assert.equal(typeof res.body.data.activeTeachers, 'number');
      assert.equal(typeof res.body.data.activeStudents, 'number');
      assert.equal(typeof res.body.data.sessionsPendingReview, 'number');
      assert.equal(typeof res.body.data.revenueThisMonth, 'string');
      assert.ok(res.body.data.generatedAt);
    });

    it('GET /admin/monitoring/gemini returns Gemini quota and shared key model (ADR-014)', async () => {
      const res = await req('GET', '/admin/monitoring/gemini', undefined, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.keyType, 'Shared Org Key');
      assert.ok(res.body.data.status);
    });

    it('GET /admin/monitoring/health returns infrastructure health probes', async () => {
      const res = await req('GET', '/admin/monitoring/health', undefined, adminToken);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data.services));
      const dbSvc = res.body.data.services.find((s: any) => s.id === 'db');
      assert.ok(dbSvc);
      assert.equal(dbSvc.status, 'healthy');
    });
  });
});
