---
feature: S-ANL-1, S-ANL-2
role: student
route: /student/progress
status: built (live)
last_updated: 2026-09-16
---

# Page Contract — Student · Progress (S-ANL-1/2)

## Purpose
Show the learner's own graded-attempt progress: the skill×week heatmap, skill breakdown and average-score-over-time chart.

## Access
- Allowed roles: `student`
- Ownership rule: token-scoped; every query filters `studentId === currentUser.id`

## Entry points
- From: avatar account menu → "Tiến độ học tập"; deep link `/student/progress`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Heatmap + skill breakdown (S-ANL-1) | `GET /api/v1/student/progress` | `data` |
| Score-over-time chart (S-ANL-2) | `GET /api/v1/student/progress/chart` | `data.points[]` |

The owner approved the analytics slice after PR #73 merged. Streak, XP, rank, badges and peer data remain outside this page because their contracts are separate.

## Regions
1. Page Header: eyebrow "Cộng đồng", title "Tiến độ học tập"
2. Own graded-attempt metrics
3. Eight-full-week skill heatmap
4. Skill breakdown and twelve-full-week average-score chart with table alternative

## States
- [x] Loading — skeleton
- [x] Ready — live API data
- [x] Empty — no graded attempts
- [x] Partial — `null` cells and skills render as `—`
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Toggle chart/table | button | Show the same score points in an accessible table | — |

## Out of scope
Per-assignment scores (S-ANL-3); class-average comparison (S-ANL-5); teacher dashboards; XP, streak, rank, badges and leaderboard.
