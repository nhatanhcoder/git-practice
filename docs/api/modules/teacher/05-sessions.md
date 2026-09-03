# MODULE SPEC — Teacher 05: Sessions (teacher side)

---
module: teacher-sessions
status: proposed
blocked_by: transition error codes missing (§9) · rejected→resubmit undecided (Q-SES-2)
owner: BE owner (unset)
last_updated: 2026-09-03
---

> This module is the missing **producer half** of `04-sessions-attendance.md` (Admin). That
> spec's own §16/API-004 says: without teacher-side endpoints, nothing can ever move a session
> into `completed_pending`, so `GET /admin/sessions/pending` is permanently empty and
> `session_submitted_for_review` has no producer. This spec closes that hole. The Admin
> approve/reject half stays in module 04 — nothing there is redefined here.

## 0. Summary

A teacher schedules a session for their class, runs it (start → end, actual times), records
per-student attendance, and submits it for Admin review. Read: list own sessions. The state
machine is **shared** with module 04; only the teacher-side transitions are implemented here.

Sources, verbatim: `API_TEACHER.md` § Sessions, `ENTITY_CLASS_SESSION.md`,
`ENTITY_SESSION_ATTENDANCE.md`, `docs/api/modules/04-sessions-attendance.md` (state machine,
INV-SESSION-01…15), `ENTITY_NOTIFICATION.md`, `RBAC_MATRIX.md`.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `ClassSession` | R+W | create + teacher-side transitions |
| `SessionAttendance` | R+W | upsert per student |
| `Class` | R only | ownership + archived-class gate question (§16-Q2) |
| `ClassEnrollment` | R only | markable students = active enrollments |
| `User` | R only | admin fan-out recipients |
| `Notification` | W only | `session_submitted_for_review` |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/teacher/sessions` | teacher | Create session (`status = scheduled`) | defined |
| PATCH | `/teacher/sessions/:id/start` | teacher (own) | `scheduled → in_progress`, sets `actualStart` | defined |
| PATCH | `/teacher/sessions/:id/end` | teacher (own) | sets `actualEnd` (still `in_progress`) | defined |
| PATCH | `/teacher/sessions/:id/submit` | teacher (own) | `in_progress → completed_pending` + notify Admin | defined |
| POST | `/teacher/sessions/:id/attendance` | teacher (own) | Record attendance (upsert per student) | defined |
| GET | `/teacher/sessions` | teacher (own) | List own sessions — `?classId=&status=&from=&to=` | defined |

## 3. DTO

Field names are the **canonical** `ENTITY_CLASS_SESSION.md` ones (`scheduledDate`,
`scheduledStart`, `scheduledEnd`, `topic`). `docs/flows/FLOW_SESSION_ATTENDANCE.md` uses
`sessionDate` / `startTime` / `endTime` / `lessonTopic` — legacy naming, **not** used here
(§16-Q7).

### 3.1 POST `/teacher/sessions` — request

| Field | Type | Required | Constraint |
|---|---|---|---|
| `classId` | uuid | yes | must be the caller's own class |
| `scheduledDate` | Date `YYYY-MM-DD` | yes | VN-local planned date (module 05 Q-PAY-1 anchors payroll on it) |
| `scheduledStart` | Time `HH:mm` | yes | — |
| `scheduledEnd` | Time `HH:mm` | yes | must be > `scheduledStart` |
| `topic` | string | yes | 1–300 chars |
| `notes` | string | no | nullable |

Response `201`: the session row, `status: "scheduled"`, `actualStart`/`actualEnd`/`
rejectionReason`/`payrollPeriodId` all `null`. `teacherId` server-assigned = class owner.

### 3.2 PATCH `/teacher/sessions/:id/start` / `/end` / `/submit`

`start` and `submit`: **empty body**. `end`: empty body. All three set their timestamps
server-side (`actualStart = now()`, `actualEnd = now()`, UTC) — a client-supplied time is
never accepted (audit integrity; module 05 §3 relies on these for `per_hour` money).

Responses: the updated session row. On `submit`, `attendanceSummary` (derived, §3.4) is
included.

### 3.3 POST `/teacher/sessions/:id/attendance` — request

```json
{ "attendance": [
    { "studentId": "uuid", "status": "present" },
    { "studentId": "uuid", "status": "absent_excused" },
    { "studentId": "uuid", "status": "absent_unexcused" }
  ] }
