import { Inject, Injectable } from '@nestjs/common';
import { PayRateType, PayrollStatus, Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { CreatePayRateDto } from './dto/create-pay-rate.dto';
import { ListPayRatesQuery } from './dto/list-pay-rates.query';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { ListPayrollQuery, PayrollSort } from './dto/list-payroll.query';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PayrollService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // TEACHER PAY RATES (ADR-008, ADR-012)
  // --------------------------------------------------------------------------

  async createPayRate(dto: CreatePayRateDto) {
    if (!UUID_REGEX.test(dto.teacherId)) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Giáo viên không tồn tại');
    }

    const teacher = await this.prisma.user.findUnique({ where: { id: dto.teacherId } });
    if (!teacher || teacher.role !== 'teacher') {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Giáo viên không tồn tại');
    }

    const effectiveDate = new Date(`${dto.effectiveFrom}T00:00:00.000Z`);

    // INV-PAYROLL-16: effectiveFrom must be strictly greater than latest effectiveFrom
    const latest = await this.prisma.teacherPayRate.findFirst({
      where: { teacherId: dto.teacherId },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (latest && effectiveDate <= latest.effectiveFrom) {
      throw new AppException(
        ErrorCode.RATE_EFFECTIVE_DATE_IN_PAST,
        'Ngày hiệu lực mức thù lao mới phải lớn hơn ngày hiệu lực mức hiện tại',
      );
    }

    const amount = new Prisma.Decimal(dto.rateAmount);
    if (amount.lte(0)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Mức thù lao phải lớn hơn 0');
    }

    const created = await this.prisma.teacherPayRate.create({
      data: {
        teacherId: dto.teacherId,
        rateType: dto.rateType,
        rateAmount: amount,
        effectiveFrom: effectiveDate,
      },
    });

    return {
      id: created.id,
      teacherId: created.teacherId,
      rateType: created.rateType,
      rateAmount: created.rateAmount,
      effectiveFrom: created.effectiveFrom.toISOString().slice(0, 10),
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listPayRates(query: ListPayRatesQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // History mode for a single teacher
    if (query.teacherId && !query.activeOnly) {
      if (!UUID_REGEX.test(query.teacherId)) {
        throw new AppException(ErrorCode.USER_NOT_FOUND, 'Giáo viên không tồn tại');
      }

      const [total, rows] = await this.prisma.$transaction([
        this.prisma.teacherPayRate.count({ where: { teacherId: query.teacherId } }),
        this.prisma.teacherPayRate.findMany({
          where: { teacherId: query.teacherId },
          orderBy: { effectiveFrom: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const data = rows.map((r, index) => ({
        id: r.id,
        teacherId: r.teacherId,
        rateType: r.rateType,
        rateAmount: r.rateAmount,
        effectiveFrom: r.effectiveFrom.toISOString().slice(0, 10),
        isCurrent: index === 0,
        createdAt: r.createdAt.toISOString(),
      }));

      return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // Standard listing: teacher-centric list with current rate
    const whereTeacher: Prisma.UserWhereInput = {
      role: 'teacher',
      status: 'active',
    };
    if (query.teacherId) whereTeacher.id = query.teacherId;

    const [total, teachers] = await this.prisma.$transaction([
      this.prisma.user.count({ where: whereTeacher }),
      this.prisma.user.findMany({
        where: whereTeacher,
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
      teachers.map(async (t) => {
        const [currentRate, changesCount] = await Promise.all([
          this.prisma.teacherPayRate.findFirst({
            where: {
              teacherId: t.id,
              effectiveFrom: { lte: today },
            },
            orderBy: { effectiveFrom: 'desc' },
          }),
          this.prisma.teacherPayRate.count({ where: { teacherId: t.id } }),
        ]);

        return {
          teacherId: t.id,
          teacherName: t.nickname,
          teacherEmail: t.email,
          current: currentRate
            ? {
                id: currentRate.id,
                rateType: currentRate.rateType,
                rateAmount: currentRate.rateAmount,
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
  // PAYROLL PERIODS (ADR-012)
  // --------------------------------------------------------------------------

  async createPayrollPeriod(dto: CreatePayrollDto) {
    if (!UUID_REGEX.test(dto.teacherId)) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Giáo viên không tồn tại');
    }

    const teacher = await this.prisma.user.findUnique({ where: { id: dto.teacherId } });
    if (!teacher || teacher.role !== 'teacher') {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Giáo viên không tồn tại');
    }

    const start = new Date(`${dto.periodStart}T00:00:00.000Z`);
    const end = new Date(`${dto.periodEnd}T00:00:00.000Z`);

    if (end < start) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Ngày kết thúc kỳ lương phải lớn hơn hoặc bằng ngày bắt đầu',
      );
    }

    // Overlap prevention (Q-PAY-3 / ADR-012)
    const overlap = await this.prisma.payrollPeriod.findFirst({
      where: {
        teacherId: dto.teacherId,
        periodStart: { lte: end },
        periodEnd: { gte: start },
      },
    });
    if (overlap) {
      throw new AppException(
        ErrorCode.PAYROLL_PERIOD_OVERLAP,
        'Kỳ lương của giáo viên bị trùng lặp thời gian với kỳ lương đã tồn tại',
      );
    }

    // Collect approved sessions within [periodStart, periodEnd]
    const sessions = await this.prisma.classSession.findMany({
      where: {
        teacherId: dto.teacherId,
        status: SessionStatus.approved,
        payrollPeriodId: null,
        scheduledDate: { gte: start, lte: end },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    let totalAmount = new Prisma.Decimal(0);

    for (const s of sessions) {
      // Find applicable rate at session scheduledDate (INV-PAYROLL-01)
      const rate = await this.prisma.teacherPayRate.findFirst({
        where: {
          teacherId: dto.teacherId,
          effectiveFrom: { lte: s.scheduledDate },
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (!rate) {
        throw new AppException(
          ErrorCode.RATE_NOT_FOUND,
          `Không tìm thấy mức thù lao áp dụng cho buổi học ngày ${s.scheduledDate.toISOString().slice(0, 10)}`,
        );
      }

      if (rate.rateType === PayRateType.per_session) {
        totalAmount = totalAmount.plus(rate.rateAmount);
      } else if (rate.rateType === PayRateType.per_hour) {
        // INV-PAYROLL-17: per_hour requires actualStart and actualEnd
        if (!s.actualStart || !s.actualEnd) {
          throw new AppException(
            ErrorCode.PAYROLL_SESSION_HOURLY_MISSING_TIME,
            `Buổi học ngày ${s.scheduledDate.toISOString().slice(0, 10)} tính theo giờ nhưng thiếu thời gian bắt đầu/kết thúc`,
          );
        }
        const minutes = (s.actualEnd.getTime() - s.actualStart.getTime()) / (1000 * 60);
        const hours = minutes / 60;
        const sessionPay = rate.rateAmount.mul(new Prisma.Decimal(hours.toFixed(2)));
        totalAmount = totalAmount.plus(sessionPay);
      }
    }

    const y = start.getUTCFullYear();
    const m = String(start.getUTCMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.floor(Math.random() * 900 + 100);
    const code = `PAY-${y}${m}-${randomSuffix}`;

    const [createdPeriod] = await this.prisma.$transaction([
      this.prisma.payrollPeriod.create({
        data: {
          code,
          teacherId: dto.teacherId,
          periodStart: start,
          periodEnd: end,
          status: PayrollStatus.draft,
          totalSessions: sessions.length,
          totalAmount,
        },
      }),
      this.prisma.classSession.updateMany({
        where: {
          id: { in: sessions.map((s) => s.id) },
        },
        data: {
          payrollPeriodId: undefined, // temporary placeholder, set below
        },
      }),
    ]);

    if (sessions.length > 0) {
      await this.prisma.classSession.updateMany({
        where: { id: { in: sessions.map((s) => s.id) } },
        data: { payrollPeriodId: createdPeriod.id },
      });
    }

    return {
      id: createdPeriod.id,
      code: createdPeriod.code,
      teacherId: createdPeriod.teacherId,
      teacherName: teacher.nickname,
      periodStart: createdPeriod.periodStart.toISOString().slice(0, 10),
      periodEnd: createdPeriod.periodEnd.toISOString().slice(0, 10),
      status: createdPeriod.status,
      totalSessions: createdPeriod.totalSessions,
      totalAmount: createdPeriod.totalAmount,
      paidAt: null,
      createdAt: createdPeriod.createdAt.toISOString(),
    };
  }

  async listPayrollPeriods(query: ListPayrollQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PayrollPeriodWhereInput = {};
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.status) where.status = query.status;
    if (query.periodFrom || query.periodTo) {
      where.periodStart = {};
      if (query.periodFrom) where.periodStart.gte = new Date(`${query.periodFrom}T00:00:00.000Z`);
      if (query.periodTo) where.periodStart.lte = new Date(`${query.periodTo}T00:00:00.000Z`);
    }

    const orderBy: Prisma.PayrollPeriodOrderByWithRelationInput =
      query.sort === PayrollSort.periodStart_asc
        ? { periodStart: 'asc' }
        : { periodStart: 'desc' };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.payrollPeriod.count({ where }),
      this.prisma.payrollPeriod.findMany({
        where,
        include: {
          teacher: {
            select: { id: true, nickname: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      code: r.code,
      teacherId: r.teacherId,
      teacherName: r.teacher.nickname,
      periodStart: r.periodStart.toISOString().slice(0, 10),
      periodEnd: r.periodEnd.toISOString().slice(0, 10),
      status: r.status,
      totalSessions: r.totalSessions,
      totalAmount: r.totalAmount,
      paidAt: r.paidAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPayrollPeriodDetail(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.PAYROLL_PERIOD_NOT_FOUND, 'Kỳ lương không tồn tại');
    }

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, nickname: true } },
        sessions: {
          include: {
            class: { select: { id: true, name: true } },
          },
          orderBy: { scheduledDate: 'asc' },
        },
      },
    });

    if (!period) {
      throw new AppException(ErrorCode.PAYROLL_PERIOD_NOT_FOUND, 'Kỳ lương không tồn tại');
    }

    const sessions = await Promise.all(
      period.sessions.map(async (s) => {
        const rate = await this.prisma.teacherPayRate.findFirst({
          where: {
            teacherId: period.teacherId,
            effectiveFrom: { lte: s.scheduledDate },
          },
          orderBy: { effectiveFrom: 'desc' },
        });

        let hours = '1.00';
        let amount = rate?.rateAmount ?? new Prisma.Decimal(0);

        if (rate?.rateType === PayRateType.per_hour && s.actualStart && s.actualEnd) {
          const diffMinutes = (s.actualEnd.getTime() - s.actualStart.getTime()) / (1000 * 60);
          const h = diffMinutes / 60;
          hours = h.toFixed(2);
          amount = rate.rateAmount.mul(new Prisma.Decimal(hours));
        }

        return {
          sessionId: s.id,
          classId: s.classId,
          className: s.class.name,
          scheduledDate: s.scheduledDate.toISOString().slice(0, 10),
          actualStart: s.actualStart?.toISOString() ?? null,
          actualEnd: s.actualEnd?.toISOString() ?? null,
          hours,
          appliedRateId: rate?.id ?? null,
          appliedRateType: rate?.rateType ?? null,
          appliedRateAmount: rate?.rateAmount ?? null,
          amount,
        };
      }),
    );

    return {
      id: period.id,
      code: period.code,
      teacherId: period.teacherId,
      teacherName: period.teacher.nickname,
      periodStart: period.periodStart.toISOString().slice(0, 10),
      periodEnd: period.periodEnd.toISOString().slice(0, 10),
      status: period.status,
      totalSessions: period.totalSessions,
      totalAmount: period.totalAmount,
      paidAt: period.paidAt?.toISOString() ?? null,
      sessions,
    };
  }

  async finalizePayrollPeriod(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.PAYROLL_PERIOD_NOT_FOUND, 'Kỳ lương không tồn tại');
    }

    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) {
      throw new AppException(ErrorCode.PAYROLL_PERIOD_NOT_FOUND, 'Kỳ lương không tồn tại');
    }

    if (period.status !== PayrollStatus.draft) {
      throw new AppException(
        ErrorCode.PAYROLL_PERIOD_FINALIZED,
        'Chỉ kỳ lương ở trạng thái nháp mới có thể chốt',
      );
    }

    const updated = await this.prisma.payrollPeriod.update({
      where: { id },
      data: { status: PayrollStatus.finalized },
    });

    return {
      id: updated.id,
      status: updated.status,
      totalSessions: updated.totalSessions,
      totalAmount: updated.totalAmount,
      paidAt: updated.paidAt,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async payPayrollPeriod(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.PAYROLL_PERIOD_NOT_FOUND, 'Kỳ lương không tồn tại');
    }

    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) {
      throw new AppException(ErrorCode.PAYROLL_PERIOD_NOT_FOUND, 'Kỳ lương không tồn tại');
    }

    if (period.status === PayrollStatus.paid) {
      throw new AppException(
        ErrorCode.PAYROLL_PERIOD_ALREADY_PAID,
        'Kỳ lương này đã được thanh toán',
      );
    }

    if (period.status !== PayrollStatus.finalized) {
      throw new AppException(
        ErrorCode.PAYROLL_PERIOD_FINALIZED,
        'Kỳ lương cần được chốt (finalized) trước khi xác nhận thanh toán',
      );
    }

    const updated = await this.prisma.payrollPeriod.update({
      where: { id },
      data: {
        status: PayrollStatus.paid,
        paidAt: new Date(),
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      totalSessions: updated.totalSessions,
      totalAmount: updated.totalAmount,
      paidAt: updated.paidAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deletePayrollPeriod(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.PAYROLL_PERIOD_NOT_FOUND, 'Kỳ lương không tồn tại');
    }

    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) {
      throw new AppException(ErrorCode.PAYROLL_PERIOD_NOT_FOUND, 'Kỳ lương không tồn tại');
    }

    // Resolves API-003 & ADR-012: Only draft periods can be deleted
    if (period.status !== PayrollStatus.draft) {
      throw new AppException(
        ErrorCode.PAYROLL_PERIOD_FINALIZED,
        'Không thể xóa kỳ lương đã chốt hoặc đã chi trả',
      );
    }

    await this.prisma.$transaction([
      this.prisma.classSession.updateMany({
        where: { payrollPeriodId: id },
        data: { payrollPeriodId: null },
      }),
      this.prisma.payrollPeriod.delete({
        where: { id },
      }),
    ]);

    return { success: true };
  }
}
