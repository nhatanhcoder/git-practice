import { apiRequest } from "../api-client";

/**
 * Student notifications — the mailbox read side of module 07 (`07-notifications.md`).
 *
 * The API deliberately returns NO display text (no `message` column exists in
 * ENTITY_NOTIFICATION.md — owner decision §16: FE builds the sentence from `type` +
 * `payload`, so wording changes never need a BE deploy). Every sentence below is keyed by
 * the 11-value enum; an unknown type renders a neutral fallback instead of crashing the
 * bell for one bad row.
 */

export interface NotificationItem {
  id: string;
  type: string;
  referenceId: string | null;
  referenceType: "assignment" | "attempt" | "invoice" | "session" | null;
  isRead: boolean;
  readAt: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationPage {
  data: NotificationItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type NotificationFilter = { isRead?: boolean; type?: string };

export async function fetchNotifications(
  filter: NotificationFilter = {},
  page = 1,
  limit = 20,
): Promise<NotificationPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (typeof filter.isRead === "boolean") params.set("isRead", String(filter.isRead));
  if (filter.type) params.set("type", filter.type);
  const meta = await apiRequest<NotificationItem[]>(`/notifications?${params.toString()}`);
  // The flat envelope carries { data, meta } at the top level for paginated endpoints.
  return { data: meta.data, meta: meta.meta as NotificationPage["meta"] };
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await apiRequest<{ unreadCount: number }>("/notifications/unread-count");
  return res.data.unreadCount;
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const res = await apiRequest<NotificationItem>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
  return res.data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await apiRequest<{ updated: number }>("/notifications/read-all", {
    method: "PATCH",
  });
  return res.data.updated;
}

/** Deep-link per referenceType (INV-NOTIF-10: null referenceType ⇒ no link, ever). */
export function notificationHref(item: NotificationItem): string | null {
  switch (item.referenceType) {
    case "assignment":
      return "/student/assignments";
    case "attempt":
      return `/student/attempts/${item.referenceId}/result`;
    case "invoice":
      // S-BILL-1/2 screens don't exist yet; the invoice detail route is future work.
      return null;
    case "session":
      return null;
    default:
      return null;
  }
}

interface Sentence {
  text: string;
  /** Where the notification happened, shown small under the sentence. */
  scope: string;
}

/** Wording lives here and nowhere else — one row per enum value, unknown → neutral. */
export function notificationSentence(item: NotificationItem): Sentence {
  const payload = item.payload ?? {};
  const role = typeof payload.role === "string" ? payload.role : "";
  switch (item.type) {
    case "account_approved":
      return { text: "Tài khoản của bạn đã được duyệt. Chúc bạn học tốt!", scope: "Tài khoản" };
    case "account_suspended":
      return {
        text: "Tài khoản đã bị tạm ngưng. Hãy liên hệ trung tâm để biết thêm chi tiết.",
        scope: "Tài khoản",
      };
    case "new_assignment":
      return { text: "Có bài tập mới được giao cho lớp của bạn.", scope: "Bài tập" };
    case "deadline_reminder":
      return { text: "Một bài tập sắp đến hạn nộp trong 24 giờ.", scope: "Bài tập" };
    case "graded":
      return { text: "Bài làm của bạn đã được chấm. Xem kết quả nhé!", scope: "Kết quả" };
    case "new_invoice": {
      const code = typeof payload.code === "string" ? payload.code : "";
      return {
        text: `Hóa đơn học phí mới ${code ? code + " " : ""}đã được phát hành.`,
        scope: "Học phí",
      };
    }
    case "session_submitted_for_review":
      return { text: "Một buổi học đang chờ admin xem xét.", scope: "Buổi học" };
    case "session_approved":
      return { text: "Buổi học của bạn đã được duyệt vào kỳ lương.", scope: "Buổi học" };
    case "session_rejected":
      return { text: "Một buổi học bị từ chối — xem lý do trong chi tiết.", scope: "Buổi học" };
    case "new_teacher_registration":
      return { text: "Có giáo viên mới đăng ký, chờ phê duyệt.", scope: "Người dùng" };
    case "new_student_registration":
      return {
        text: role === "teacher" ? "Có giáo viên mới đăng ký, chờ phê duyệt." : "Có học viên mới đăng ký, chờ phê duyệt.",
        scope: "Người dùng",
      };
    default:
      return { text: "Bạn có một thông báo mới.", scope: "Thông báo" };
  }
}

/** "3 phút trước" / "2 giờ trước" / "5 ngày trước" — relative, local, no precision theater. */
export function relativeTime(iso: string, now = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}
