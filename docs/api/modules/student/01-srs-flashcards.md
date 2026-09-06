---
module: student-srs-flashcards
status: accepted
blocked_by: vocabulary source for production seed; streak timezone
owner: project owner
last_updated: 2026-09-05
---

## 0. Summary

Owns the platform flashcard catalog reads and each student's private SM-2 state. It implements
S-SRS-1 through S-SRS-5 only; saved-word behavior S-SRS-6/7 remains outside this four-endpoint
contract.

## 1. Tables touched

| Collection | Read/Write | Notes |
|---|---|---|
| `flashcards` | Read | Platform-owned catalog; no Student write |
| `user_flashcard_states` | Read/Write | One private state per `(userId, flashcardId)` |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/api/v1/student/flashcards?hskLevel=3&page=1&limit=20` | Student | Browse one HSK level | defined |
| GET | `/api/v1/student/flashcards/due` | Student | Up to 20 due cards, overdue first | defined |
| POST | `/api/v1/student/flashcards/:id/review` | Student | Apply SM-2 rating | defined |
| GET | `/api/v1/student/flashcards/stats` | Student | Private aggregate stats | defined |

## 3. DTO

Browse query: `hskLevel` integer 1–9 required; `page` positive integer default 1; `limit` 1–100
default 20. Review request: `{ rating: 0 | 3 | 4 | 5 }`. Card responses expose Mongo `_id` as
`id` and may include the caller's state; they never expose another user's id or state. Stats:
`totalCards`, `dueToday`, `matureCards`, `retentionRate`, `totalReviews`, and `streak: null` until
the product timezone rule is accepted.

## 4. Business rules (invariants)

| ID | Invariant |
|---|---|
| INV-SRS-01 | HSK level is an integer from 1 through 9 |
| INV-SRS-02 | Students can read catalog cards but cannot create/update/delete them |
| INV-SRS-03 | State is scoped by the authenticated `userId`; client input cannot select it |
| INV-SRS-04 | `(userId, flashcardId)` is unique |
| INV-SRS-05 | Public ratings are exactly Again=0, Hard=3, Good=4, Easy=5 |
| INV-SRS-06 | Rating below 3 resets repetitions to 0 and interval to 1 day |
| INV-SRS-07 | Successful intervals are 1 day, 6 days, then rounded previous interval × EF |
| INV-SRS-08 | EF is recalculated for every rating and never falls below 1.3 |
| INV-SRS-09 | Due means `nextReviewDate <= now`, ordered oldest first, limit 20 |
| INV-SRS-10 | First review creates state; later reviews update the same state |
| INV-SRS-11 | Retention is correct reviews divided by total reviews, zero when no reviews |
| INV-SRS-12 | Missing/malformed card ids return `FLASHCARD_NOT_FOUND` |

## 5. Ownership / RBAC

Controller requires `role=student`. Every state query includes `userId === currentUser.id` in the
service; no endpoint accepts `userId`. The catalog itself is common read-only data.

## 6. State machine

`unseen → learning/reviewing → due → reviewed → scheduled`. A failed review resets the interval
but does not delete history. `isSavedByUser` is not mutated by this module.

## 7. Transaction boundary

MongoDB only. Catalog reads do not cross Postgres. State creation uses an upsert protected by the
compound unique index; a review updates scheduling and counters in one document operation.

## 8. Idempotency & concurrency

Review submissions are learning events, not idempotent requests: two accepted submissions count
as two reviews. The unique index prevents two state rows. A future idempotency-key contract is
required before offline replay can be supported.

## 9. Error → code mapping

| Error branch | HTTP | Code | Registry status |
|---|---:|---|---|
| Missing or malformed flashcard id | 404 | `FLASHCARD_NOT_FOUND` | exists |
| Rating outside 0/3/4/5 | 400 | `FLASHCARD_INVALID_RATING` | exists |
| Invalid query field | 400 | `VALIDATION_ERROR` | exists |
| Non-Student caller | 403 | `AUTH_INSUFFICIENT_ROLE` | exists |

## 10. Side effects & notifications

None. SRS review does not create an official grade, XP, badge or notification until those event
contracts exist.

## 11. Index & query

`flashcards: {hskLevel:1,hanzi:1}`; `user_flashcard_states: {userId:1,flashcardId:1}` unique and
`{userId:1,nextReviewDate:1}` for the due queue.

## 12. Migration & seed

Mongoose creates collections/indexes; no Prisma migration. Tests create and remove their own card.
Production seed is `NOT IMPLEMENTED`: the located external corpus contains no vocabulary file.

## 13. Security & rate limit

JWT + global role guard. Never return `userId`. The review endpoint should receive a rate limit
before public production deployment; no rate-limit value is currently approved.

## 14. Observability

Measure due-queue latency, review count, duplicate-index failures and cards whose referenced
catalog row is missing. Do not log vocabulary answers as sensitive user activity.

## 15. Test matrix

| INV | Test type | Description |
|---|---|---|
| INV-SRS-01 | e2e | reject HSK 10 |
| INV-SRS-02 | e2e | Teacher receives 403 on Student catalog route |
| INV-SRS-03 | e2e | second Student sees no first-Student state |
| INV-SRS-04 | e2e | first review creates one state |
| INV-SRS-05 | e2e | reject rating 2 |
| INV-SRS-06 | unit | Again resets repetitions/interval |
| INV-SRS-07 | unit | first successful interval is one day |
| INV-SRS-08 | unit | EF floor remains 1.3 |
| INV-SRS-09 | e2e | due endpoint is ownership-scoped |
| INV-SRS-10 | e2e | first review creates state |
| INV-SRS-11 | e2e | one correct review produces 100% retention |
| INV-SRS-12 | e2e | malformed id maps to registry code |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| Vocabulary source/import license | production catalog seed | content owner | before deploy |
| Product timezone for streaks | non-null `stats.streak` | product owner | before S-SRS-5 closes |
| Saved-word endpoints/DTOs | S-SRS-6/7 | API owner | before those features |