```

Rows are `{ studentId, status }` only — `SessionAttendance` has **no `notes` column** (entity
fields: id, sessionId, studentId, status, timestamps), so no per-student note may be sent.
`status` ∈ `present` / `absent_excused` / `absent_unexcused`. Response `200`:
`{ "data": { "marked": 11 } }`.

### 3.4 GET `/teacher/sessions` — list + derived summary

Row: `{ id, classId, className, scheduledDate, scheduledStart, scheduledEnd, actualStart,
actualEnd, topic, notes, status, rejectionReason, payrollPeriodId, attendanceSummary,
createdAt, updatedAt }` + `meta`.

`attendanceSummary` — derived at read time, module 04 §3.1 verbatim:

```json
{ "present": 8, "absentExcused": 1, "absentUnexcused": 2,
  "marked": 11, "enrolledActive": 12 }
```

`marked` = present + absentExcused + absentUnexcused; `enrolledActive` = active enrollments
of the class. INV-SESSION-12 (inherited): derived, never stored, never writable.

## 4. Business rules (invariants)

**Inherited from module 04** (enforced by these endpoints, not redefined):
INV-SESSION-01 (only `completed_pending` reviewable — Admin side), INV-SESSION-02 (`approved`
one-way), INV-SESSION-03 (approved + payrollPeriodId → globally immutable — every teacher-side
UPDATE carries `WHERE payrollPeriodId IS NULL`), INV-SESSION-05 (`rejectionReason` only on
`rejected`), INV-SESSION-06 (teacher never writes `payrollPeriodId`), INV-SESSION-11
(`UNIQUE(sessionId, studentId)`), INV-SESSION-12 (summary derived), INV-SESSION-13 (when both
actuals non-NULL, `actualEnd > actualStart`).

**New — teacher side:**

| ID | Invariant |
|---|---|
| INV-TSES-01 | Create requires `classId` resolving to the caller's own class; `teacherId` is copied from the class, never taken from the payload. New sessions start `status = scheduled` with all actual/rejection/payroll fields NULL. |
| INV-TSES-02 | `start` is valid only from `scheduled`; it sets `actualStart = now()` (UTC, server clock) and moves to `in_progress`. Any other source status → blocked (§9 transition gap). |
| INV-TSES-03 | `end` is valid only from `in_progress`; it sets `actualEnd = now()`. Status does not change. Because `actualStart` is already set, INV-SESSION-13 (`actualEnd > actualStart`) is enforced — the clock makes equals impossible. |
| INV-TSES-04 | `submit` is valid only from `in_progress`; it moves to `completed_pending`. Per module 04, submit does **not** require `actualEnd` (Q-SES-3 is decided at approve time on the Admin side; the already-built FE additionally gates it client-side — recorded, §16-Q4). |
| INV-TSES-05 | On submit commit, one `session_submitted_for_review` Notification is inserted **per Admin** (`role = admin`), referenceType `session`, inside the same transaction as the status write. Fan-out-to-all-admins is the working reading of module 04 §10's open point — §16-Q3. |
| INV-TSES-06 | Attendance upserts: one row per `(sessionId, studentId)`; every `studentId` must hold an **active enrollment** in the session's class; `status` ∈ the 3-value enum. Markable while `status ∈ {in_progress, completed_pending}` — blocked once `approved`/`rejected` (§16-Q5). |
| INV-TSES-07 | The teacher-side endpoints never write `rejectionReason` (Admin-only, INV-SESSION-05 corollary) and never write `payrollPeriodId` (INV-SESSION-06). |
| INV-TSES-08 | List returns only `teacherId = currentUser` sessions; filters compose (`classId`, `status`, date range on `scheduledDate`, both ends inclusive). |
| INV-TSES-09 | `topic` is required (1–300) at create and updatable only before `completed_pending` — after submit the session awaits Admin review; module 04 owns it from there. (No teacher-side edit endpoint exists — §16-Q6 records the rejected-session edit question, Q-SES-2.) |

## 5. Ownership / RBAC

```
Teacher   session.teacherId === req.user.id       (service layer; teacherId copied from
                                                   the class at create — INV-TSES-01)
