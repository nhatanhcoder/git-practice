---
feature: S-ANL-4, S-GAME-5
role: student
route: /student/leaderboard
status: built (mock — ⛔ backend)
last_updated: 2026-09-12
---

# Page Contract — Student · Leaderboard (S-ANL-4, S-GAME-5)

## Purpose
Show where the learner stands against other learners, ranked by score / streak / retention.

## Access
- Allowed roles: `student`
- Ownership rule: would be token-scoped; **no leaderboard endpoint exists** (see Data). Privacy/visibility rules (who may see whom) have never been approved — a leaderboard leaks other users' data by design, so the contract cannot be written from RBAC alone.

## Entry points
- From: Student sidebar → "Bảng xếp hạng"; deep link `/student/leaderboard`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| ⛔ Ranked aggregation | none defined | — |

Blocked on: `API_STUDENT.md` § no-endpoint list ("XP, rank, streak, badges and leaderboard"); S-GAME-5's open questions — real aggregation source and privacy/visibility rules; S-ANL-4 says "aggregates all study activity" but no metric weighting exists. Recorded under "Needs from the other lane". The mock's roster of named rivals must never be presented as real people (`WEB-017`/`WEB-011` family).

## Regions
1. Page Header: eyebrow "Cộng đồng", title "Bảng xếp hạng"
2. Podium ("Bục vinh danh") — top three (mock)
3. Ranked list with metric columns (mock)
4. The signed-in learner's own row

## States
- [x] Loading — skeleton
- [x] Ready — mock content (⛔ no live data)
- [x] Empty — N/A in the mock
- [x] Partial — N/A (single dataset)
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Switch metric tab | score / streak / retention | refilter mock view (⛔ no live source) | — |

## Out of scope
Quiz-room live leaderboards (S-QUIZ-3 — separate real-time feature); XP spending (not approved, demo-only per FEATURES_STUDENT).
