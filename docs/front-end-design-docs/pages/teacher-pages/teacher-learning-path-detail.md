---
feature: T-LCAT-2, T-LCAT-3, T-LCAT-4, T-LCAT-5, T-LCAT-6, T-LCAT-8
role: teacher
route: /teacher/learning-paths/[pathId]
status: contracted
last_updated: 2026-09-19
---

# Page Contract — Teacher · Learning Path Detail

## Purpose
Build the lesson list of one path, then submit it for review — or, once approved, publish lessons.

## Access
- Allowed roles: teacher
- Ownership rule: teacher must own `pathId` (service-layer predicate on `path.ownerId`, not just the
  role guard). Another teacher's path answers `404`, not `403`.
- On denial: redirect to `/teacher/learning-paths` + toast `LEARNING_PATH_NOT_FOUND`

## Entry points
- From: `/teacher/learning-paths` row click
- From: a `learning_path_approved` / `learning_path_rejected` notification deep-link
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| path + its lessons | `GET /api/v1/teacher/learning-paths/:pathId` | `data`, `data.units[]` |
| edit title / description | `PATCH /api/v1/teacher/learning-paths/:pathId` | `data` |
| add a lesson | `POST /api/v1/teacher/learning-paths/:pathId/units` | `data.id` |
| reorder lessons | `PATCH /api/v1/teacher/learning-paths/:pathId/units/reorder` | — |
| submit for review | `POST /api/v1/teacher/learning-paths/:pathId/submit` | `data.status` |
| publish a lesson | `POST /api/v1/teacher/learning-units/:unitId/publish` | `data.published` |
| unpublish a lesson | `POST /api/v1/teacher/learning-units/:unitId/unpublish` | `data.published` |
| reference picker | `GET /api/v1/teacher/learning-units` | `data.items[]` |

Blocked on: none — all defined in [API_TEACHER.md](../../../api/API_TEACHER.md) § Learning Catalog.

## Regions
1. Header — title, status badge, lesson counts, and the one primary action for this state
   (Nháp/Bị từ chối → "Gửi duyệt"; Đã duyệt/Chờ duyệt → none)
2. Review panel — only when `rejected`: the admin's reason, in full, above the fold
3. Frozen banner — when `pending_review` or `suspended`: the reason writes are blocked, stated once
4. Lesson list — order, title, HSK level, kind (tự soạn / tham chiếu), word count, published flag;
   drag handle + publish/unpublish per row
5. Add-lesson split action — "Tự soạn" or "Chọn từ catalog"
6. Edit-path modal — title, description

## States
- [ ] Loading — skeleton header + 5 skeleton rows
- [ ] Ready — the normal case
- [ ] Empty — no lesson yet → CTA "Thêm bài học đầu tiên"; Submit is **disabled** with the reason
- [ ] Partial — path loaded, one lesson's `wordCount` unresolved → `—`
- [ ] Error — fetch failed → inline retry, shell stays
- [ ] Forbidden — see Access (404 for a foreign path)
- [ ] Offline / stale — N/A (reason: no offline support in this product)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Add lesson (authored) | "Tự soạn" → create, then open the unit editor | `POST .../units` | `VALIDATION_ERROR`, `LEARNING_PATH_FROZEN` |
| Add lesson (reference) | "Chọn từ catalog" → picker modal → chọn một unit đã publish | `POST .../units` with `kind: "reference"` | `LEARNING_UNIT_REFERENCE_INVALID`, `LEARNING_PATH_FROZEN` |
| Reorder | drag, or move up/down | sends the **complete** order; a partial payload is never sent | `LEARNING_UNIT_ORDER_INVALID` |
| Publish / unpublish lesson | row toggle | `POST /api/v1/teacher/learning-units/:unitId/publish` and `POST /api/v1/teacher/learning-units/:unitId/unpublish`; enabled only when path is `approved` | `LEARNING_UNIT_PUBLISHED_IMMUTABLE`, `LEARNING_PATH_FROZEN` |
| Submit for review | "Gửi duyệt" → confirm modal | `POST /api/v1/teacher/learning-paths/:pathId/submit`; then the header flips to Chờ duyệt | `LEARNING_PATH_EMPTY`, `LEARNING_PATH_INVALID_STATUS` |
| Edit path | header "Sửa" → modal | `PATCH` | `LEARNING_PATH_FROZEN` |
| Open a lesson | row click | navigate to `/teacher/learning-paths/[pathId]/units/[unitId]` | — |

## Out of scope
- No approve/reject controls — admin only.
- No editing a **published** lesson's words from here; the row offers unpublish, not edit.
- No deleting a `pending_review` path, and no bulk publish.
- No student preview and no XP/points display for a path.

Spec: [../../specs/teacher-pages/teacher-learning-path-detail.spec.md](../../specs/teacher-pages/teacher-learning-path-detail.spec.md) — written 2026-09-19, `ready-for-design`. Contract stays `contracted`: no mockup yet.