Student   ❌ (attendance read-own lives in the student lane)
Admin     ❌ direct endpoints; Admin reads via module 04's /admin/sessions/pending
```

`RBAC_MATRIX.md`: `ClassSession create/log = 🔒 Teacher`, `SessionAttendance mark = 🔒 Teacher`.

## 6. State machine

Module 04 §6 verbatim — teacher-side rows highlighted:

```
 scheduled ──────► in_progress ──────► completed_pending ──► approved   (Admin, one-way)
  POST+start (T)     end (T)             submit (T)      └─► rejected  (Admin)
                                                        re-submit: UNDECIDED (Q-SES-2)
```

| From | To | Who | Endpoint |
|---|---|---|---|
| `scheduled` | `in_progress` | teacher | `PATCH /teacher/sessions/:id/start` |
| `in_progress` | `completed_pending` | teacher | `PATCH /teacher/sessions/:id/submit` |
| `completed_pending` | `approved` / `rejected` | admin | module 04 (NOT here) |
| `rejected` | `completed_pending` | — | **does not exist** (Q-SES-2) |

## 7. Transaction boundary

- **start / end / submit**: conditional UPDATE (`WHERE id = :id AND teacherId = :user AND
  status = :expected AND payrollPeriodId IS NULL`) + row-count check — atomic by construction;
  no read-then-write race. Submit adds the notification INSERTs **in the same transaction**
  (module 04 INV-SESSION-08 pattern).
- **attendance**: N upserts (`ON CONFLICT (sessionId, studentId) DO UPDATE`) — one transaction;
  a bad `studentId` aborts the whole batch (no partial roster).
- Create: single INSERT (code generation not involved).

## 8. Idempotency & concurrency

- `start` called twice: the second hits `status ≠ scheduled` → transition error (§9 gap).
- Attendance is idempotent by upsert — re-marking overwrites.
- Submit racing attendance: attendance's status precondition (`in_progress` or
  `completed_pending`) tolerates both orderings.
- `WHERE payrollPeriodId IS NULL` on every UPDATE (INV-SESSION-03) makes the payroll lock
  race-free.

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| Session id not found / not the caller's | 404 | `SESSION_NOT_FOUND` | agreed |
| Class not found / not the caller's | 404 / 403 | `CLASS_NOT_FOUND` / `CLASS_ACCESS_DENIED` | agreed |
| `start`/`end`/`submit` from a wrong source status | 409 | ⛔ **no valid code** — `SESSION_ALREADY_REVIEWED` is Admin-flavored ("already approved or rejected"); the code FLOW uses for this branch (SESSION_ALREADY_SUBMITTED, unregistered) must not be used either | gap — §16-Q1 |
| Attendance: unknown student / non-active enrollment | 400 | `VALIDATION_ERROR` | agreed (fallback family) |
| Attendance: bad `status` value | 400 | `VALIDATION_ERROR` | agreed |
| Field validation (topic, times, date order) | 400 | `VALIDATION_ERROR` | agreed |

## 10. Side effects & notifications

| Action | Notification | Recipient | referenceId / referenceType | payload |
|---|---|---|---|---|
| submit commit | `session_submitted_for_review` | every Admin (`role = admin`) | `session.id` / `session` | `null` |

This is the **producer** module 04 §10 says does not exist (API-004). `session_approved` /
`session_rejected` remain module 04's (Admin) outputs. No other side effects; no email.

## 11. Index & query

- `ClassSession(teacherId, scheduledDate)` — list + date filter.
- `ClassSession(classId, status)`.
- `SessionAttendance(sessionId)` (unique `(sessionId, studentId)`) — summary `groupBy status`.
- Summary per session in the list: one `groupBy(sessionId, status)` over the page's session
  ids — no per-row queries (N+1 forbidden).
- Admin fan-out: `User(role = admin)` — index on `role` (module 02-users concern).

## 12. Migration & seed

Adds `ClassSession` + `SessionAttendance` per their entity specs (enums `status` ×2; FK
`payrollPeriodId` nullable — the `PayrollPeriod` table is created by module 06-TINC in the
same migration set; ordering noted there). Seed: sessions in all 5 statuses for the seeded
teacher (1 `scheduled`, 1 `in_progress` with `actualStart`, 1 `completed_pending` with
attendance for 3 students, 1 `approved`, 1 `rejected` with `rejectionReason`), one session
for a **second** teacher (ownership tests).

## 13. Security & rate limit

- `actualStart`/`actualEnd` come from the server clock — a teacher cannot backdate teaching
  time (it prices `per_hour` payroll, module 05).
- Attendance accepts only ids with active enrollment — no writes about arbitrary students.
- `rejectionReason` never writable here (Admin's audit text).
- Create is unthrottled (no policy exists — same registry gap as 03-TASG §16-Q4).

## 14. Observability

- Log: every transition (session id, from → to, actor), submit fan-out size, attendance batch
  refusals.
- Metric: `session_submit_total`, `session_transition_rejected_total`, queue age for
  `completed_pending` (feeds Admin's pending screen).

## 15. Test matrix

| INV | Type | Test |
|---|---|---|
| INV-TSES-01 | integration | create on another teacher's class → 403; `teacherId` in payload ignored; new row has status `scheduled`, null actuals |
| INV-TSES-02 | integration | start from `scheduled` → `in_progress` + `actualStart` set; start twice → transition error; start an `approved` session → blocked |
| INV-TSES-03 | integration | end from `in_progress` → `actualEnd` set, status unchanged; end before start → blocked; `actualEnd > actualStart` holds (INV-SESSION-13) |
| INV-TSES-04 | integration | submit from `in_progress` → `completed_pending`; submit without `actualEnd` succeeds (permissive per module 04 — §16-Q4 records the FE's stricter gate) |
| INV-TSES-05 | integration (real DB) | submit inserts one notification per admin, in-tx (rollback removes them); no notification on start/end |
| INV-TSES-06 | integration | upsert twice → one row, latest status; non-enrolled student → 400 whole batch; marking on `approved` session → blocked |
| INV-TSES-07 | integration | payload with `rejectionReason`/`payrollPeriodId` → never written |
| INV-TSES-08 | integration | list scoped to caller; filters compose; date range inclusive |
| INV-TSES-09 | integration | create requires topic 1–300; `scheduledEnd > scheduledStart`; no teacher edit endpoint exists post-create (negative probe) |
| inherited | integration | UPDATE on `approved + payrollPeriodId NOT NULL` row → 0 rows affected (INV-SESSION-03) |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| Q1. **No valid code for teacher-side transition errors** (start/end/submit from wrong status). The code FLOW uses here (SESSION_ALREADY_SUBMITTED) is unregistered; `SESSION_ALREADY_REVIEWED` is Admin-flavored. | §9 — the most-hit error branch in the module | BE owner (registry) | before coding |
| Q2. May a session be created for an **archived** class? (same open question as 01-TCL §16-Q2) | INV-TSES-01 gate | PO | before coding |
| Q3. Submit fan-out: **all admins** (FLOW §5 mechanism) vs one queue owner. Working reading: all admins. | INV-TSES-05 | PO | before coding |
| Q4. Q-SES-3 (inherited): submit is permissive about `actualEnd`; the Admin side must decide block-at-approve vs block-at-payroll. The built FE already gates client-side. | INV-TSES-04 boundary with module 04 | BE lead | before Admin payroll code |
| Q5. Attendance markable in `in_progress` + `completed_pending` — may it be edited **after** submit but before review? (working reading: yes) | INV-TSES-06 | PO | before coding |
| Q6. Q-SES-2 (inherited): `rejected` is a dead end — no teacher edit/resubmit endpoint exists in `API_TEACHER.md`. This spec adds none. | teacher recovery flow | PO | before student-facing launch |
| Q7. Field naming is canonical (`scheduledDate`/`topic`); FLOW_SESSION_ATTENDANCE's `sessionDate`/`lessonTopic`/`submittedAt` are legacy and unused. FLOW doc itself is flagged stale. | FE contract alignment | BE lead | when FLOW doc is swept |
