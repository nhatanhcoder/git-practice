---
feature: T-LCAT-1, T-LCAT-4, T-LCAT-7, T-LCAT-8
role: teacher
route: /teacher/learning-paths
status: contracted
last_updated: 2026-09-19
---

# Page Contract — Teacher · Learning Paths (list)

## Purpose
See every learning path you own, know which are waiting on admin review, and start a new one.

## Access
- Allowed roles: teacher
- Ownership rule: the list is **own-only** — the server filters by the token's `userId`; there is no
  "view another teacher's paths" mode on this screen.
- On denial: shell redirect to `/login`; a `403` from a stale token renders Forbidden in place.

## Entry points
- From: Teacher sidebar → "Lộ trình học" (new item)
- From: a `learning_path_approved` / `learning_path_rejected` notification deep-link
  (`referenceType = learning_path`, `referenceId = pathId`) → goes to the detail, not here
- Deep link: yes (shareable URL)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| own path list | `GET /api/v1/teacher/learning-paths` | `data.items[]`, `meta.total` |
| create a path | `POST /api/v1/teacher/learning-paths` | `data.id` |
| delete a path | `DELETE /api/v1/teacher/learning-paths/:pathId` | — |

`?status=&page=` on the list. `meta` carries pagination.

Blocked on: none — all three defined in [API_TEACHER.md](../../../api/API_TEACHER.md) § Learning Catalog.

## Regions
1. Page title + primary action ("Tạo lộ trình")
2. Status filter — one row of tabs: Tất cả · Bản nháp · Chờ duyệt · Đã duyệt · Bị từ chối · Tạm ẩn
3. Path table — columns: title, số bài học, đã publish, status badge, cập nhật, và lý do từ chối khi
   `rejected` (one truncated line, full text in the detail)
4. Pagination

## States
- [ ] Loading — skeleton table, 5 rows
- [ ] Ready — the normal case
- [ ] Empty — no path at all → CTA "Tạo lộ trình đầu tiên"; distinct from "filter matched nothing"
- [ ] Partial — list loaded, `unitCount` still resolving → show `—`, never `0`
- [ ] Error — fetch failed → inline retry, page shell stays
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A (reason: no offline support in this product)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Create path | "Tạo lộ trình" → modal (title, description) | `POST`, then navigate to the new path's detail | `VALIDATION_ERROR` |
| Open path | row click | navigate to `/teacher/learning-paths/[pathId]` | — |
| Delete path | row menu → "Xoá" → confirm modal | `DELETE`; the menu item is **disabled** with an explanation when the path was published or has learners | `LEARNING_PATH_HAS_PUBLISHED_UNITS` |

## Out of scope
- No approve / reject / suspend here — those are admin actions (`/admin/learning-paths`).
- No lesson authoring on this screen; that lives in the detail and the unit editor.
- No student-facing preview of a path, and no "publish all" bulk action.
