---
feature: S-GAME-4
role: student
route: /student/badges
status: built (mock — ⛔ backend)
last_updated: 2026-09-12
---

# Page Contract — Student · Badge Collection (S-GAME-4)

## Purpose
Show the badges the learner has earned and the full badge catalog with unlock conditions.

## Access
- Allowed roles: `student`
- Ownership rule: would be token-scoped; **no badge endpoints exist** (see Data)

## Entry points
- From: Student sidebar → "Kho huy hiệu"; deep link `/student/badges`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| ⛔ My badges + catalog | none defined | — |

Blocked on: `API_STUDENT.md` § no-endpoint list ("XP, rank, streak, badges and leaderboard"). FEATURES_STUDENT's own condition: **unlock conditions must be server-authoritative** — a client-evaluated unlock is a cheat surface, so no FE-only badge state is a valid implementation. Recorded under "Needs from the other lane".

## Regions
1. Page Header: eyebrow "Cộng đồng", title "Kho huy hiệu"
2. Earned-badges strip (mock)
3. Full catalog grid ("Huy hiệu") with locked/unlocked states; empty-filter state "Không có huy hiệu nào khớp"
4. Badge detail (drawer/modal — no route change)

## States
- [x] Loading — skeleton
- [x] Ready — mock content (⛔ no live data)
- [x] Empty — filtered catalog can be empty
- [x] Partial — N/A (single dataset)
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Filter catalog | earned / locked filter | refilter mock view (⛔ no live source) | — |
| Inspect badge | badge click | open detail with unlock condition | — |

## Out of scope
XP totals and rank (separate gamification contracts, ⛔); badge awarding logic (server-side, undefined).
