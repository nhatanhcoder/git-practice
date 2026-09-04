---
feature: S-LESSON-2, S-LESSON-3
role: student
route: /student/classes/[classId]/lessons/[lessonId]
status: contracted
last_updated: 2026-09-04
---

# Page Contract — Student · Lesson Detail

## Purpose
Read one lesson's material — document, video, description — and open the assignments
attached to it.

## Access
- Allowed roles: student
- Ownership rule: active `ClassEnrollment` for the parent `classId`, and the lesson must
  belong to that class. Both checks in the service layer; checking only enrolment would
  let a student read any lesson id by pairing it with a class they *are* in.
- On denial: redirect to `/student/classes` + toast from the envelope `message`

## Entry points
- From: `/student/classes/[classId]` lesson row
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| lesson content | — | — |
| attached assignments | — | — |

Blocked on: **everything on this screen.** `API_STUDENT.md` defines no Lessons section,
so neither the content nor the assignment links have an endpoint. `ENTITY_LESSON.md` and
`ENTITY_LESSON_ASSIGNMENT.md` are full specs (M:N, unique `(lessonId, assignmentId)`),
but an entity spec is not an API. The whole screen is `MOCK(S-LESSON-2)` until the
Student Lessons endpoints exist — the Teacher-side equivalent of this was `API-007`.

## Regions
1. Breadcrumb back to the class
2. Lesson header — order number, title, teacher note
3. Content body — description, embedded video, downloadable document
4. Attached assignments — cards with due date and attempt status

## States
- [ ] Loading — header then body skeleton
- [ ] Ready — the normal case
- [ ] Empty — lesson exists but has no attachment and no assignment
- [ ] Partial — content resolved, assignment states still loading
- [ ] Error — fetch failed → inline retry
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A (reason: no offline support in S0–S9)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open assignment | assignment card | → `/student/assignments/[assignmentId]` | `LESSON_NOT_FOUND` |

## Out of scope
Marking a lesson complete — no such concept exists in `ENTITY_LESSON.md`, and inventing
one here would create a progress signal the backend cannot store. Commenting, asking the
teacher a question, and any editing.
