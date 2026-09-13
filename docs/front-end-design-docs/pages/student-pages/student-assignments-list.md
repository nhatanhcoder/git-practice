---
feature: S-ASGN-1
role: student
route: /student/assignments
status: built
last_updated: 2026-09-12
---

# Page Contract — Student · Assignments List

## Purpose
See every published assignment across the student's actively-enrolled classes (S-ASGN-1).

## Access
- Allowed roles: `student`
- Ownership rule: server lists `published` assignments of active enrollments only
  (`listForStudent` — drafts and dropped classes never leave the server)
- On denial: `RequireAuth` shell (anonymous → `/login`)

## Entry points
- From: `/student` sidebar "Bài tập"
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Published rows | `GET /api/v1/student/assignments` | `data[]` (ENTITY_ASSIGNMENT + `className`, `questionCount`) |
| Class filter options | `GET /api/v1/student/classes` | `data[]` (id, name) |

Blocked on: ⛔ `GET /student/assignments/:id` (listed in `API_STUDENT.md`, not implemented —
rows are not links) + attempt status/take/submit (S-ASGN-2..8, Sprint 4).

## Regions
1. PageHead: count of published rows + overdue count
2. Class filter — client-side `<select>`, "Tất cả lớp" default
3. Assignment rows — title, class/type chips, due/time-limit/question-count chips
4. Sprint-4 notice — attempts need the server grader, list is real published data

## States
- [x] Loading — skeleton rows
- [x] Ready — published rows rendered
- [x] Empty — no published rows → honest "teacher hasn't published" copy
- [x] Partial — N/A (parallel fetch resolves all-or-error)
- [x] Error — fetch failed → retry via reload, shell stays
- [x] Forbidden — handled by shell `RequireAuth`
- [x] Offline / stale — request-failure wording; no mock rows, no invented status

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Filter by class | `<select>` change | local row filter | — |
| Retry | error-state button | `window.location.reload()` | — |

## Out of scope
Taking / submitting / viewing results (S-ASGN-2..8, Sprint 4), assignment detail
(⛔ no endpoint — rows deliberately have no navigation), creating assignments (teacher).
