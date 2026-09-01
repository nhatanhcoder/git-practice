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
- Ownership rule: teacher must own the parent `classId` (inferred from Class ownership —
  `RBAC_MATRIX.md` and `PERMISSIONS_TEACHER.md` have no row for Lesson at all; see Blocked on)
- On denial: redirect to `/teacher/classes` + toast `CLASS_ACCESS_DENIED`

## Entry points
- From: `/teacher/classes/[classId]` tab "Bài học"
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| lesson list (ordered) | ⛔ no endpoint | — |
| create lesson | ⛔ no endpoint | — |
| update lesson | ⛔ no endpoint | — |
| delete lesson | ⛔ no endpoint | — |
| reorder | ⛔ no endpoint | — |

Blocked on: `docs/api/API_TEACHER.md` has **no Lessons section at all** — Classes, Question
Bank, Assignments, Grading, Sessions, Income are the only sections it defines. None of the five
actions above have a real endpoint anywhere in `docs/api/`. This entire screen is `⛔` until a
Lessons API is written. (An earlier draft of this contract cited specific endpoint paths for
these actions — they were wrong, reconstructed from a stale read of a different repo checkout;
removed.) Ownership rule above and the delete-blocked-by-active-attempts behaviour mentioned
under Actions are both **inferred from the Lesson↔Assignment relationship in
`FEATURES_TEACHER.md` T-LESSON-3**, not from any written business rule — flag both for
confirmation when the API is written, don't build against them as fact.

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
| Create lesson | "Thêm bài học" | modal (title, description, content type + upload) → new row appended at end | ⛔ no endpoint |
| Edit lesson | row menu → "Sửa" | modal, prefilled → row updates | ⛔ no endpoint |
| Delete lesson | row menu → "Xoá" | confirm modal → row removed. Whether a linked assignment with active attempts blocks this is unconfirmed (see Blocked on) | ⛔ no endpoint |
| Reorder | drag row to new position | optimistic reorder → revert on failure | ⛔ no endpoint |

## Out of scope
- Attaching/detaching an Assignment to a lesson (T-LESSON-3) — separate screens, not yet
  contracted, and `API_TEACHER.md` has no endpoints for this either
- Viewing lesson content itself — this is the teacher's management list, not the reader view
