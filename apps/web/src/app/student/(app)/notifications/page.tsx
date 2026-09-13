"use client";

/**
 * /student/notifications — one learner's mailbox (module 07 read side).
 *
 * Contract: docs/api/modules/07-notifications.md §2/§3, wired per the owner-approved
 * student completion wave (2026-09-12). Features: S-BILL-3 visibility plus every
 * account-level, new_assignment and graded row as their producers land.
 *
 * Sentences are built client-side from `type` + `payload` — the API intentionally
 * returns no message text (ENTITY_NOTIFICATION has no such column; owner decision in
 * the spec's §16). Deep-links exist only where referenceType allows (INV-NOTIF-10):
 * null referenceType renders plain text, never a fake link.
 *
 * No mock fallback anywhere (WEB-011's lesson): a failed load is an ErrorState, an
 * empty mailbox is an empty state, and a notification list that is "all read" is a
 * different fact from "no notifications exist".
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationHref,
  notificationSentence,
  relativeTime,
  type NotificationItem,
} from "@/lib/student/notifications-service";
import "@/styles/hanlu/srs.css";

type Outcome = "loading" | "error" | "empty" | "ready" | "all-read";

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchNotifications();
      setItems(page.data);
      setTotal(page.meta.total);
    } catch {
      setError("Không tải được thông báo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = items.filter((item) => !item.isRead).length;

  const outcome: Outcome = loading
    ? "loading"
    : error
      ? "error"
      : total === 0
        ? "empty"
        : unread === 0
          ? "all-read"
          : "ready";

  async function open(item: NotificationItem) {
    // Clicking an unread row marks it read; the idempotent no-op on the server makes a
    // re-click harmless (INV-NOTIF-04 keeps readAt on the first stamp). The list updates
    // from the returned record — never optimistically.
    if (item.isRead) return;
    try {
      const updated = await markNotificationRead(item.id);
      setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } catch {
      // The row stays unread — a failed mark must not silently repaint it as read.
    }
  }

  async function readAll() {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      const page = await fetchNotifications();
      setItems(page.data);
      setTotal(page.meta.total);
    } catch {
      // Same rule as open(): leave the rows exactly as the server last said they were.
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="stack gap-6">
      <PageHead
        eyebrow="Hộp thư"
        title="Thông báo"
        sub={
          total > 0
            ? `${total} thông báo${unread > 0 ? ` · ${unread} chưa đọc` : ""}`
            : "Mọi hoạt động liên quan đến bạn sẽ xuất hiện ở đây."
        }
      />

      {outcome !== "empty" && outcome !== "loading" && outcome !== "error" && unread > 0 ? (
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => void readAll()}
          disabled={markingAll}
        >
          <CheckCheck size={16} />
          {markingAll ? "Đang đánh dấu…" : "Đánh dấu tất cả đã đọc"}
        </button>
      ) : null}

      {outcome === "loading" ? <SkeletonPanel rows={5} /> : null}

      {outcome === "error" ? <ErrorState onRetry={() => void load()} /> : null}

      {outcome === "empty" ? (
        <EmptyState
          icon={<Inbox size={22} />}
          title="Chưa có thông báo"
          text="Khi có bài tập mới, kết quả chấm hoặc hóa đơn, bạn sẽ thấy ở đây trước tiên."
        />
      ) : null}

      {outcome === "all-read" ? (
        <EmptyState
          icon={<CheckCheck size={22} />}
          title="Bạn đã đọc hết"
          text="Không còn thông báo chưa đọc. Thông báo mới sẽ đến theo hoạt động của lớp."
        />
      ) : null}

      {outcome === "ready" || (outcome === "all-read" && items.length > 0) ? (
        <section className="stack gap-3" aria-label="Danh sách thông báo">
          {items.map((item) => {
            const { text, scope } = notificationSentence(item);
            const href = notificationHref(item);
            const row = (
              <Panel className={`notif-row ${item.isRead ? "notif-row--read" : ""}`}>
                <span className="notif-row__icon" aria-hidden="true">
                  <Bell size={16} />
                </span>
                <div className="notif-row__body">
                  <p className="notif-row__text">{text}</p>
                  <p className="notif-row__meta">
                    <span className="notif-row__scope">{scope}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
                    {item.isRead ? null : <span className="notif-row__dot" aria-label="chưa đọc" />}
                  </p>
                </div>
              </Panel>
            );
            return href ? (
              <Link key={item.id} href={href} onClick={() => void open(item)} className="notif-link">
                {row}
              </Link>
            ) : (
              <div key={item.id} onClick={() => void open(item)} role="button" tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") void open(item);
                }}
                className="notif-link"
              >
                {row}
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
