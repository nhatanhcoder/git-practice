---
feature: S-BILL-3 + Notifications Received table (no S-ID row in FEATURES_STUDENT)
role: student
route: /student/notifications
status: built
last_updated: 2026-09-12
---

# Page Contract — Student · Notification Mailbox

## Purpose
Read one's own notifications (approvals, new assignments, grading done, new invoice, session reviews) and mark them read; the shell bell shows the unread badge and recent items.

## Access
- Allowed roles: any authenticated role reads its OWN mailbox — the handler is deliberately role-agnostic (07-notifications.md §2, INV-NOTIF-05/08); no parameter can address another user's rows
- On denial: Student shell `RequireAuth` redirects to login

## Entry points
- From: shell bell (dropdown of recent items) → "View all"; deep link `/student/notifications`

## Data (matches module 07 exactly — merged 2026-09-12 via PR #67)
| Need | Endpoint | Envelope field |
|---|---|---|
| Mailbox, newest first | `GET /api/v1/notifications?page&limit&isRead&type` | `data[]` + `meta` |
| Unread badge | `GET /api/v1/notifications/unread-count` | `data.unreadCount` |
| Mark one read (idempotent) | `PATCH /api/v1/notifications/:id/read` | `data` = the record |
| Mark all read | `PATCH /api/v1/notifications/read-all` | `data.updated` |

Item shape: `{ id, type, referenceId, referenceType, isRead, readAt, payload, createdAt }`. The API returns **no display text** — the FE builds the Vietnamese sentence from the 11-value `type` enum + `payload`. `limit` cap 50. Filters: `isRead` (true/false), `type` (enum; out-of-enum → `VALIDATION_ERROR`). No POST/DELETE ever (append-only, INV-NOTIF-01).

## Regions
1. Page Header: eyebrow "Hộp thư", title "Thông báo", unread count, "Đọc tất cả" action
2. Filter row: all / unread; type filter
3. Mailbox list: sentence from type+payload, timestamp, read/unread styling, deep-link per `referenceType`
4. Empty ("Chưa có thông báo") and all-read ("Bạn đã đọc hết") states

## States
- [x] Loading — skeleton rows
- [x] Ready — real rows from the live endpoint
- [x] Empty — no notifications yet
- [x] Partial — N/A (single primary dataset)
- [x] Error — failed fetch, inline retry
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Mark read | row click / row action | PATCH one → row flips read; idempotent on repeat | `NOTIFICATION_NOT_FOUND` |
| Mark all read | "Đọc tất cả" | PATCH read-all → badge clears | — |
| Follow deep link | item with `referenceType` | navigate: assignment → `/student/assignments`; attempt → `/student/attempts/:id/result`; invoice → `/student/invoices/[invoiceId]` | — |
| Filter | type / read filter | refetch list | `VALIDATION_ERROR` |

## Out of scope
Sending, deleting, or editing notifications (producers only, in-transaction); admin/teacher mailboxes (same endpoints, other shells).
