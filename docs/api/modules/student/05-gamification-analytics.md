---
module: student-gamification-analytics
status: accepted — owner-approved bounded slice 2026-09-16
blocked_by: none for leaderboard and four attempt badges
owner: project owner
last_updated: 2026-09-16
---

# Student leaderboard and attempt badges

## 0. Summary

Read-only analytics over official graded attempts. This module deliberately excludes XP, streak,
retention and social identities. It creates no table and awards no spendable value.

## 1. Tables touched

`Attempt` read-only. Leaderboard aggregates all eligible students; badges read only the caller's
rows. No MongoDB read, cross-store write, migration or seed.

## 2. Endpoints and DTOs

| Method | Path | Response `data` |
|---|---|---|
| GET | `/api/v1/student/leaderboard` | `{ rows, me, eligibleCount }` |
| GET | `/api/v1/student/badges` | `{ badges, earnedCount }` |

Leaderboard row: `{ rank, alias, score, gradedAttempts, isYou }`. `rows` contains at most 20;
`me` is the caller's row even when outside the top 20, or `null` when ineligible. Score is
`sum(totalScore) / sum(maxScore) * 100`, rounded to two decimals.

Badge: `{ id, title, description, target, current, earned, earnedAt }`. Fixed catalog:
`first-grade` (1 graded attempt), `five-grades` (5), `ten-grades` (10), `perfect-score`
(one attempt with `totalScore / maxScore = 100%`).

## 3. Invariants

| ID | Invariant |
|---|---|
| INV-GAME-01 | Only `status=graded`, `isOfficialGrade=true`, non-null score, positive max and gradedAt feed either endpoint |
| INV-GAME-02 | Leaderboard eligibility requires at least three qualifying attempts |
| INV-GAME-03 | Ranking sorts score desc, attempt count desc, stable alias asc; ranks are deterministic |
| INV-GAME-04 | Peer rows expose only alias, score and attempt count; no id, name, nickname, email, avatar, question or class field |
| INV-GAME-05 | Alias is stable and derived from an irreversible hash of student id; it is not a profile field |
| INV-GAME-06 | Badge progress is computed server-side from the caller's rows; the request accepts no user id or progress value |
| INV-GAME-07 | `earnedAt` is the qualifying attempt's `gradedAt`; locked badges return null |
| INV-GAME-08 | Empty/ineligible history is 200 with an empty board or locked catalog; roles other than student are 403 |

## 4. Transactions and concurrency

Reads are side-effect free. A grade arriving during a read may appear on the next request. Badge
definitions are constants in server code, so duplicate rows and concurrent-award writes do not exist.

## 5. Error mapping

Anonymous uses existing auth 401 codes. Non-student uses `AUTH_INSUFFICIENT_ROLE` 403. There are
no params or body and no new error code.

## 6. Privacy and security

The leaderboard is the single approved exception to own-row reads, limited to aggregate rows with
irreversible aliases. It has no profile join and no opt-out/profile discovery surface. Badges always
filter `studentId=currentUser.id`. Neither endpoint logs attempt content.

## 7. Test matrix

E2e covers the three-attempt threshold, normalization, deterministic tie-break, top-20 plus caller,
absence of identity/content fields, own-only badges, milestone timestamps, perfect-score condition,
empty history, teacher 403 and anonymous 401.

## 8. Out of scope

XP/rewards, streaks, retention tabs, named rivals, avatars, public profiles, notifications, badge
persistence, custom badge catalogs and quiz-room realtime boards require separate approved contracts.
