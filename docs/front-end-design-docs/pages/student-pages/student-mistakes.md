---
feature: S-MSTK
role: student
route: /student/mistakes
status: built (mock — ⛔ backend)
last_updated: 2026-09-12
---

# Page Contract — Student · Mistake Notebook (S-MSTK)

## Purpose
Collect questions the learner answered wrongly in assignments and mock exams into one diagnostic notebook, for targeted review. Separate from vocabulary SRS (A00/DOC-016).

## Access
- Allowed roles: `student`
- Ownership rule: would be token-scoped like every student read; **no collection endpoints exist yet** (see Data)

## Entry points
- From: Student sidebar → "Sổ tay lỗi sai"; deep link `/student/mistakes`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| ⛔ Wrongly-answered question collection | none defined | — |

Blocked on: no path, DTO, error code or invariant has been approved for mistake collection (`API_STUDENT.md` § "Accepted capabilities with no endpoint contract yet"). The source data now exists — Assignments/Attempts landed in the Sprint 4 slice — but no endpoint collects wrong answers from it. Recorded under "Needs from the other lane" in `ai/PROGRESS.md`. Until approved this page must render an honest empty state (it does — "Chưa có dữ liệu lỗi sai"), never demo rows (`WEB-011` family). `/student/mistakes/review` exists as a dev-only demo surface, gated to non-production (A02/A05).

## Regions
1. Page Header: title "Sổ tay lỗi sai"
2. Empty state: "Chưa có dữ liệu lỗi sai" — explains the notebook fills from graded assignments/mock exams
3. Vocabulary-review cross-link: "Ôn từ vựng" → `/student/flashcards` (SRS is a different feature)
4. Dev-only demo panel (gated to non-production)

## States
- [x] Loading — skeleton (dev demo only; production renders the terminal state directly)
- [x] Ready — ⛔ unreachable (no backend); reserved for the approved contract
- [x] Empty — the honest current state in production
- [x] Partial — N/A (single dataset)
- [x] Error — N/A until a fetch exists
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — N/A until a fetch exists

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Go to vocabulary SRS | cross-link | navigate to `/student/flashcards` | — |

## Out of scope
Vocabulary flashcards (S-SRS, separate feature); grading feedback editing; teacher views.
