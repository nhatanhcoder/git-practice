import { Inject, Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { NotificationsRepository } from './notifications.repository';

/**
 * The 11 values of `ENTITY_NOTIFICATION.md`, mirrored one-to-one by the Postgres enum
 * `notification_type` (INV-NOTIF-09). This is the single source the DTO filter, the
 * create-path validation and the docs derive from — a 12th value here without a migration
 * would fail at the DB enum, by design.
 */
export const NOTIFICATION_TYPES = [
  'account_approved',
  'account_suspended',
  'new_assignment',
  'deadline_reminder',
  'graded',
  'new_invoice',
  'session_submitted_for_review',
  'session_approved',
  'session_rejected',
  'new_teacher_registration',
  'new_student_registration',
] as const;

export type NotificationTypeName = (typeof NOTIFICATION_TYPES)[number];

/** INV-NOTIF-10: the only deep-linkable reference types; `null` for account-level events. */
const REFERENCE_TYPES = ['assignment', 'attempt', 'invoice', 'session'] as const;

export type ReferenceTypeName = (typeof REFERENCE_TYPES)[number];

/** The transaction handle a producing module passes in — §7 forbids opening one here. */
export type NotificationTx = Prisma.TransactionClient;

export interface NotificationWrite {
  userId: string;
  type: NotificationType;
  referenceId?: string | null;
  referenceType?: ReferenceTypeName | null;
  /** Display-only auxiliary data (INV-NOTIF-14). `null`/omitted writes a SQL NULL. */
  payload?: Prisma.InputJsonValue | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NotificationsRepository) private readonly repo: NotificationsRepository,
  ) {}

  /**
   * The ONLY creation path in the system (INV-NOTIF-08): called by producing modules
   * from INSIDE their own transaction, whose handle arrives as `tx` — this service never
   * opens one, or the "action ⇔ notification" atomicity silently degrades to
   * write-after-commit (§7). The enum pair is validated before any INSERT so a bad write
   * fails the business action at the validation step, not mid-fan-out. Fan-out is one
   * multi-row INSERT, never a loop (§10.3).
   */
  async createManyWithinTx(tx: NotificationTx, rows: NotificationWrite[]): Promise<void> {
    if (rows.length === 0) return;
    for (const row of rows) {
      if (!(NOTIFICATION_TYPES as readonly string[]).includes(row.type)) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          `notification type không hợp lệ: ${String(row.type)}`,
        );
      }
      if (row.referenceType != null && !REFERENCE_TYPES.includes(row.referenceType)) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          `notification referenceType không hợp lệ: ${String(row.referenceType)}`,
        );
      }
    }
    await tx.notification.createMany({
      data: rows.map((row) => ({
        userId: row.userId,
        type: row.type,
        referenceId: row.referenceId ?? null,
        referenceType: row.referenceType ?? null,
        payload: row.payload ?? Prisma.JsonNull,
      })),
    });
  }

  /** INV-NOTIF-16/17: newest first, stable under shared timestamps, honest meta. */
  async list(
    userId: string,
    query: { page: number; limit: number; isRead?: boolean; type?: NotificationType },
  ) {
    const [rows, total] = await this.repo.listPage(
      userId,
      { isRead: query.isRead, type: query.type },
      query.page,
      query.limit,
    );
    return {
      data: rows,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  /**
   * Idempotent by design (§8): clicking twice is normal user behavior, so an already-read
   * record returns 200 with its ORIGINAL `readAt` — never an error, never a moved
   * timestamp (INV-NOTIF-04). A record that doesn't exist or belongs to someone else is a
   * bare 404: confirming existence would let a caller probe foreign ids (§5).
   */
  async markRead(userId: string, id: string) {
    const { count } = await this.repo.markRead(userId, id);
    if (count === 1) {
      return this.repo.findByIdForUser(userId, id);
    }
    const existing = await this.repo.findByIdForUser(userId, id);
    if (!existing) {
      throw new AppException(ErrorCode.NOTIFICATION_NOT_FOUND, 'Không tìm thấy thông báo');
    }
    return existing;
  }

  /** INV-NOTIF-07: rows created after this statement ran stay unread — correct, not a bug. */
  async readAll(userId: string) {
    const { count } = await this.repo.markAllRead(userId);
    return { updated: count };
  }

  /** INV-NOTIF-06: same `userId AND isRead = false` condition as the list filter — one definition of unread. */
  async unreadCount(userId: string) {
    return { unreadCount: await this.repo.countUnread(userId) };
  }
}
