import { Inject, Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma, SessionStatus, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const [
      pendingUsers,
      activeTeachers,
      activeStudents,
      suspendedUsers,
      sessionsPendingReview,
      unpaidInvoicesCount,
      invoicesForOutstanding,
      paymentsThisMonth,
      payrollThisMonthRows,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { status: UserStatus.pending } }),
      this.prisma.user.count({ where: { role: UserRole.teacher, status: UserStatus.active } }),
      this.prisma.user.count({ where: { role: UserRole.student, status: UserStatus.active } }),
      this.prisma.user.count({ where: { status: UserStatus.suspended } }),
      this.prisma.classSession.count({ where: { status: SessionStatus.completed_pending } }),
      this.prisma.studentInvoice.count({
        where: { status: { in: [InvoiceStatus.unpaid, InvoiceStatus.partially_paid] } },
      }),
      this.prisma.studentInvoice.findMany({
        where: { status: { in: [InvoiceStatus.unpaid, InvoiceStatus.partially_paid] } },
        select: { totalAmount: true, paidAmount: true },
      }),
      this.prisma.tuitionPayment.aggregate({
        where: {
          paidAt: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.payrollPeriod.aggregate({
        where: {
          periodStart: { gte: startOfMonth, lt: startOfNextMonth },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    let outstandingAmount = new Prisma.Decimal(0);
    for (const inv of invoicesForOutstanding) {
      outstandingAmount = outstandingAmount.plus(inv.totalAmount.minus(inv.paidAmount));
    }

    const revenueThisMonth = paymentsThisMonth._sum.amount ?? new Prisma.Decimal(0);
    const payrollThisMonth = payrollThisMonthRows._sum.totalAmount ?? new Prisma.Decimal(0);

    return {
      pendingUsers,
      activeTeachers,
      activeStudents,
      suspendedUsers,
      sessionsPendingReview,
      unpaidInvoices: unpaidInvoicesCount,
      outstandingAmount,
      revenueThisMonth,
      payrollThisMonth,
      generatedAt: now.toISOString(),
    };
  }
}
