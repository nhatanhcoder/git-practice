---
feature: A-LCAT-1, A-LCAT-2, A-LCAT-3, A-LCAT-5
role: admin
route: /admin/learning-paths
status: contracted
last_updated: 2026-09-19
---

# Page Contract — Admin · Learning Paths (review queue)

## Purpose
Work the queue of learning paths teachers have submitted, and find any published lesson that needs
to come down.

## Access
- Allowed roles: admin
- Ownership rule: none — admin reviews every teacher's paths. No ownership predicate applies, and
  no teacher/student may call this route.
- On denial: shell redirect to `/login`; role mismatch renders Forbidden in place.

## Entry points
- From: Admin sidebar → "Lộ trình học" (new item)
- From: a `learning_path_submitted` notification deep-link (`referenceType = learning_path`)
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| path queue | `GET /api/v1/admin/learning-paths` | `data.items[]`, `meta.total` |
| published lessons across all paths | `GET /api/v1/admin/learning-units` | `data.items[]`, `meta.total` |
| unpublish a lesson | `PATCH /api/v1/admin/learning-units/:unitId/unpublish` | — |

`?status=&teacherId=&page=` on the path list. Default tab is `pending_review`.

Blocked on: none — all three defined in [API_ADMIN.md](../../../api/API_ADMIN.md) § Learning Catalog — moderation.

## Regions
1. Page title + tab row: Chờ duyệt · Đã duyệt · Bị từ chối · Tạm ẩn · Tất cả
2. Path table — columns: lộ trình, giáo viên, số bài học, gửi lúc, trạng thái, hành động
3. Lesson section (second tab, "Bài học đã publish") — flat list across all paths: bài học, lộ trình,
   giáo viên, HSK, số từ, và action "Gỡ"
4. Pagination

## States
- [ ] Loading — skeleton table
- [ ] Ready — the normal case
- [ ] Empty — "Không có lộ trình nào chờ duyệt" → a distinct copy per tab, not one generic message
- [ ] Partial — one row's counts unresolved → `—`
- [ ] Error — fetch failed → inline retry, shell stays
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A (reason: no offline support in this product)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Approve | row action "Duyệt" → confirm modal | `PATCH /api/v1/admin/learning-paths/:pathId/approve`, row leaves the queue | `LEARNING_PATH_INVALID_STATUS`, `LEARNING_PATH_EMPTY` |
| Reject | row action "Từ chối" → modal with a **required** reason (10–2000 chars) | `PATCH /api/v1/admin/learning-paths/:pathId/reject`, row leaves the queue | `LEARNING_PATH_REJECTION_REASON_REQUIRED`, `LEARNING_PATH_INVALID_STATUS` |
| Open a path | row click | navigate to `/admin/learning-paths/[pathId]` | — |
| Unpublish a lesson | "Bài học đã publish" tab → row action "Gỡ" → confirm modal | `PATCH /api/v1/admin/learning-units/:unitId/unpublish`; row stays with an "đã gỡ" state | `LEARNING_PATH_INVALID_STATUS` |

## Out of scope
- No editing a path or a lesson from here — admin never authors content.
- No deleting a path, and no bulk approve / bulk reject.
- No suspend / restore on the list — those live on the detail, where the full content is visible.
- No student-progress figures on this screen; review is about content, not outcomes.
