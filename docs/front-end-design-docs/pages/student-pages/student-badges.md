---
feature: S-GAME-4
role: student
route: /student/badges
status: contracted (live API approved)
last_updated: 2026-09-16
---

# Page Contract — Student · Badge Collection (S-GAME-4)

## Purpose
Show the badges the learner has earned and the full badge catalog with unlock conditions.

## Access
- Allowed roles: `student`
- Ownership rule: token-scoped; server reads only `studentId=currentUser.id`

## Entry points
- From: Student sidebar → "Kho huy hiệu"; deep link `/student/badges`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| My badges + fixed catalog | `GET /api/v1/student/badges` | `data.badges[]`, `data.earnedCount` |

The approved initial catalog has four server-authoritative conditions: 1, 5 and 10 official graded attempts, plus one 100% official graded attempt. No client unlock write exists.

## Regions
1. Page Header: eyebrow "Cộng đồng", title "Kho huy hiệu"
2. Earned count and catalog progress
3. Four-card catalog with locked/unlocked state and factual progress
4. Badge detail (drawer/modal — no route change)

## States
- [x] Loading — skeleton
- [x] Ready — live server-computed catalog
- [x] Empty — all four catalog items locked with zero progress
- [x] Partial — some badges earned, others locked
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Filter catalog | all / earned / locked | refilter the returned catalog locally | — |
| Inspect badge | badge click | open detail with unlock condition | — |

## Out of scope
XP totals/rewards, streak, vocabulary/community/content badges, notifications and persisted award rows.
