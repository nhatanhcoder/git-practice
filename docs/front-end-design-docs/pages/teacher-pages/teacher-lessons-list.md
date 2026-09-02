---
feature: T-LESSON-1, T-LESSON-2, T-LESSON-4, T-LESSON-5
role: teacher
route: /teacher/classes/[classId]/lessons
status: built
last_updated: 2026-09-01
---

# Page Contract — Teacher · Lessons

## Purpose
Build the lesson list for one class, in the order students will see it.

## Access
- Allowed roles: teacher
- Ownership rule: teacher must own the parent `classId` — service-layer check, not the role guard
  alone. Now sourced from `ENTITY_LESSON.md` § Business Rules ("created/managed exclusively by the
  teacher who owns the class"), no longer an inference.
- On denial: redirect to `/teacher/classes` + toast `LESSON_ACCESS_DENIED`

## Entry points
- From: `/teacher/classes/[classId]` tab "Bài học"
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| lesson list (ordered) | `GET /api/v1/teacher/classes/:classId/lessons` | `data[]` |
| create lesson | `POST /api/v1/teacher/classes/:classId/lessons` | `data.lesson` |
| update lesson | `PATCH /api/v1/teacher/lessons/:id` | `data.lesson` |
| delete lesson | `DELETE /api/v1/teacher/lessons/:id` | — (204) |
| reorder | `PATCH /api/v1/teacher/classes/:classId/lessons/reorder` | `data[]` |

Blocked on: the endpoints now exist (`API_TEACHER.md` § Lessons, added 2026-09-01 — `API-007`),
but they are **not yet cross-checked by a BE owner** and the `LESSON_*` error codes are *proposed,
not agreed*. The screen may be built against them; it may not be called done until they are
signed off. `RBAC_MATRIX.md` / `PERMISSIONS_TEACHER.md` still have no Lesson row — that edit
touches RBAC and needs its own approval.

> **History.** An early draft of this contract cited five Lesson endpoints that did not exist —
> reconstructed from a stale read of a different repo checkout, caught by `check-docs.mjs`. It was
> then rewritten to mark every action `⛔`. The paths above are the real ones: they were written
> into `API_TEACHER.md` from `ENTITY_LESSON.md` and `FEATURES_TEACHER.md` T-LESSON-1…5.

## Regions
1. Page title (class name context) + primary action "Thêm bài học"
2. Lesson list — drag-handle, order number, title, content-type icon, assignment count,
   row menu (edit / delete)

## States
- [ ] Loading — list skeleton, 3 placeholder rows
- [ ] Ready
- [ ] Empty — no lessons yet → "Chưa có bài học nào" + CTA "Thêm bài học đầu tiên"
- [ ] Partial — N/A (single query)
- [ ] Error — inline retry, drag disabled until list loads successfully
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Create lesson | "Thêm bài học" | modal (title, description, content type + upload) → new row appended at end | `LESSON_ACCESS_DENIED`, `LESSON_ORDER_INDEX_CONFLICT` |
| Edit lesson | row menu → "Sửa" | modal, prefilled → row updates | `LESSON_NOT_FOUND`, `LESSON_ACCESS_DENIED` |
| Delete lesson | row menu → "Xoá" | confirm modal → row removed. **Blocked when a linked assignment has active attempts** — documented in `ENTITY_LESSON.md` § Business Rules, no longer an assumption | `LESSON_HAS_ACTIVE_ATTEMPTS`, `LESSON_NOT_FOUND` |
| Reorder | drag row to new position | optimistic reorder → revert on failure. Server swaps the whole set in **one transaction** (`(classId, orderIndex)` is unique) | `LESSON_ORDER_INDEX_CONFLICT` |

All four codes are *proposed, not agreed* in `API_ERROR_CODES.md` — render them, but expect the
names to move if the BE owner renames any.

## Out of scope
- Attaching/detaching an Assignment to a lesson (T-LESSON-3) — the endpoints now exist
  (`POST`/`DELETE /api/v1/teacher/lessons/:id/assignments/:assignmentId`), but the screen for
  them is not contracted. Lesson ↔ Assignment is **M:N** per `ENTITY_LESSON_ASSIGNMENT.md`
- Viewing lesson content itself — this is the teacher's management list, not the reader view
