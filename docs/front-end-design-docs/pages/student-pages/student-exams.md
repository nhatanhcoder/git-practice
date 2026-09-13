---
feature: S-SELF-7
role: student
route: /student/exams
status: built (mock — ⛔ backend)
last_updated: 2026-09-12
---

# Page Contract — Student · Mock Exam Room (S-SELF-7)

## Purpose
Browse the platform's HSK mock exams, take one under a real timer, and see the skill-breakdown result. Server-authoritative scoring per ADR-005.

## Access
- Allowed roles: `student`
- Ownership rule: would be token-scoped; **no exam endpoints exist** (see Data)

## Entry points
- From: Student sidebar → "Phòng thi HSK"; deep link `/student/exams`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| ⛔ Exam catalog | none defined | — |
| ⛔ Start / take / submit an exam attempt | none defined | — |
| ⛔ Skill-breakdown result | none defined | — |

Routes covered by this contract: `/student/exams` (catalog "Phòng thi HSK" with level filters), `/student/exams/[examId]` (the exam room), `/student/exams/[examId]/result` (breakdown). All render mock/honest-empty states today.

Blocked on: **ADR-005 (server-authoritative exam) is a 0-byte stub** — filed as `DOC-017`; no transport contract for placement attempts or platform mock exams (`API_STUDENT.md` § no-endpoint list); the exam corpus is outside the repo (`DOC-011`, `exams.json`). Recorded under "Needs from the other lane". Timers and scoring must be server-side before any of this is buildable — the mock timer is not a contract.

## Regions
1. Page Header: eyebrow "Luyện tập", title "Thi thử HSK"
2. Exam catalog: card grid with level filter; empty state "Không có đề nào khớp bộ lọc"
3. (⛔ room) exam paper, question sidebar, countdown — mock only
4. (⛔ result) skill breakdown — mock only

## States
- [x] Loading — skeleton catalog
- [x] Ready — mock catalog (⛔ no live data)
- [x] Empty — filtered catalog can be empty
- [x] Partial — N/A (single dataset)
- [x] Error — catalog load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Filter catalog | level filter | refilter mock list (⛔ no live source) | — |

## Out of scope
Assignment attempts (official grades — S-ASGN flow); placement (separate contract); quiz rooms (S-QUIZ, WebSocket infrastructure unsettled).
