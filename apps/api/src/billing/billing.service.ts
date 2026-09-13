import { Inject, Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma, TuitionBillingCycle } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTuitionRateDto } from './dto/create-tuition-rate.dto';
import { ListTuitionRatesQuery } from './dto/list-tuition-rates.query';
import { ListMyInvoicesQuery } from './dto/list-my-invoices.query';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceSort, ListInvoicesQuery } from './dto/list-invoices.query';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { BatchInvoiceCreateDto, BatchInvoicePreviewDto } from './dto/batch-invoice.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class BillingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  // --------------------------------------------------------------------------
  // TUITION RATES (ADR-008, ADR-013)
  // --------------------------------------------------------------------------

  async createTuitionRate(dto: CreateTuitionRateDto) {
    if (!UUID_REGEX.test(dto.studentId)) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Học viên không tồn tại');
    }

    const student = await this.prisma.user.findUnique({ where: { id: dto.studentId } });
    if (!student || student.role !== 'student') {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Học viên không tồn tại');
    }

    const effectiveDate = new Date(`${dto.effectiveFrom}T00:00:00.000Z`);

    // INV-BILLING-05: effectiveFrom must be strictly greater than MAX(effectiveFrom)
    const latest = await this.prisma.studentTuitionRate.findFirst({
      where: { studentId: dto.studentId },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (latest && effectiveDate <= latest.effectiveFrom) {
      throw new AppException(
        ErrorCode.RATE_EFFECTIVE_DATE_IN_PAST,
        'Ngày hiệu lực mức học phí mới phải lớn hơn ngày hiệu lực mức hiện tại',
      );
    }

    const amount = new Prisma.Decimal(dto.rateAmount);
    if (amount.lte(0)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Mức học phí phải lớn hơn 0');
    }

    const created = await this.prisma.studentTuitionRate.create({
      data: {
        studentId: dto.studentId,
        rateAmount: amount,
        billingCycle: dto.billingCycle ?? TuitionBillingCycle.monthly,
        effectiveFrom: effectiveDate,
      },
    });

    return {
      rate: {
        id: created.id,
        studentId: created.studentId,
        rateAmount: created.rateAmount,
        billingCycle: created.billingCycle,
        effectiveFrom: created.effectiveFrom.toISOString().slice(0, 10),
        createdAt: created.createdAt.toISOString(),
      },
    };
  }

  async listTuitionRates(query: ListTuitionRatesQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Single student rate history
    if (query.studentId && !query.activeOnly) {
      if (!UUID_REGEX.test(query.studentId)) {
        throw new AppException(ErrorCode.USER_NOT_FOUND, 'Học viên không tồn tại');
      }

      const [total, rows] = await this.prisma.$transaction([
        this.prisma.studentTuitionRate.count({ where: { studentId: query.studentId } }),
        this.prisma.studentTuitionRate.findMany({
          where: { studentId: query.studentId },
          orderBy: { effectiveFrom: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const data = rows.map((r, index) => ({
        id: r.id,
        studentId: r.studentId,
        rateAmount: r.rateAmount,
        billingCycle: r.billingCycle,
        effectiveFrom: r.effectiveFrom.toISOString().slice(0, 10),
        isCurrent: index === 0,
        createdAt: r.createdAt.toISOString(),
      }));

      return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // Student list with current active rate
    const whereStudent: Prisma.UserWhereInput = {
      role: 'student',
      status: 'active',
    };
    if (query.studentId) whereStudent.id = query.studentId;

    const [total, students] = await this.prisma.$transaction([
      this.prisma.user.count({ where: whereStudent }),
      this.prisma.user.findMany({
        where: whereStudent,
        select: {
          id: true,
          nickname: true,
          email: true,
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const today = new Date();
    const data = await Promise.all(
      students.map(async (s) => {
        const [currentRate, changesCount] = await Promise.all([
          this.prisma.studentTuitionRate.findFirst({
            where: {
              studentId: s.id,
              effectiveFrom: { lte: today },
            },
            orderBy: { effectiveFrom: 'desc' },
          }),
          this.prisma.studentTuitionRate.count({ where: { studentId: s.id } }),
        ]);

        return {
          studentId: s.id,
          studentName: s.nickname,
          studentEmail: s.email,
          current: currentRate
            ? {
                id: currentRate.id,
                rateAmount: currentRate.rateAmount,
                billingCycle: currentRate.billingCycle,
                effectiveFrom: currentRate.effectiveFrom.toISOString().slice(0, 10),
              }
            : null,
          changesCount,
        };
      }),
    );

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // --------------------------------------------------------------------------
  // INVOICES & PAYMENTS (ADR-013)
  // --------------------------------------------------------------------------

  async createInvoice(dto: CreateInvoiceDto) {
    if (!UUID_REGEX.test(dto.studentId)) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Học viên không tồn tại');
    }

    const student = await this.prisma.user.findUnique({ where: { id: dto.studentId } });
    if (!student || student.role !== 'student') {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Học viên không tồn tại');
    }

    const start = new Date(`${dto.periodStart}T00:00:00.000Z`);
    const end = new Date(`${dto.periodEnd}T00:00:00.000Z`);

    if (end < start) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Ngày kết thúc chu kỳ hóa đơn phải lớn hơn hoặc bằng ngày bắt đầu',
      );
    }

    // Default dueDate: periodEnd + 10 days per ADR-013
    const dueDate = dto.dueDate
      ? new Date(`${dto.dueDate}T00:00:00.000Z`)
      : new Date(end.getTime() + 10 * 24 * 60 * 60 * 1000);

    // Duplicate check: (studentId, periodStart, periodEnd)
    const existing = await this.prisma.studentInvoice.findFirst({
      where: {
        studentId: dto.studentId,
        periodStart: start,
        periodEnd: end,
      },
    });

    if (existing) {
      throw new AppException(
        ErrorCode.INVOICE_PERIOD_DUPLICATE,
        'Học viên đã có hóa đơn cho chu kỳ này',
      );
    }

    let totalAmount: Prisma.Decimal;
    if (dto.totalAmount) {
      totalAmount = new Prisma.Decimal(dto.totalAmount);
    } else {
      // Find rate in effect at periodStart (INV-BILLING-01)
      const rate = await this.prisma.studentTuitionRate.findFirst({
        where: {
          studentId: dto.studentId,
          effectiveFrom: { lte: start },
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (!rate) {
        throw new AppException(
          ErrorCode.INVOICE_NO_TUITION_RATE,
          'Học viên chưa có biểu phí học phí áp dụng cho chu kỳ này',
        );
      }
      totalAmount = rate.rateAmount;
    }

    if (totalAmount.lte(0)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Tổng tiền hóa đơn phải lớn hơn 0');
    }

    const y = start.getUTCFullYear();
    const m = String(start.getUTCMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
    const code = `INV-${y}${m}-${randomSuffix}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.studentInvoice.create({
        data: {
          code,
          studentId: dto.studentId,
          periodStart: start,
          periodEnd: end,
          dueDate,
          totalAmount,
          paidAmount: new Prisma.Decimal(0),
          status: InvoiceStatus.unpaid,
        },
      });
      await this.notifications.createManyWithinTx(tx, [
        {
          userId: dto.studentId,
          type: 'new_invoice',
          // referenceId is the invoice id (07-notifications §10.1) — the code is display
          // data and belongs in the payload.
          referenceId: invoice.id,
          referenceType: 'invoice',
          payload: {
            code,
            totalAmount: totalAmount.toString(),
            dueDate: dueDate.toISOString().slice(0, 10),
          },
        },
      ]);
      return invoice;
    });

    return {
      invoice: {
        id: created.id,
        code: created.code,
        studentId: created.studentId,
        studentName: student.nickname,
        periodStart: created.periodStart.toISOString().slice(0, 10),
        periodEnd: created.periodEnd.toISOString().slice(0, 10),
        totalAmount: created.totalAmount,
        paidAmount: created.paidAmount,
        outstandingAmount: created.totalAmount.minus(created.paidAmount),
        status: created.status,
        dueDate: created.dueDate.toISOString().slice(0, 10),
        createdAt: created.createdAt.toISOString(),
      },
    };
  }

  async listInvoices(query: ListInvoicesQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentInvoiceWhereInput = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;
    if (query.periodFrom || query.periodTo) {
      where.periodStart = {};
      if (query.periodFrom) where.periodStart.gte = new Date(`${query.periodFrom}T00:00:00.000Z`);
      if (query.periodTo) where.periodStart.lte = new Date(`${query.periodTo}T00:00:00.000Z`);
    }
    if (query.dueBefore) {
      where.dueDate = { lte: new Date(`${query.dueBefore}T00:00:00.000Z`) };
    }
    if (query.overdue) {
      where.status = { in: [InvoiceStatus.unpaid, InvoiceStatus.partially_paid] };
      where.dueDate = { lt: new Date() };
    }

    let orderBy: Prisma.StudentInvoiceOrderByWithRelationInput = { periodStart: 'desc' };
    if (query.sort === InvoiceSort.periodStart_asc) orderBy = { periodStart: 'asc' };
    else if (query.sort === InvoiceSort.dueDate_asc) orderBy = { dueDate: 'asc' };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.studentInvoice.count({ where }),
      this.prisma.studentInvoice.findMany({
        where,
        include: {
          student: { select: { id: true, nickname: true, email: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      code: r.code,
      studentId: r.studentId,
      studentName: r.student.nickname,
      studentEmail: r.student.email,
      periodStart: r.periodStart.toISOString().slice(0, 10),
      periodEnd: r.periodEnd.toISOString().slice(0, 10),
      dueDate: r.dueDate.toISOString().slice(0, 10),
      totalAmount: r.totalAmount,
      paidAmount: r.paidAmount,
      outstandingAmount: r.totalAmount.minus(r.paidAmount),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getInvoiceSummary(query: ListInvoicesQuery) {
    const where: Prisma.StudentInvoiceWhereInput = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;
    if (query.periodFrom || query.periodTo) {
      where.periodStart = {};
      if (query.periodFrom) where.periodStart.gte = new Date(`${query.periodFrom}T00:00:00.000Z`);
      if (query.periodTo) where.periodStart.lte = new Date(`${query.periodTo}T00:00:00.000Z`);
    }
    if (query.dueBefore) {
      where.dueDate = { lte: new Date(`${query.dueBefore}T00:00:00.000Z`) };
    }
    if (query.overdue) {
      where.status = { in: [InvoiceStatus.unpaid, InvoiceStatus.partially_paid] };
      where.dueDate = { lt: new Date() };
    }

    const allInvoices = await this.prisma.studentInvoice.findMany({ where });

    let invoiceCount = allInvoices.length;
    let totalInvoiced = new Prisma.Decimal(0);
    let totalPaid = new Prisma.Decimal(0);
    let countByStatus = {
      unpaid: 0,
      partially_paid: 0,
      paid: 0,
      void: 0,
    };
    let overdueCount = 0;
    let overdueAmount = new Prisma.Decimal(0);

    const now = new Date();

    for (const inv of allInvoices) {
      countByStatus[inv.status]++;

      // Void is not counted in totalInvoiced or totalPaid receivables
      if (inv.status !== InvoiceStatus.void) {
        totalInvoiced = totalInvoiced.plus(inv.totalAmount);
        totalPaid = totalPaid.plus(inv.paidAmount);

        if (
          (inv.status === InvoiceStatus.unpaid || inv.status === InvoiceStatus.partially_paid) &&
          inv.dueDate < now
        ) {
          overdueCount++;
          overdueAmount = overdueAmount.plus(inv.totalAmount.minus(inv.paidAmount));
        }
      }
    }

    const totalOutstanding = totalInvoiced.minus(totalPaid);

    return {
      summary: {
        invoiceCount,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        countByStatus,
        overdueCount,
        overdueAmount,
      },
    };
  }

  async getInvoiceDetail(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.INVOICE_NOT_FOUND, 'Hóa đơn không tồn tại');
    }

    const invoice = await this.prisma.studentInvoice.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, nickname: true, email: true } },
        payments: {
          include: {
            recorder: { select: { id: true, nickname: true } },
          },
          orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!invoice) {
      throw new AppException(ErrorCode.INVOICE_NOT_FOUND, 'Hóa đơn không tồn tại');
    }

    return {
      invoice: {
        id: invoice.id,
        code: invoice.code,
        studentId: invoice.studentId,
        studentName: invoice.student.nickname,
        studentEmail: invoice.student.email,
        periodStart: invoice.periodStart.toISOString().slice(0, 10),
        periodEnd: invoice.periodEnd.toISOString().slice(0, 10),
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        outstandingAmount: invoice.totalAmount.minus(invoice.paidAmount),
        status: invoice.status,
        createdAt: invoice.createdAt.toISOString(),
        payments: invoice.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paidAt: p.paidAt.toISOString(),
          paymentMethod: p.paymentMethod,
          transactionReference: p.transactionReference,
          recordedBy: {
            id: p.recorder.id,
            name: p.recorder.nickname,
          },
          createdAt: p.createdAt.toISOString(),
        })),
      },
    };
  }

  // --------------------------------------------------------------------------
  // STUDENT INVOICES (S-BILL-1/2, SCOPE-BILL-01, INV-BILLING-33/34)
  //
  // Dedicated student read path — never the admin handlers. Ownership is a
  // WHERE condition on every query (`studentId = actorId AND status <> 'void'`),
  // so another student's invoice is indistinguishable from a nonexistent one
  // and a voided invoice is invisible to the student entirely (06-billing.md
  // §5). Responses carry no email, no bio, no other user's data (INV-BILLING-34):
  // the student is reading their own invoice, so `studentName`/`studentEmail`
  // (admin-facing fields) are simply omitted.
  // --------------------------------------------------------------------------

  async listMyInvoices(actorId: string, query: ListMyInvoicesQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // INV-BILLING-33: the ownership filter lives in the WHERE, not in an `if`
    // after reading — every Prisma query below carries `studentId = actorId`.
    // `void` is not a value this route can produce rows for: the base
    // condition already excludes voided invoices, so a `?status=void` request
    // answers an explicit empty set rather than either exposing void or
    // silently ignoring the filter.
    if (query.status === InvoiceStatus.void) {
      return {
        data: [] as unknown[],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    // Prisma takes ONE filter key per status object — `equals` and `not`
    // together on the same object is not a merge it honors.
    const statusFilter: Prisma.EnumInvoiceStatusFilter = query.status
      ? { equals: query.status }
      : { not: InvoiceStatus.void };

    const where: Prisma.StudentInvoiceWhereInput = {
      studentId: actorId,
      status: statusFilter,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.studentInvoice.count({ where }),
      this.prisma.studentInvoice.findMany({
        where,
        orderBy: { periodStart: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Money is serialized as decimal strings (ADR-010). `outstandingAmount` is
    // derived here at read time — INV-BILLING-16 — so the FE never subtracts.
    const data = rows.map((r) => ({
      id: r.id,
      code: r.code,
      periodStart: r.periodStart.toISOString().slice(0, 10),
      periodEnd: r.periodEnd.toISOString().slice(0, 10),
      dueDate: r.dueDate.toISOString().slice(0, 10),
      totalAmount: r.totalAmount,
      paidAmount: r.paidAmount,
      outstandingAmount: r.totalAmount.minus(r.paidAmount),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMyInvoiceDetail(actorId: string, id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.INVOICE_NOT_FOUND, 'Hóa đơn không tồn tại');
    }

    // INV-BILLING-33 again, as one query: id + owner + non-void together. A
    // valid invoice owned by someone else resolves to null and answers 404 —
    // "not yours" and "does not exist" are deliberately the same answer.
    const invoice = await this.prisma.studentInvoice.findFirst({
      where: { id, studentId: actorId, status: { not: InvoiceStatus.void } },
      include: {
        payments: {
          include: { recorder: { select: { id: true, nickname: true } } },
          orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!invoice) {
      throw new AppException(ErrorCode.INVOICE_NOT_FOUND, 'Hóa đơn không tồn tại');
    }

    return {
      invoice: {
        id: invoice.id,
        code: invoice.code,
        periodStart: invoice.periodStart.toISOString().slice(0, 10),
        periodEnd: invoice.periodEnd.toISOString().slice(0, 10),
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        outstandingAmount: invoice.totalAmount.minus(invoice.paidAmount),
        status: invoice.status,
        createdAt: invoice.createdAt.toISOString(),
        // Same deterministic order as the admin detail (06-billing.md §3.5);
        // recordedBy exposes only id + display name (INV-BILLING-34).
        payments: invoice.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paidAt: p.paidAt.toISOString(),
          paymentMethod: p.paymentMethod,
          transactionReference: p.transactionReference,
          recordedBy: { id: p.recorder.id, name: p.recorder.nickname },
          createdAt: p.createdAt.toISOString(),
        })),
      },
    };
  }

  async voidInvoice(id: string, dto: VoidInvoiceDto) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.INVOICE_NOT_FOUND, 'Hóa đơn không tồn tại');
    }

    const invoice = await this.prisma.studentInvoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      throw new AppException(ErrorCode.INVOICE_NOT_FOUND, 'Hóa đơn không tồn tại');
    }

    if (invoice.status === InvoiceStatus.void) {
      throw new AppException(ErrorCode.INVOICE_ALREADY_VOID, 'Hóa đơn này đã bị hủy trước đó');
    }

    if (invoice.status === InvoiceStatus.paid) {
      throw new AppException(
        ErrorCode.INVOICE_ALREADY_PAID,
        'Hóa đơn đã thanh toán đầy đủ, không thể hủy',
      );
    }

    // ADR-013: Hard-block void on invoices with payments > 0
    if (invoice.paidAmount.gt(0) || invoice.payments.length > 0) {
      throw new AppException(
        ErrorCode.INVOICE_VOID_WITH_PAYMENTS_FORBIDDEN,
        'Hóa đơn đã có giao dịch thanh toán, không thể hủy',
      );
    }

    const updated = await this.prisma.studentInvoice.update({
      where: { id },
      data: { status: InvoiceStatus.void },
    });

    return {
      invoice: {
        id: updated.id,
        code: updated.code,
        status: updated.status,
        totalAmount: updated.totalAmount,
        paidAmount: updated.paidAmount,
        outstandingAmount: new Prisma.Decimal(0),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  }

  async recordPayment(adminId: string, invoiceId: string, dto: CreatePaymentDto) {
    if (!UUID_REGEX.test(invoiceId)) {
      throw new AppException(ErrorCode.INVOICE_NOT_FOUND, 'Hóa đơn không tồn tại');
    }

    const invoice = await this.prisma.studentInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new AppException(ErrorCode.INVOICE_NOT_FOUND, 'Hóa đơn không tồn tại');
    }

    if (invoice.status === InvoiceStatus.void) {
      throw new AppException(ErrorCode.INVOICE_ALREADY_VOID, 'Không thể ghi nhận thanh toán cho hóa đơn đã hủy');
    }

    if (invoice.status === InvoiceStatus.paid) {
      throw new AppException(ErrorCode.INVOICE_ALREADY_PAID, 'Hóa đơn đã được thanh toán đủ');
    }

    const paymentAmount = new Prisma.Decimal(dto.amount);
    if (paymentAmount.lte(0)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Số tiền thanh toán phải lớn hơn 0');
    }

    const outstanding = invoice.totalAmount.minus(invoice.paidAmount);
    if (paymentAmount.gt(outstanding)) {
      throw new AppException(
        ErrorCode.INVOICE_PAYMENT_EXCEEDS_TOTAL,
        `Số tiền thanh toán (${paymentAmount}) vượt quá số tiền còn nợ (${outstanding})`,
      );
    }

    const newPaidAmount = invoice.paidAmount.plus(paymentAmount);
    const newStatus = newPaidAmount.gte(invoice.totalAmount) ? InvoiceStatus.paid : InvoiceStatus.partially_paid;

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    const [payment, updatedInvoice] = await this.prisma.$transaction([
      this.prisma.tuitionPayment.create({
        data: {
          invoiceId,
          amount: paymentAmount,
          paidAt,
          paymentMethod: dto.paymentMethod,
          transactionReference: dto.transactionReference ?? null,
          recordedBy: adminId,
        },
        include: {
          recorder: { select: { id: true, nickname: true } },
        },
      }),
      this.prisma.studentInvoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      }),
    ]);

    return {
      payment: {
        id: payment.id,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        paidAt: payment.paidAt.toISOString(),
        paymentMethod: payment.paymentMethod,
        transactionReference: payment.transactionReference,
        recordedBy: {
          id: payment.recorder.id,
          name: payment.recorder.nickname,
        },
        createdAt: payment.createdAt.toISOString(),
      },
      invoice: {
        id: updatedInvoice.id,
        totalAmount: updatedInvoice.totalAmount,
        paidAmount: updatedInvoice.paidAmount,
        outstandingAmount: updatedInvoice.totalAmount.minus(updatedInvoice.paidAmount),
        status: updatedInvoice.status,
      },
    };
  }

  // --------------------------------------------------------------------------
  // BATCH INVOICE GENERATION (ADR-013)
  // --------------------------------------------------------------------------

  async batchPreview(dto: BatchInvoicePreviewDto) {
    const start = new Date(`${dto.periodStart}T00:00:00.000Z`);
    const end = new Date(`${dto.periodEnd}T00:00:00.000Z`);

    const whereStudent: Prisma.UserWhereInput = {
      role: 'student',
      status: 'active',
    };
    if (dto.studentIds && dto.studentIds.length > 0) {
      whereStudent.id = { in: dto.studentIds };
    }

    const students = await this.prisma.user.findMany({
      where: whereStudent,
      select: { id: true, nickname: true },
      orderBy: { nickname: 'asc' },
    });

    const rows = [];
    let okCount = 0;
    let noRateCount = 0;
    let duplicateCount = 0;
    let totalBatchAmount = new Prisma.Decimal(0);

    for (const st of students) {
      // Check duplicate
      const existing = await this.prisma.studentInvoice.findFirst({
        where: {
          studentId: st.id,
          periodStart: start,
          periodEnd: end,
        },
      });

      if (existing) {
        duplicateCount++;
        rows.push({
          studentId: st.id,
          studentName: st.nickname,
          outcome: 'duplicate',
          rateId: null,
          rateAmount: null,
          totalAmount: null,
          existingInvoiceId: existing.id,
          existingStatus: existing.status,
        });
        continue;
      }

      // Check rate
      const rate = await this.prisma.studentTuitionRate.findFirst({
        where: {
          studentId: st.id,
          effectiveFrom: { lte: start },
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (!rate) {
        noRateCount++;
        rows.push({
          studentId: st.id,
          studentName: st.nickname,
          outcome: 'no_rate',
          rateId: null,
          rateAmount: null,
          totalAmount: null,
        });
        continue;
      }

      okCount++;
      totalBatchAmount = totalBatchAmount.plus(rate.rateAmount);
      rows.push({
        studentId: st.id,
        studentName: st.nickname,
        outcome: 'ok',
        rateId: rate.id,
        rateAmount: rate.rateAmount,
        totalAmount: rate.rateAmount,
      });
    }

    const previewHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ start: dto.periodStart, end: dto.periodEnd, rows }))
      .digest('hex');

    return {
      rows,
      summary: {
        ok: okCount,
        no_rate: noRateCount,
        duplicate: duplicateCount,
        totalAmount: totalBatchAmount,
      },
      previewHash,
    };
  }

  async batchCreate(dto: BatchInvoiceCreateDto) {
    const preview = await this.batchPreview(dto);

    if (dto.previewHash && dto.previewHash !== preview.previewHash) {
      throw new AppException(
        ErrorCode.INVOICE_PREVIEW_HASH_MISMATCH,
        'Dữ liệu biểu phí hoặc danh sách học viên đã thay đổi kể từ khi xem trước',
      );
    }

    const eligible = preview.rows.filter((r) => r.outcome === 'ok');
    if (eligible.length === 0) {
      return {
        generatedCount: 0,
        totalAmount: new Prisma.Decimal(0),
        invoices: [],
      };
    }

    const start = new Date(`${dto.periodStart}T00:00:00.000Z`);
    const end = new Date(`${dto.periodEnd}T00:00:00.000Z`);
    const dueDate = dto.dueDate
      ? new Date(`${dto.dueDate}T00:00:00.000Z`)
      : new Date(end.getTime() + 10 * 24 * 60 * 60 * 1000);

    const y = start.getUTCFullYear();
    const m = String(start.getUTCMonth() + 1).padStart(2, '0');

    // One transaction for the whole batch (INV-NOTIF-13): previously each invoice and its
    // notification were separate awaited writes, so a crash mid-loop left some students
    // billed and others not, and the notifications sat OUTSIDE the invoice transactions
    // entirely. Batch atomicity also matches the preview hash contract above: either the
    // whole previewed batch lands or none of it does.
    const createdInvoices = await this.prisma.$transaction(async (tx) => {
      const invoiceRows: Prisma.StudentInvoiceCreateManyInput[] = [];
      const notificationWrites: Parameters<NotificationsService['createManyWithinTx']>[1] = [];

      for (const item of eligible) {
        const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
        const code = `INV-${y}${m}-${randomSuffix}`;
        const amount = new Prisma.Decimal(item.totalAmount!);

        invoiceRows.push({
          code,
          studentId: item.studentId,
          periodStart: start,
          periodEnd: end,
          dueDate,
          totalAmount: amount,
          paidAmount: new Prisma.Decimal(0),
          status: InvoiceStatus.unpaid,
        });
        // The invoice id does not exist until createMany returns, so the notification
        // references the id AFTER the insert below reads them back. One row per student,
        // accumulated here and written as one multi-row insert (§10.3).
        notificationWrites.push({
          userId: item.studentId,
          type: 'new_invoice',
          referenceId: null, // patched with the real invoice id right after the insert
          referenceType: 'invoice',
          payload: {
            code,
            totalAmount: amount.toString(),
            dueDate: dueDate.toISOString().slice(0, 10),
          },
        });
      }

      await tx.studentInvoice.createMany({ data: invoiceRows });

      // createMany does not return rows; read the just-inserted invoices back by their
      // unique codes to give each notification its invoice id (07-notifications §10.1).
      const inserted = await tx.studentInvoice.findMany({
        where: { code: { in: invoiceRows.map((row) => row.code) } },
        select: { id: true, code: true },
      });
      const idByCode = new Map(inserted.map((inv) => [inv.code, inv.id]));
      for (const write of notificationWrites) {
        write.referenceId = idByCode.get((write.payload as { code: string }).code) ?? null;
      }

      await this.notifications.createManyWithinTx(tx, notificationWrites);

      // The response keeps the original per-invoice shape: read totalAmount straight
      // from the inserted rows and re-join the preview's studentName by studentId.
      const details = await tx.studentInvoice.findMany({
        where: { id: { in: inserted.map((inv) => inv.id) } },
        select: { id: true, code: true, studentId: true, totalAmount: true },
      });
      return details.map((inv) => ({
        id: inv.id,
        code: inv.code,
        studentId: inv.studentId,
        studentName:
          eligible.find((e) => e.studentId === inv.studentId)?.studentName ?? '',
        totalAmount: inv.totalAmount,
      }));
    });

    return {
      generatedCount: createdInvoices.length,
      totalAmount: preview.summary.totalAmount,
      invoices: createdInvoices,
    };
  }
}
