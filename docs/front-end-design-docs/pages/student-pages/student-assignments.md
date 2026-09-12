---
feature: S-ASGN-1
role: student
route: /student/assignments
status: built
last_updated: 2026-09-12
---

# Page Contract — Student · Assignments List

## Purpose
See all published assignments and mock tests from the classes the learner is enrolled in, with each one's attempt status, and enter an attempt from here.

## Access
- Allowed roles: `student`
- Ownership rule: the list is derived from the token — published-only and active-enrollment-only are enforced server-side (03-classes-enrollment; API_STUDENT.md § Assignments & Attempts)
- On denial: Student shell `RequireAuth` redirects to login

## Entry points
- From: Student sidebar → "Bài tập được giao"; dashboard quick link
- Deep link: yes (`/student/assignments`)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Assigned work across enrolled classes | `GET /api/v1/student/assignments` | `data[]` |
| Start / re-enter an attempt | `POST /api/v1/student/assignments/:id/attempts` | `data` (→ take screen) |

Note: per-assignment attempt status (S-ASGN-1's four states) arrives with the attempt-lifecycle slice (03-attempt-lifecycle, PR #73); until then the list renders without invented statuses.

## Regions
1. Page Header: eyebrow "Bài giáo viên giao", title "Bài tập", count
2. Assignment list: class, kind (assignment / mock_test), due/schedule info, status chip, "Làm bài" action per item
3. Error state with retry; empty state when no class has published work

## States
- [x] Loading — skeleton rows
- [x] Ready — real list from the live endpoint
- [x] Empty — no published assignments in any enrolled class
- [x] Partial — N/A (single primary dataset)
- [x] Error — failed fetch, inline retry
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Start attempt | "Làm bài" | POST attempts → navigate to `/student/attempts/[attemptId]` (contract `student-attempt-take`) | `CLASS_NOT_ENROLLED`, `ASSIGNMENT_NOT_FOUND`, `VALIDATION_ERROR` |
| Open attempt | existing attempt row | navigate to take/result per its state | — |

## Out of scope
Creating or editing assignments (teacher), grading (teacher), supplemental catalog practice (S-ASGN-9, ⛔ no contract).
