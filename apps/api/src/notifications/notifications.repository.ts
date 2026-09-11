import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The only code that talks to the `Notification` table for the mailbox.
 *
 * `07-notifications.md` §5: the `userId = actor` constraint must be structural, not
 * remembered. Every method below takes `userId` as a REQUIRED first parameter and there
 * is deliberately no overload, option object, or default that can query without it — a
 * caller cannot read or modify someone else's mailbox without editing this file. This is
 * the one table in the system where a single forgotten WHERE clause leaks other people's
 * business data (invoice amounts, rejection reasons), so the constraint lives here and
 * is tested as an invariant (INV-NOTIF-05), not a convention.
 */
@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One page of one mailbox plus its total, in a single transaction so the two queries
   * share a snapshot (INV-NOTIF-17). Ordered `createdAt DESC, id DESC` — the id
   * tie-breaker is what makes pagination stable when rows share a timestamp
   * (INV-NOTIF-16).
   */
  listPage(
    userId: string,
    cond: { isRead?: boolean; type?: NotificationType },
    page: number,
    limit: number,
  ): Promise<[rows: Prisma.NotificationGetPayload<true>[], total: number]> {
    const where: Prisma.NotificationWhereInput = { userId, ...cond };
    return this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
  }

  /** Served by the partial index `WHERE is_read = false` — the hottest query in the system. */
  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  /**
   * Guarded one-way gate (INV-NOTIF-03/04): rowCount 0 means "already read, or not
   * yours" — the service re-selects to tell those apart. A second read never moves
   * `readAt` because the UPDATE simply doesn't match again.
   */
  markRead(userId: string, id: string): Promise<{ count: number }> {
    return this.prisma.notification.updateMany({
      where: { id, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * One UPDATE statement — already atomic (§7). Never "SELECT the list then update each":
   * that is both N+1 and a race against rows created mid-loop (INV-NOTIF-07).
   */
  markAllRead(userId: string): Promise<{ count: number }> {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /** Distinguishes "already read" (200 no-op) from "not yours" (404) after a 0-count update. */
  findByIdForUser(userId: string, id: string) {
    return this.prisma.notification.findFirst({ where: { id, userId } });
  }
}
