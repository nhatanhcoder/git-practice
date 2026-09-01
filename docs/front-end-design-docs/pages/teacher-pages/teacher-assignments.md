---
feature: T-ASGN-1, T-ASGN-2, T-ASGN-3, T-ASGN-4, T-ASGN-5
role: teacher
route: /teacher/assignments
status: built
last_updated: 2026-09-01
---

# Page Contract — Teacher · Assignments & Tests

## Purpose
See every assignment/mock test created, who submitted, and create new ones from the question bank.

## Access
- Allowed roles: teacher
- Ownership rule: server scopes to `teacherId`; list shows own classes only
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Bài tập & Đề"
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| assignment list | `GET /api/v1/teacher/assignments` | `data[]` |
| create | `POST /api/v1/teacher/assignments` | `data.assignment` |
| update | `PATCH /api/v1/teacher/assignments/:id` | `data.assignment` |
| delete | `DELETE /api/v1/teacher/assignments/:id` (no submissions) | `data.assignment` |

Blocked on: error codes — none registered for Assignment; all rows `TODO(error-code)`.
Edit/delete before-any-submission is enforced client-side in the mock (T-ASGN-5).

## Regions
1. Page title + primary action "Tạo bài tập"
2. Filter toolbar — class, type (Bài tập / Đề thi thử)
3. Data table — title, type, class, due date, time limit (mock test only), submitted/total,
   pending-grading count, row menu

## States
- [ ] Loading — table skeleton
- [ ] Ready
- [ ] Empty — "Chưa có bài tập nào" + CTA "Tạo bài tập đầu tiên"
- [ ] Partial — N/A (single query)
- [ ] Error — inline retry, toolbar stays
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Create | "Tạo bài tập" | 2-step modal: info (title, type, class, dueDate, timeLimit) → pick questions from bank | `TODO(error-code)` |
| Edit | row menu → "Sửa" | same modal prefilled; only when `submittedCount = 0` | `TODO(error-code)` |
| Delete | row menu → "Xoá" | confirm; only when `submittedCount = 0` | `TODO(error-code)` |
| View submission stats | row click | drawer: submitted vs not-submitted student list | — |

## Out of scope
- Authoring questions inside this flow — create them in the Question Bank first
- Student-side assignment view
- Grading — separate screen (`/teacher/grading`)
