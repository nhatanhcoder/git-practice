---
feature: S-ANL-4, S-GAME-5
role: student
route: /student/leaderboard
status: built (live)
last_updated: 2026-09-16
---

# Page Contract — Student · Leaderboard (S-ANL-4, S-GAME-5)

## Purpose
Show the learner's position in an anonymized ranking based on official graded-attempt score.

## Access
- Allowed roles: `student`
- Privacy rule: peers are stable aliases only; no id, name, email, avatar, content or profile link. The caller may see their own row.

## Entry points
- From: Student sidebar → "Bảng xếp hạng"; deep link `/student/leaderboard`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Ranked aggregation | `GET /api/v1/student/leaderboard` | `data.rows[]`, `data.me`, `data.eligibleCount` |

Eligibility requires three official graded attempts. Score is total earned divided by total possible, so assignments with different maxima remain comparable. The API returns top 20 plus the caller's rank.

## Regions
1. Page Header: eyebrow "Cộng đồng", title "Bảng xếp hạng"
2. Privacy/eligibility explanation
3. Ranked list with alias, normalized score and graded-attempt count
4. The signed-in learner's own row

## States
- [x] Loading — skeleton
- [x] Ready — live anonymized rows
- [x] Empty — nobody meets the three-attempt threshold
- [x] Partial — caller is ineligible or outside top 20; `me` explains their state
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Retry | error action | Refetch the single endpoint | auth errors |

## Out of scope
Named users, profiles, XP, streak, retention, time filters and quiz-room realtime boards.
