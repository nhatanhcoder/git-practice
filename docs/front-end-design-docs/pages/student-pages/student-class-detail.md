---
feature: S-CLS-3, S-CLS-4, S-LESSON-1
role: student
route: /student/classes/[classId]
status: contracted
last_updated: 2026-09-04
---

# Page Contract — Student · Class Detail

## Purpose
See who teaches this class, when it meets, and work through its ordered lesson list.

## Access
- Allowed roles: student
- Ownership rule: the student must have an active `ClassEnrollment` for `classId`.
  Enforced in the service layer, not by the role guard alone — a role check would let
  any student read any class by guessing an id.
- On denial: redirect to `/student/classes` + toast from the envelope `message`

## Entry points
- From: `/student/classes` card click
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| class header + schedule | `GET /api/v1/student/classes/:id` | `data` |
| lesson list | — | — |
| leave class | `DELETE /api/v1/student/classes/:id/leave` | `data` |

Blocked on: **the lesson list.** `API_STUDENT.md` has no Lessons section at all — the
same hole `API-007` recorded on the Teacher side, still open for Student. Whether the
lessons arrive embedded in class detail or from their own endpoint is undecided, so the
region ships behind `MOCK(S-LESSON-1)` and is logged under `## Needs from the other lane`.

## Regions
1. Class header — name, teacher, HSK level, enrollment code, schedule
2. Lesson list — ordered, each row showing its attached assignments
3. Danger zone — "Rời lớp", confirm dialog

## States
- [ ] Loading — header skeleton, then list skeleton
- [ ] Ready — the normal case
- [ ] Empty — enrolled but the teacher has published no lesson yet
- [ ] Partial — header resolved, lesson list still loading (they are separate reads)
- [ ] Error — fetch failed → inline retry
- [ ] Forbidden — not enrolled, see Access
- [ ] Offline / stale — N/A (reason: no offline support in S0–S9)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open lesson | row click | → `/student/classes/[classId]/lessons/[lessonId]` | — |
| Leave class | danger zone → confirm | enrollment `dropped`, → `/student/classes` | `CLASS_NOT_FOUND` |

## Out of scope
Editing anything about the class, seeing other students' scores, attendance records, and
the teacher's own class management actions.
