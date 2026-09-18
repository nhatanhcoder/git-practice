---
feature: A-LCAT-2, A-LCAT-3, A-LCAT-4
role: admin
route: /admin/learning-paths/[pathId]
status: contracted
last_updated: 2026-09-19
---

# Page Contract — Admin · Learning Path Review

## Purpose
Read a path's actual lessons, then approve it, reject it with a reason, or — if it is already live —
suspend it.

## Access
- Allowed roles: admin
- Ownership rule: none — admin may read any path, including a `draft` one, for audit.
- On denial: shell redirect to `/login`; role mismatch renders Forbidden in place.

## Entry points
- From: `/admin/learning-paths` row click
- From: a `learning_path_submitted` notification deep-link
- Deep link: yes (this is the URL the notification carries)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| path + lessons + audit | `GET /api/v1/admin/learning-paths/:pathId` | `data`, `data.units[]` |
| approve | `PATCH /api/v1/admin/learning-paths/:pathId/approve` | `data.status` |
| reject | `PATCH /api/v1/admin/learning-paths/:pathId/reject` | `data.status` |
| suspend | `PATCH /api/v1/admin/learning-paths/:pathId/suspend` | `data.status` |
| restore | `PATCH /api/v1/admin/learning-paths/:pathId/restore` | `data.status` |
| unpublish one lesson | `PATCH /api/v1/admin/learning-units/:unitId/unpublish` | — |

Blocked on: none — all defined in [API_ADMIN.md](../../../api/API_ADMIN.md) § Learning Catalog — moderation.

## Regions
1. Header — path title, teacher name, status badge, submitted-at, and the state's action set
   (`pending_review` → Duyệt / Từ chối; `approved` → Tạm ẩn; `suspended` → Khôi phục)
2. Description block — the teacher's own words, verbatim
3. Lesson table — order, title, HSK, kind (tự soạn / tham chiếu), word count, published flag, "Gỡ"
   action per published row
4. Lesson preview — inline expansion of one lesson's words (hanzi · pinyin · nghĩa), read-only; this
   is what the admin is actually approving
5. Audit block — who last reviewed, when, and the rejection reason when `rejected`

## States
- [ ] Loading — skeleton header + table
- [ ] Ready — the normal case
- [ ] Empty — a submitted path with 0 lessons should be impossible (`submit` requires ≥ 1); if it
      happens anyway, show it plainly and keep Approve disabled with the reason
- [ ] Partial — lessons loaded, one preview still resolving → row-level skeleton
- [ ] Error — an action failed → keep the current status on screen and show the error inline; never
      flip the badge optimistically
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A (reason: no offline support in this product)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Approve | "Duyệt" → confirm modal | `PATCH .../approve`; the path becomes student-visible at once — say that in the modal | `LEARNING_PATH_EMPTY`, `LEARNING_PATH_INVALID_STATUS` |
| Reject | "Từ chối" → modal, reason **required** (10–2000 chars) | `PATCH .../reject`; the reason is sent to the teacher's notification | `LEARNING_PATH_REJECTION_REASON_REQUIRED`, `LEARNING_PATH_INVALID_STATUS` |
| Suspend | "Tạm ẩn" → confirm modal stating that learner progress is kept | `PATCH .../suspend`; students stop seeing the path | `LEARNING_PATH_INVALID_STATUS` |
| Restore | "Khôi phục" → confirm modal | `PATCH /api/v1/admin/learning-paths/:pathId/restore`; exactly the previously published lessons return | `LEARNING_PATH_INVALID_STATUS` |
| Unpublish a lesson | lesson row "Gỡ" → confirm modal | `PATCH /api/v1/admin/learning-units/:unitId/unpublish` | `LEARNING_PATH_INVALID_STATUS` |

## Out of scope
- No editing the title, description, words or ordering — admin reviews, never authors.
- No delete, and no "approve all lessons" bulk action.
- No per-learner progress or completion figures on this screen.
