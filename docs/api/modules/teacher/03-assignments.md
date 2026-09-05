# MODULE SPEC — Teacher 03: Assignments

---
module: teacher-assignments
status: proposed
blocked_by: —
owner: BE owner (unset)
last_updated: 2026-09-03
---

> Cross-DB boundary lives here: `Assignment` is PostgreSQL but `questionIds[]` references
> MongoDB `Question._id` (DEBT-001 — no cross-DB transaction; see §7).

## 0. Summary

Create, list, read (with submission stats), update and delete assignments for the teacher's
own classes. Publishing (`status: draft → published`) makes an assignment visible to students
and emits the `new_assignment` notification.

Sources, verbatim: `API_TEACHER.md` § Assignments, `ENTITY_ASSIGNMENT.md`,
`ENTITY_ATTEMPT.md` (stats), `ENTITY_NOTIFICATION.md` (`new_assignment`),
`03-classes-enrollment.md` (class ownership), `RBAC_MATRIX.md`.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `Assignment` | R+W | whole module |
| `Class` | R only | ownership + same-class check |
| `Attempt` | R only | submission stats + edit/delete gate |
| `LessonAssignment` | R only | delete gate below uses attempts, link cleanup on delete |
| `questions` (MongoDB) | R only | `questionIds` existence validation at write time |
| `Notification` | W only | `new_assignment` on publish |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/teacher/assignments` | teacher | Create assignment | defined |
| GET | `/teacher/assignments` | teacher (own) | List assignments — `?classId=&status=&type=&page=&limit=` | defined |
| GET | `/teacher/assignments/:id` | teacher (own) | Assignment + submission stats | defined |
| POST/PATCH/DELETE as above | | | | |

Full set: `POST /teacher/assignments` · `GET /teacher/assignments` ·
`GET /teacher/assignments/:id` · `PATCH /teacher/assignments/:id` ·
`DELETE /teacher/assignments/:id`.

## 3. DTO

### 3.1 POST `/teacher/assignments` — request

| Field | Type | Required | Constraint |
|---|---|---|---|
| `classId` | uuid | yes | must exist and be the caller's own class |
| `title` | string | yes | 1–300 chars |
| `type` | enum | yes | `homework` / `mock_test` |
| `dueDate` | DateTime (UTC ISO 8601) | no | nullable = no deadline |
| `timeLimitMinutes` | int | yes when `type = mock_test` | `> 0`; must be null/absent for `homework` |
| `status` | enum | no | `draft` (default) / `published` — may be set directly at create |
| `questionIds` | string[] | yes | ≥ 1 item; every id must exist in MongoDB; duplicates rejected; order = display order |

Response `201`:

```json
{ "data": { "id": "uuid", "classId": "uuid", "teacherId": "uuid", "title": "…",
            "type": "mock_test", "dueDate": "2026-09-20T17:00:00Z",
            "timeLimitMinutes": 60, "status": "draft",
            "questionIds": ["68a1…", "68a2…"],
            "createdAt": "…", "updatedAt": "…" } }
```

`teacherId` server-assigned = the class owner.

### 3.2 GET `/teacher/assignments` — list

Row: `{ id, classId, className, title, type, status, dueDate, timeLimitMinutes,
questionCount, submittedCount, gradedCount, createdAt, updatedAt }` + `meta`.

### 3.3 GET `/teacher/assignments/:id` — detail + stats

Assignment fields (incl. `questionIds`) plus, **derived from `Attempt` at read time**
(ENTITY_ASSIGNMENT: "Submission count & pending grading count computed from Attempt records"):

```json
"stats": { "enrolledActive": 12, "submittedCount": 5, "gradedCount": 2,
           "pendingGradingCount": 3, "inProgressCount": 4, "notStartedCount": 3 }
