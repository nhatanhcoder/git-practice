---
feature: S-ASGN-7, S-ASGN-8
role: student
route: /student/attempts/[attemptId]/result
status: built
last_updated: 2026-09-12
---

# Page Contract — Student · Attempt Result

## Purpose
Read the official score once available; review correct answers after grading (S-ASGN-7/8).

## Access
- Allowed roles: `student`
- Ownership rule: attempt must belong to the caller (`ATTEMPT_NOT_OWNER` 403)
- On denial: 403 forbidden state; anonymous → `/login` via shell

## Entry points
- From: take screen after submit; `/student/assignments` (future link)
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Result | `GET /api/v1/student/attempts/:id/result` | `data` (keys only at `graded`) |

Blocked on: none — result endpoint live (module `03-attempt-lifecycle.md`).

## Regions
1. PageHead: total score (or "—" while writing waits) + provisional note
2. Per-question rows: answer, auto correctness, teacher score/feedback, key (graded only)

## States
- [x] Loading — skeleton
- [x] Ready — submitted (partial: MCQ scored, writing pending) or graded (full)
- [x] Empty — N/A (a submitted attempt always has rows)
- [x] Partial — submitted-but-ungraded IS the partial state: never presented as final
- [x] Error — fetch failed → retry, shell stays
- [x] Forbidden — 403/404 states
- [x] Offline / stale — request-failure wording; missing totals read "—", never 0

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Retry | error-state button | re-fetch result | — |
| Back to work | link | `/student/assignments` | — |

## Out of scope
Editing answers (locked at submit), class comparison, leaderboard.
