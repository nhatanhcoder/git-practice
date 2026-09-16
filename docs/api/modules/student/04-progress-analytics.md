---
module: student-progress-analytics
status: proposed — design slice 2026-09-12 (code waits for PR #73, which creates `AttemptAnswer`)
blocked_by: PR #73 merge (AttemptAnswer table) · streak calendar/timezone rule · XP/badge/leaderboard decisions (§16)
owner: project owner
last_updated: 2026-09-12
---

## 0. Summary

Read-only self analytics (S-ANL-1/2/3): a skill × week heatmap, an average-score
chart and per-assignment scores, aggregated exclusively from the learner's own
graded attempts. No new tables, no XP economy, no streak computation, no peer
data. The two paths already exist as rows in `API_STUDENT.md` (§ Progress &
Analytics); this module gives them the contract that section says is missing.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `Attempt` | Read | own rows with `status = graded` only |
| `AttemptAnswer` | Read | correctness + scores per answer (needs PR #73) |
| `Assignment` | Read | title for the score list |
| `questions` (MongoDB) | Read | `skill` per question id, single `$in` join |

No writes anywhere in this module. No cross-store writes (Mongo is read-only).

## 2. Endpoints

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/api/v1/student/progress` | Heatmap (trailing 8 full weeks) + skill breakdown + totals | defined |
| GET | `/api/v1/student/progress/chart` | Average-score points (trailing 12 full weeks) | defined |

No query params (fixed windows keep the contract minimal; params arrive only with a
consumer). No pagination (bounded windows).

## 3. DTO

Heatmap cell = ratio of correct answers in (week, skill), `null` when the learner
answered nothing in that cell. Weeks start Monday 00:00 UTC (`weekStart` ISO).

```json
{ "data": {
  "heatmap": [{ "weekStart": "…", "listening": 0.75, "reading": null, "writing": 0.5 }],
  "skillBreakdown": { "listening": 0.8, "reading": null, "writing": 0.6 },
  "totals": { "gradedAttempts": 5, "avgScore": 7.4 }
} }
```

Chart point = average `totalScore` of attempts submitted that week (`count` rows behind it):

```json
{ "data": { "points": [{ "weekStart": "…", "avgScore": 7.4, "count": 2 }] } }
```

Empty history is `200` with empty arrays and `null` totals — never 404. There is no
`streak` field at all (not even null): the calendar/timezone rule is unapproved and a
new endpoint must not mint a second null-streak convention next to stats' one.

## 4. Business rules (invariants)

| ID | Invariant |
|---|---|
| INV-ANL-01 | Every row aggregated belongs to the caller; no endpoint accepts `userId` or a peer id |
| INV-ANL-02 | Only `graded` attempts feed the aggregates; `in_progress`/`submitted` are invisible here |
| INV-ANL-03 | `null` means "no data", never 0 — an unplayed week/skill must not read as failure |
| INV-ANL-04 | History survives drops: attempts from dropped classes still count (PERMISSIONS_STUDENT keeps past attempts) |
| INV-ANL-05 | A question deleted from the bank after grading leaves the skill cells (numerator and denominator) but the attempt still counts in totals and charts |
| INV-ANL-06 | No question content crosses this boundary — ratios and titles only, never `correctAnswer`, prompts or peer rows |
| INV-ANL-07 | Week buckets are UTC Monday 00:00; the timezone caveat is recorded, not solved, here |

## 5. Ownership / RBAC

`@Roles('student')` + `studentId === currentUser.id` on every query (the established
student-lane shape). No teacher/admin route in this module (class analytics is T-ANL,
a separate module). Fits the existing matrix row pattern "read own" — no new grant.

## 6. State machine

None — pure reads over attempt states owned elsewhere.

## 7. Transaction boundary

Reads only: Postgres attempt/answer/assignment reads + one Mongo `$in` for skills.
No transaction needed; no locks held.

## 8. Idempotency & concurrency

Reads are side-effect free. A grade landing mid-read may move one attempt between
snapshots — acceptable for analytics; no locking.

## 9. Error → code mapping

| Error branch | HTTP | Code | Registry status |
|---|---|---|---|
| Anonymous | 401 | auth codes | exists |
| Non-student caller | 403 | `AUTH_INSUFFICIENT_ROLE` | exists |

No validation surface (no params, no body) and no new codes.

## 10. Side effects & notifications

None.

## 11. Index & query

```
Attempt: (studentId, status) — own graded rows
AttemptAnswer: (attemptId) — answers per attempt
questions: existing _id index — single $in per request (N+1 forbidden)
```

Heatmap over 8 weeks × 3 skills runs at most 1 + 1 + 1 queries; chart adds one
grouped read. No per-week fan-out.

## 12. Migration & seed

None — reads existing tables (after PR #73). No seed rows.

## 13. Security & rate limit

Own-rows-only predicates on every query (the leaderboard's cross-user risk does not
exist here). No per-endpoint rate limit approved (same open item as modules 01/02-WB/03).

## 14. Observability

Count progress/chart reads and empty-history responses (tells whether learners have
anything to see). No answer contents in logs.

## 15. Test matrix

| INV | Test type | Description |
|---|---|---|
| INV-ANL-01 | e2e | second student's graded attempts never move the first student's cells |
| INV-ANL-02 | e2e | submitted (ungraded) attempts excluded from every cell and point |
| INV-ANL-03 | e2e | untouched week/skill reads `null`, rendered as "—", never 0 |
| INV-ANL-04 | e2e | attempt from a dropped class still counts in history |
| INV-ANL-05 | e2e | deleted-bank-question attempt: skill cells shrink, totals keep it |
| INV-ANL-06 | e2e | payload contains no `correctAnswer`, prompt text or peer id |
| INV-ANL-07 | e2e | week buckets align to UTC Monday boundaries |
| shape | e2e | empty history → 200, empty arrays, null totals; anonymous → 401 |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| XP economy (curve broken, DEBT-003) + XP event sources | S-GAME-1/2, badges, any XP figure | product owner | before any XP code |
| Streak calendar/timezone rule | streak anywhere (stats returns null today) | product owner | before S-SRS-5 closes |
| Badge catalog + server-authoritative unlocks | S-GAME-4 cabinet | product owner | before badge code |
| Leaderboard scope/privacy/opt-out | S-ANL-4, S-GAME-5 | product owner | before board code |
| `skill` widening 3 → 7 if F9–F16 land | heatmap columns | product owner | with catalog scope |
| Teacher class analytics (T-ANL-1..4) | separate module, not this one | BE owner | own slice |
| PR #73 merge (AttemptAnswer table) | implementing this module at all | merge review | before code slice |
