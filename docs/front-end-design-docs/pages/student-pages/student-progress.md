---
feature: S-ANL-1, S-ANL-2 (mock body also shows S-GAME-1..3 figures)
role: student
route: /student/progress
status: built (mock — ⛔ response shape)
last_updated: 2026-09-12
---

# Page Contract — Student · Progress (S-ANL-1/2)

## Purpose
Show the learner's own study progress: the skill×week heatmap, the average-score-over-time chart, and (mock today) streak/XP figures.

## Access
- Allowed roles: `student`
- Ownership rule: would be token-scoped; the two reserved paths carry no approved response shape (see Data)

## Entry points
- From: Student sidebar → "Tiến độ học tập"; deep link `/student/progress`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Heatmap + skill breakdown (S-ANL-1) | `GET /api/v1/student/progress` — path reserved, **shape ⛔** | unspecified |
| Score-over-time chart (S-ANL-2) | `GET /api/v1/student/progress/chart` — path reserved, **shape ⛔** | unspecified |
| ⛔ Streak / XP figures (S-GAME-2/3) | none defined | — |

Conflict recorded, not picked: the two paths exist in `API_STUDENT.md` § Progress & Analytics, but `ai/PROGRESS.md` Sprint 5 marks F6.1/F6.2 ⛔ because **no module spec defines their request/response contracts**. Per the Conflict Rules this contract treats the paths as reserved and the payloads as unapproved; building against them needs the analytics module spec first (recorded under "Needs from the other lane"). Streak/XP/level blocks are gamification (`S-GAME-1..3`) with no contract at all — the dashboard already renders those as missing rather than invented (`WEB-011` family).

## Regions
1. Page Header: eyebrow "Cộng đồng", title "Tiến độ học tập"
2. Study-streak block (mock; ⛔ S-GAME-3 calendar/timezone rule unsettled)
3. "XP theo tháng" chart (mock; ⛔ S-GAME-1)
4. "Bốn kỹ năng" skill breakdown (mock; ⛔ S-ANL-1 shape)

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
| Change period/skill filter | chart controls | refilter mock view (⛔ no live source) | — |

## Out of scope
Per-assignment scores (S-ANL-3 — lives on attempt result, PR #73); class-average comparison (S-ANL-5, 🟢 Could); teacher dashboards.