```

- `enrolledActive` = active enrollments of the class
- counts by `Attempt.status` (`in_progress` / `submitted` / `graded`)
- `notStartedCount` = `enrolledActive − (submitted + inProgress + graded)`, floor 0

### 3.4 PATCH `/teacher/assignments/:id`

Writable: `title`, `type`, `dueDate`, `timeLimitMinutes`, `status`, `questionIds` — same
constraints as create, including the Mongo existence check. `classId`, `teacherId` are never
writable (an assignment cannot move between classes).

### 3.5 DELETE → `204`.

## 4. Business rules (invariants)

| ID | Invariant |
|---|---|
| INV-TASG-01 | Ownership: `assignment.teacherId === currentUser.id` at the service layer (list filters by it). Unknown id → `404 ASSIGNMENT_NOT_FOUND`. |
| INV-TASG-02 | `type = mock_test` requires `timeLimitMinutes > 0`; `homework` must not carry one (ENTITY_ASSIGNMENT). |
| INV-TASG-03 | `questionIds` is non-empty, duplicate-free, and **every id exists in MongoDB at write time** (validated before the Postgres write — §7). A missing id → `404 QUESTION_NOT_FOUND`. |
| INV-TASG-04 | An assignment with at least one `Attempt` (any status) cannot be edited or deleted (ENTITY_ASSIGNMENT: "Cannot delete/edit assignment that has at least 1 Attempt") → `409 ASSIGNMENT_ALREADY_SUBMITTED`. |
| INV-TASG-05 | Only `published` assignments are visible to students. `status` moves `draft → published` via PATCH; **`published → draft` (un-publish) is not offered** — see §16-Q2. |
| INV-TASG-06 | Publishing (at create with `status=published`, or via PATCH) inserts one `new_assignment` Notification per **active-enrolled** student of the class, inside the same Postgres transaction as the status write. Never for drafts; never for dropped enrollments. |
| INV-TASG-07 | Stats in §3.3 are derived at read time from `Attempt`; no endpoint writes them; no count column exists. |
| INV-TASG-08 | `questionIds` order is the display order (ENTITY_ASSIGNMENT) — the array is stored and returned as submitted; it is never sorted or deduplicated silently. |

## 5. Ownership / RBAC

```
Teacher   assignment.teacherId === req.user.id        (service layer; the column equals
                                                       the owning class's teacherId)
Student   ❌ (students meet assignments via the student attempt lane)
Admin     ❌
```

## 6. State machine

```
draft ──publish (PATCH status)──► published
```

One-way at the API surface (INV-TASG-05). No other status values exist. Deletion is possible
from either status **only while zero Attempts exist** (INV-TASG-04).

## 7. Transaction boundary

- **Create / update**: (1) read-validate Mongo `questionIds` existence, then (2) Postgres
  write. Two stores, no shared transaction (DEBT-001). Order is deliberate: a failed Postgres
  write orphans nothing in Mongo; a question vanishing between (1) and commit is the accepted
  residual window (module 02-TQ §7).
- **Publish**: status write + N notification INSERTs — **one Postgres transaction**
  (module 04's INV-SESSION-08 pattern: notification in-TX with the state change).
- Delete: single row + FK cascade to `LessonAssignment` (links die with the assignment —
  ENTITY_LESSON_ASSIGNMENT rows cannot orphan).

## 8. Idempotency & concurrency

- Create has no idempotency key; duplicate submits create duplicate drafts (harmless).
- Two concurrent publishes: the notification INSERT...SELECT pattern keyed on
  `(userId, type, referenceId)` cannot be UNIQUE (ENTITY_NOTIFICATION has no such constraint) —
  a double-publish race can double-notify. Single-teacher writes make this unlikely;
  recorded in §16-Q5.
- Edit/delete gate (INV-TASG-04) re-checks the attempt count inside the same transaction as
  the write, so an attempt created concurrently with a delete aborts the delete.

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| Assignment id not found | 404 | `ASSIGNMENT_NOT_FOUND` | agreed |
| `classId` not the caller's / not found | 404 | `CLASS_NOT_FOUND` / `403 CLASS_ACCESS_DENIED` | agreed |
| `questionIds` empty | 400 | `ASSIGNMENT_NO_QUESTIONS` | agreed |
| `questionIds` references a missing Mongo id | 404 | `QUESTION_NOT_FOUND` | agreed |
| Edit/delete with ≥1 Attempt | 409 | `ASSIGNMENT_ALREADY_SUBMITTED` | agreed — **semantic stretch**: the code's text says "assignment already submitted"; here it means "has attempts". Sign-off in §16-Q1 |
| Field validation (title, type, timeLimitMinutes rule, duplicates, bad status) | 400 | `VALIDATION_ERROR` | agreed (fallback family) |

`ASSIGNMENT_PAST_DUE` belongs to the student submit lane, not this module.

## 10. Side effects & notifications

| Action | Notification | Recipient | referenceId / referenceType | payload |
|---|---|---|---|---|
| publish | `new_assignment` | every active-enrolled student of the class | `assignment.id` / `assignment` | `null` |

`ENTITY_NOTIFICATION.md` defines `new_assignment` ("Teacher publishes assignment") — no new
type is invented. No other side effects.

## 11. Index & query

- `Assignment(teacherId, createdAt DESC)` — list.
- `Assignment(classId, status)` — class filter.
- `Attempt(assignmentId, status)` — stats aggregation (`groupBy status`) — one query per
  detail read, not per-student.
- `ClassEnrollment(classId, status)` — `enrolledActive` count.

## 12. Migration & seed

Adds `Assignment` (per `ENTITY_ASSIGNMENT.md`: `text[]` `questionIds`, enums `type`, `status`).
Seed: 1 teacher, 2 classes, 4 assignments (homework draft / homework published / mock_test
published with `timeLimitMinutes` / mock_test draft), matching Mongo questions (module 02-TQ
seed), 2 attempts on the published homework (1 `submitted`, 1 `graded`).

## 13. Security & rate limit

- Publishing fans out to N students — rate-limit PATCH frequency per teacher (no numeric
  policy exists in `API_CONVENTIONS.md` yet — §16-Q4; the endpoint ships without a limit until
  one is set).
- `questionIds` must be treated as untrusted input: every element is validated against Mongo
  (INV-TASG-03), so a crafted id can only 404.

## 14. Observability

- Log: publish events (assignment id, recipient count), gate refusals (edit/delete blocked).
- Metric: `assignment_publish_recipients_total`, `assignment_stats_read_p95_ms`.

## 15. Test matrix

| INV | Type | Test |
|---|---|---|
| INV-TASG-01 | integration | teacher B on A's assignment → 403/404 per §9; list shows only own rows |
| INV-TASG-02 | unit + integration | mock_test without limit → 400; homework with limit → 400; mock_test with `timeLimitMinutes: 0` → 400 |
| INV-TASG-03 | integration (real DB) | empty array → `ASSIGNMENT_NO_QUESTIONS`; one dead Mongo id → `QUESTION_NOT_FOUND`, nothing written; duplicates → 400 |
| INV-TASG-04 | integration | seed 1 attempt → PATCH → 409; DELETE → 409; zero attempts → both succeed |
| INV-TASG-05 | integration | PATCH `status=published` on published → §16-Q2 branch; students cannot see draft (student-lane contract, recorded) |
| INV-TASG-06 | integration (real DB) | publish creates exactly `enrolledActive` notifications, none for dropped; publish fails → no notification rows (rollback); draft create emits none |
| INV-TASG-07 | integration | stats match seeded attempts exactly; write endpoints never touch them |
| INV-TASG-08 | unit | stored order equals submitted order; reversed submission reverses retrieval |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| Q1. `ASSIGNMENT_ALREADY_SUBMITTED` reused for "has attempts" (edit/delete gate). Its registry text is attempt-flavored. Confirm or add a dedicated code. | §9 mapping | BE owner | before coding |
| Q2. Is un-publish (`published → draft`) allowed while zero attempts exist? ENTITY says nothing; this spec omits it. | INV-TASG-05 completeness | PO | before coding |
| Q3. May an assignment be created for an **archived** class? (same open question as 01-TCL §16-Q2) | create gate | PO | before coding |
| Q4. No rate-limit policy exists anywhere for the publish fan-out. | §13 | BE owner | when `API_CONVENTIONS.md` gains a rate-limit section |
| Q5. Double-publish race can double-notify (no unique constraint on Notification). Accept or add one? | §8 | BE lead | before coding |
