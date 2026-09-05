# SPEC 04 — Sessions & Attendance (Admin)

---
module: sessions-attendance
status: accepted
blocked_by: —
owner: -
last_updated: 2026-09-05
---

## 0. Summary

This module owns the Admin side of the `ClassSession` lifecycle: listing sessions teachers have submitted for review, approving or rejecting them with a reason, and emitting the corresponding Notification. Its boundary stops at `ClassSession.status = approved`; bundling sessions into a payroll period and computing money belongs to spec 05 (Payroll). This module READS `SessionAttendance` to return summarized attendance figures, and never WRITES that table (writing is the teacher's right, RBAC_MATRIX: `SessionAttendance mark = 🔒 Teacher`). This module NEVER writes `payrollPeriodId`.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `ClassSession` | Read + Write | Writes exactly 3 fields: `status`, `rejectionReason`, `updatedAt`. Does not write `actualStart`/`actualEnd`/`topic`/`notes`/`payrollPeriodId` |
| `SessionAttendance` | Read | Grouped by `status` to build `attendanceSummary`. Never written |
| `Class` | Read | Reads `name`, `hskLevel` for display. ⚠ No endpoint creates/reads this table — SCOPE-01 |
| `ClassEnrollment` | Read | Denominator for attendance reconciliation (`status = active`). ⚠ SCOPE-01 |
| `User` | Read | Teacher display name. ⚠ C1: `nickname` or `fullName` |
| `Notification` | Write | INSERT `session_approved` / `session_rejected` |
| `PayrollPeriod` | Read | Only to check `ClassSession.payrollPeriodId IS NOT NULL` → hard lock |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/api/v1/admin/sessions/pending` | admin | List sessions with `status = completed_pending`, paginated + filtered | defined (API_ADMIN.md) |
| PATCH | `/api/v1/admin/sessions/:id/approve` | admin | Approve session — one-way gate | defined (API_ADMIN.md) |
| PATCH | `/api/v1/admin/sessions/:id/reject` | admin | Reject session with `rejectionReason` | defined (API_ADMIN.md) |

No other endpoints are in scope for this module. In particular there is NO: `GET /admin/sessions/:id`, `GET /admin/sessions` (all sessions), bulk approve. Not approved → must not be added on your own.

## 3. DTO

### 3.1 `GET /admin/sessions/pending`

**Request (query string)**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `page` | int | no | `>= 1`, default `1` |
| `limit` | int | no | `1..100`, default `20` |
| `teacherId` | uuid | no | Must exist as a User with `role = teacher` |
| `classId` | uuid | no | uuid v4 |
| `dateFrom` | Date `YYYY-MM-DD` | no | Filters `scheduledDate >= dateFrom` |
| `dateTo` | Date `YYYY-MM-DD` | no | `>= dateFrom`; filters `scheduledDate <= dateTo` |
| `sort` | enum | no | `scheduledDate_asc` \| `scheduledDate_desc`, default `scheduledDate_asc` (oldest first — longest-waiting sessions must surface) |

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "classId": "uuid",
      "className": "string",
      "hskLevel": 3,
      "teacherId": "uuid",
      "teacherName": "string",
      "scheduledDate": "2026-07-13",
      "scheduledStart": "18:00",
      "scheduledEnd": "20:00",
      "actualStart": "2026-07-13T11:05:00Z",
      "actualEnd": "2026-07-13T13:02:00Z",
      "topic": "string",
      "notes": "string|null",
      "status": "completed_pending",
      "attendanceSummary": {
        "present": 8,
        "absentExcused": 1,
        "absentUnexcused": 2,
        "marked": 11,
        "enrolledActive": 12
      },
      "updatedAt": "2026-07-13T13:03:00Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

Notes on derived fields (NO DB column, computed at read time):
- `className`, `hskLevel` ← `Class.name`, `Class.hskLevel` (⚠ C4: 1–9 vs 1–6 unsettled).
- `teacherName` ← `User.nickname` (⚠ C1: API_AUTH uses `fullName`; lock C1 before freezing the contract).
- `attendanceSummary.present|absentExcused|absentUnexcused` ← COUNT by `SessionAttendance.status`; `marked` = sum of the three; `enrolledActive` = COUNT `ClassEnrollment WHERE classId AND status = 'active'`.
- NO `submittedAt` field — `ClassSession` does not store the submission time. `updatedAt` is used as an approximation (Q-SES-7).

### 3.2 `PATCH /admin/sessions/:id/approve`

**Request** — empty body (`{}`). No fields accepted. Any field the client sends is ignored (`whitelist: true, forbidNonWhitelisted: true`). In particular `actualStart`, `actualEnd`, `payrollPeriodId`, `amount` are not accepted.

**Response 200**

```json
{ "data": { "id": "uuid", "status": "approved", "rejectionReason": null, "updatedAt": "2026-08-19T09:00:00Z" } }
```

### 3.3 `PATCH /admin/sessions/:id/reject`

**Request**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `rejectionReason` | string | **yes** | Trim; `minLength 10`, `maxLength 2000`; must not be whitespace only |

**Response 200**

```json
{ "data": { "id": "uuid", "status": "rejected", "rejectionReason": "string", "updatedAt": "2026-08-19T09:00:00Z" } }
```

## 4. Business rules (invariants)

| ID | Statement |
|---|---|
| **INV-SESSION-01** | Only sessions with `status = 'completed_pending'` can be approved or rejected. Every other status (`scheduled`, `in_progress`, `approved`, `rejected`) is refused, with no exceptions. |
| **INV-SESSION-02** | `approved` is a one-way gate: a session that reached `approved` can never move to any other status via the API. No un-approve path exists. |
| **INV-SESSION-03** | A session with `status = 'approved'` **and** `payrollPeriodId IS NOT NULL` is globally immutable: no field of it may be written by any module (including `topic`, `notes`, `actualStart`, `actualEnd`). Enforced at the service layer + `WHERE payrollPeriodId IS NULL` on every UPDATE. |
| **INV-SESSION-04** | Reject requires a `rejectionReason` that is non-empty after trim. No session with `status = 'rejected'` and `rejectionReason IS NULL` may exist. |
| **INV-SESSION-05** | Approve always sets `rejectionReason = NULL`. `rejectionReason` only holds a value when `status = 'rejected'`. |
| **INV-SESSION-06** | The approve/reject endpoints NEVER write `payrollPeriodId`. That field is written only by spec 05. |
| **INV-SESSION-07** | A session is reviewed exactly once. Two concurrent approve requests (or approve + reject) on the same `id` → exactly one request gets `affectedRows = 1` and succeeds; the other gets `affectedRows = 0` and receives 409. |
| **INV-SESSION-08** | A successful approve produces exactly **1** `Notification` with `type = 'session_approved'`, `userId = ClassSession.teacherId`, `referenceId = session.id`, `referenceType = 'session'`, **in the same transaction** as the status change. Rollback → no orphan notification and status unchanged. |
| **INV-SESSION-09** | A successful reject produces exactly **1** `Notification` with `type = 'session_rejected'`, `userId = teacherId`, `payload` containing `rejectionReason`, same transaction. |
| **INV-SESSION-10** | `GET /admin/sessions/pending` only returns sessions with `status = 'completed_pending'`. No other status leaks through, whatever query the client sends. |
| **INV-SESSION-11** | For every session: `SessionAttendance` records are unique per student — `UNIQUE(sessionId, studentId)`. `attendanceSummary.marked` never exceeds `enrolledActive` when data is consistent. |
| **INV-SESSION-12** | `attendanceSummary` is derived, not a stored column. No API path can overwrite it. |
| **INV-SESSION-13** | If `actualStart` and `actualEnd` are both non-NULL then `actualEnd > actualStart`. This is the precondition for spec 05 to compute `per_hour`. |
| **INV-SESSION-14** | Only actors with `role = 'admin'` **and** `status = 'active'` can call all 3 endpoints. Enforced at the service layer, not only via the `@Roles()` guard. |
| **INV-SESSION-15** | Every successful approve/reject writes one immutable audit line: `actorId`, `sessionId`, `from`, `to`, `rejectionReason`, `at`. Written in the same transaction. |

## 5. Ownership / RBAC

Guard: `@Roles('admin')` on all 3 routes. The guard is a necessary condition, not sufficient.

Additional check at the **service layer** (exact predicate):

- `actor.role === 'admin' && actor.status === 'active'` — fails → `AUTH_INSUFFICIENT_ROLE` 403. Reason for re-checking: a token can still be valid after the account is suspended.
- **No ownership condition.** RBAC_MATRIX records `ClassSession approve/reject = ✅` for Admin (full access, own + others) → admin approves any teacher's session, no filtering by `teacherId`.
- Teacher **cannot** call these 3 endpoints, even for their own session (`❌` in the matrix).
- Student: `❌`.
- Self-approval prevention: the system is currently one-role-per-user (`User.role` is a single enum), so a user who is both admin and `session.teacherId` cannot exist. If multi-role is ever allowed, add the condition `session.teacherId !== actor.id` → Q-SES-5.

## 6. State machine

```
   [outside this module's scope — API-004: no endpoints]
   ┌──────────────────────────────────────────────────────────┐
   │                                                          │
 scheduled ──────────► in_progress ──────────► completed_pending
          teacher starts          teacher ends + submits
          (sets actualStart)      (sets actualEnd)
                                  → Notification session_submitted_for_review → Admin
                                                       │
                         ┌──────────────────────────────┴──────────────────────────────┐
                         │ PATCH /admin/sessions/:id/approve                            │ PATCH .../reject
                         ▼                                                              ▼
                   ╔═══════════╗                                                   ┌──────────┐
                   ║ approved  ║  ◄── ONE-WAY GATE                                 │ rejected │
                   ╚═══════════╝                                                   └──────────┘
                         │                                                              │
                         │ spec 05: POST /admin/payroll assigns payrollPeriodId         │
                         ▼                                                              ▼
         ╔══════════════════════════════════════╗                          ??? re-submit ???
         ║ approved + payrollPeriodId NOT NULL  ║                          UNRESOLVED — Q-SES-2
         ║        GLOBALLY IMMUTABLE            ║
         ╚══════════════════════════════════════╝
```

**Valid transition table**

| From | To | Who | Mechanism | In this spec? |
|---|---|---|---|---|
| `scheduled` | `in_progress` | teacher | — | NO (API-004) |
| `in_progress` | `completed_pending` | teacher | — | NO (API-004) |
| `completed_pending` | `approved` | admin | `PATCH /:id/approve` | **YES** |
| `completed_pending` | `rejected` | admin | `PATCH /:id/reject` | **YES** |
| `rejected` | `completed_pending` | teacher? | — | UNRESOLVED (Q-SES-2) |
| `approved` | any | — | **DOES NOT EXIST** | — |

**One-way gate — precise statement**

1. Entering `approved` is irreversible at the status layer: no endpoint, no admin flag, no "undo". The only correction path = out-of-system process + controlled migration.
2. When spec 05 assigns `payrollPeriodId`, the session is hard-locked a second time: `approved + payrollPeriodId IS NOT NULL` → every UPDATE is blocked (INV-SESSION-03). Two independent lock layers, neither replaces the other.
3. `rejected` is a resting state (not a one-way gate by design) but currently **also has no way out** because no re-submit endpoint exists → in practice it is a dead end. This is a gap, not a decision.

## 7. Transaction boundary

**TX-SES-A — approve** (isolation `READ COMMITTED`, sufficient; see §8 for why `SERIALIZABLE` is not needed)

```
BEGIN
 1. UPDATE ClassSession
       SET status='approved', rejectionReason=NULL, updatedAt=now()
     WHERE id = :id AND status='completed_pending'
    -- affectedRows = 0  → THROW (rollback), error classification in §8
 2. INSERT Notification (userId=<session's teacherId>, type='session_approved',
                         referenceId=:id, referenceType='session', isRead=false)
 3. INSERT audit (actorId, sessionId, from='completed_pending', to='approved', at=now())
COMMIT
```

**TX-SES-B — reject**: same as TX-SES-A, with `status='rejected'`, `rejectionReason=:reason`, notification `type='session_rejected'` with `payload = { "rejectionReason": "..." }`.

**Mandatory — same transaction**: status change + INSERT Notification + INSERT audit are one atomic block. Reason: `session_approved` is the evidence the teacher was told payroll will be computed; if the status commits but the notification fails, the teacher never learns the session was approved and there is no way to detect the gap. Conversely, if the notification commits but the status rolls back, the teacher receives a wrong notification. **Do not** push the notification outside the transaction (queue/afterCommit hook) in this version.

**Must NOT be inside the transaction**: outbound HTTP calls, email/push sends, application logs. If realtime push is added later, split out an outbox pattern (INSERT into an outbox table inside the TX, worker reads outside the TX) — not in scope yet, Q-SES-6.

**Where `teacherId` comes from**: use `UPDATE ... RETURNING "teacherId"` (Prisma: `$queryRaw` or re-read inside the same TX after the update). Do not read `teacherId` from the request — the client must not decide the notification recipient.

## 8. Idempotency & concurrency

**Locking mechanism: conditional update (optimistic lock using `status` as the version column).**

```sql
UPDATE "ClassSession"
   SET status = 'approved', "rejectionReason" = NULL, "updatedAt" = now()
 WHERE id = $1 AND status = 'completed_pending'
```

Prisma: `updateMany({ where: { id, status: 'completed_pending' }, data: {...} })` then check `result.count === 1`.

**Forbidden**: `update({ where: { id } })` after a `findUnique` status check — that is a non-atomic read-then-write: two admins both read `completed_pending` then both write → both "win", producing 2 Notifications and breaking INV-SESSION-07.

**Why no separate `version` column**: every valid transition changes `status`, so `status` is already the natural version and filtering the WHERE on it is enough. Adding a `version` column would be a needless migration.

**Why no `SELECT ... FOR UPDATE`**: PostgreSQL at `READ COMMITTED`, when it hits a row locked by another transaction, waits, then **re-evaluates the WHERE clause** against the newest row version after that transaction commits. The losing request sees `status = 'approved'` → WHERE does not match → `affectedRows = 0`. `FOR UPDATE` is only needed when data must be READ to compute before writing (that is spec 05's case, not this one).

**Handling the losing request** — `affectedRows = 0` has two causes, distinguished by exactly one `SELECT id, status FROM "ClassSession" WHERE id = $1` after rollback:

| SELECT result | HTTP | code |
|---|---|---|
| 0 rows | 404 | `SESSION_NOT_FOUND` |
| status ∈ {`approved`, `rejected`} | 409 | `SESSION_ALREADY_REVIEWED` |
| status ∈ {`scheduled`, `in_progress`} | 400 | `PAYROLL_SESSION_NOT_COMPLETED` |

**Duplicate request (same admin clicking twice / client retry)**: the second call gets **409 `SESSION_ALREADY_REVIEWED`**, NOT a fake-idempotent 200. Reason: approve is a financial action; silently swallowing the second click hides a two-admin contention scenario. If FE wants 200 for network retries, that must be decided separately (Q-SES-4) — currently 409 is kept.

**No Idempotency-Key in this module**: the natural key is already `(sessionId, current status)`; an idempotency table would be redundant. (Payroll needs one — see spec 05 §8.)

**Concurrency with the Payroll module**: spec 05 locks sessions with `SELECT ... FOR UPDATE` when bundling. If approve and payroll-bundling run concurrently on the same session, both transactions touch the same row → automatically serialized at the row-lock level. There is no scenario of a session being both approved and bundled into a period with stale status.

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| No token / broken token | 401 | `AUTH_TOKEN_INVALID` | in API_ERROR_CODES.md |
| Token expired | 401 | `AUTH_TOKEN_EXPIRED` | in API_ERROR_CODES.md |
| Not admin, or admin suspended | 403 | `AUTH_INSUFFICIENT_ROLE` | in API_ERROR_CODES.md |
| Malformed query/body; `rejectionReason` empty or < 10 chars | 400 | `VALIDATION_ERROR` + `details` | in API_ERROR_CODES.md |
| `:id` does not exist | 404 | `SESSION_NOT_FOUND` | **proposed, not agreed** (SESSION_* family) |
| Session already `approved` or `rejected` | 409 | `SESSION_ALREADY_REVIEWED` | **proposed, not agreed** |
| Reject without a reason (if caught at the business layer instead of DTO) | 400 | `SESSION_REJECT_REASON_REQUIRED` | **proposed, not agreed** |
| Session in `scheduled` / `in_progress` | 400 | `PAYROLL_SESSION_NOT_COMPLETED` | ⚠ disputed — present in the registry API_ERROR_CODES.md §3 but NOT in the "Existing codes" list of `_FACTS.md` (see Q-SES-1) |
| `teacherId` in query does not exist | 404 | `USER_NOT_FOUND` | in API_ERROR_CODES.md |

No new codes. The three `SESSION_*` codes above are taken verbatim from API_ERROR_CODES.md §3 — **not to be treated as locked** until a BE owner signs off (Q-SES-1). If still unsettled at coding time: use `VALIDATION_ERROR`/correct HTTP status as a stopgap and write a TODO, never invent codes.

Error envelope per API_CONVENTIONS.md (flat): `{ statusCode, error, message, code, details?, timestamp, path }`. `details` appears only on `VALIDATION_ERROR`.

## 10. Side effects & notifications

| Action | Notification `type` | `userId` (recipient) | `referenceId` / `referenceType` | `payload` |
|---|---|---|---|---|
| Admin approves session | `session_approved` | `ClassSession.teacherId` | `session.id` / `"session"` | `null` (or `{}`) |
| Admin rejects session | `session_rejected` | `ClassSession.teacherId` | `session.id` / `"session"` | `{ "rejectionReason": "<verbatim>" }` |

- Teacher submitting a session (`→ completed_pending`) emits `session_submitted_for_review` to the **Admin** — that lives in the teacher lane, NOT written by this module. Currently no endpoint produces it (API-004).
- `Notification` is append-only: never deleted, only marked `isRead` (ENTITY_NOTIFICATION business rules).
- Sent to **how many admins**: reject/approve does not notify other admins. If fan-out to all admins is needed later, it must be decided (not in the current ENTITY_NOTIFICATION).
- Other side effects: **none**. No email, no webhook, no touching `PayrollPeriod`.

## 11. Index & query

Indexes needed for `GET /admin/sessions/pending`:

```
ClassSession: INDEX (status, "scheduledDate")                 -- main filter + sort
ClassSession: INDEX ("teacherId", status, "scheduledDate")    -- when filtering by teacherId
ClassSession: INDEX ("classId", status)                       -- when filtering by classId
SessionAttendance: INDEX ("sessionId")                        -- building attendanceSummary
ClassEnrollment: INDEX ("classId", status)                    -- counting enrolledActive
```

Consider a partial index on large tables: `CREATE INDEX ... ON "ClassSession"("scheduledDate") WHERE status = 'completed_pending';` — the pending set is always small vs. total sessions.

**N+1 risks** (must be blocked from day one):
1. Fetch 20 sessions then loop-query `SessionAttendance` per session → 21 queries. Fix: one `GROUP BY "sessionId", status WHERE "sessionId" IN (...)`, matched in memory.
2. Loop-query `Class` and `User` per session. Fix: Prisma `include: { class: true, teacher: { select: { id: true, nickname: true } } }` — a single query with JOIN.
3. Counting `ClassEnrollment` per class → one `GROUP BY "classId" WHERE "classId" IN (...) AND status='active'`.

`meta.total`: separate `COUNT(*)` with the same WHERE clause. Do not `findMany` then take `.length`.

## 12. Migration & seed

**Migration**
- No new tables, no new columns. All fields already exist on `ClassSession` / `SessionAttendance`.
- Add CHECK: `CHECK ("actualEnd" IS NULL OR "actualStart" IS NULL OR "actualEnd" > "actualStart")` (INV-SESSION-13).
- Add CHECK: `CHECK (status <> 'rejected' OR "rejectionReason" IS NOT NULL)` (INV-SESSION-04) — last line of defense at the DB, not a replacement for service validation.
- Confirm `UNIQUE("sessionId","studentId")` exists on `SessionAttendance` (ENTITY doc says so; verify against the real schema before skipping).
- Add the indexes from §11.
- Audit table: if it does not exist, a separate migration is needed — **currently no ENTITY doc covers the audit log** (Q-SES-8).

**Seed to make this module testable** (since SCOPE-01 blocks API-based creation, the seed must INSERT straight into the DB):
1. 1 admin `role=admin, status=active`; a second admin for contention testing.
2. 2 teachers `role=teacher, status=active`.
3. 2 Classes (`status=active`) owned by 2 different teachers.
4. ≥ 5 ClassEnrollment `status=active` per class + 1 enrollment `status=dropped` (verify `enrolledActive` excludes dropped).
5. ClassSessions covering all 5 statuses: ≥ 3 `completed_pending`, 1 `scheduled`, 1 `in_progress`, 1 `approved` (no `payrollPeriodId` yet), 1 `approved` + `payrollPeriodId` NOT NULL, 1 `rejected` with `rejectionReason`.
6. SessionAttendance with all 3 status types for the `completed_pending` sessions; deliberately leave one session missing attendance for a few students (`marked < enrolledActive`).
7. 1 `completed_pending` session with `actualStart`/`actualEnd` NULL (to test Q-SES-3).

## 13. Security & rate limit

- **Never expose**: `User.passwordHash`, `User.email`, `User.lastLoginAt`, `User.bio`, `User.hskLevelGoal`. The response only contains `teacherId` + display name. Use explicit Prisma `select`, never a bare `include: { teacher: true }`.
- **Do not return** `payrollPeriodId` in the pending list: pending sessions are always NULL and leaking it only adds contract noise.
- `rejectionReason` is admin-entered free text shown back to the teacher → escape on the FE; BE caps length (2000) and strips control characters.
- **Proposed rate limits** (API_CONVENTIONS.md has no rate-limit section yet → Q-SES-9): `GET pending` 60 req/min/admin; `PATCH approve|reject` 30 req/min/admin. Exceeded → 429 `TOO_MANY_REQUESTS` — ⚠ recorded in the registry § *proposed, not agreed* (2026-08-19), **not usable** until the BE owner approves.
- **Mandatory audit**: every approve/reject records `actorId`, `sessionId`, `from`, `to`, `rejectionReason`, `at`, `ip`. Immutable, never deleted.
- IDOR: no tenant-based risk since admin has full rights; but `:id` must be validated as uuid before querying to avoid Prisma errors leaking details.

## 14. Observability

**Logs** (structured, no PII beyond ids):
- `session.review.attempt` — `{ actorId, sessionId, action: approve|reject }`
- `session.review.success` — `{ actorId, sessionId, from, to, durationMs }`
- `session.review.conflict` — `{ actorId, sessionId, observedStatus }` ← **WARN level**, this is the two-admin contention signal
- `session.review.notfound` — `{ actorId, sessionId }`

**Metrics**:
- `sessions_pending_gauge` — current count of `completed_pending` sessions, tagged by `teacherId`. Steady growth = admin not reviewing fast enough, blocking payroll.
- `session_pending_age_seconds` — histogram of pending session age (now − `updatedAt`). p95 is the operational health indicator.
- `session_review_conflict_total` — counter. Non-zero means consider UI locking / review assignment.
- `session_review_latency_ms` — histogram per endpoint.
- `session_notification_write_total` — must equal `session_review_success_total`. A gap = orphan notifications → INV-SESSION-08 broken.

**Alerts**: `session_pending_age_seconds` p95 > 72h; `session_review_conflict_total` growing > 5/hour.

## 15. Test matrix

"Type" column convention: `svc` = service unit test (mock repo) · `int` = integration over HTTP + **real DB** · `db` = direct check on the **real DB** (constraint / concurrency). Any test marked "real DB" **must not mock Prisma** — contention and constraints cannot be reproduced on mocks.

| INV | Type | Test description |
|---|---|---|
| INV-SESSION-01 | int (real DB) | Call approve on a session in each status `scheduled`/`in_progress`/`approved`/`rejected` → 400/400/409/409 respectively; DB unchanged. Repeat for reject. |
| INV-SESSION-02 | int (real DB) | Approve succeeds → call approve again, then reject → both 409; `status` stays `approved`, `updatedAt` unchanged. |
| INV-SESSION-03 | db + int | Session `approved` + `payrollPeriodId` NOT NULL: every UPDATE via the service is blocked; `UPDATE ... WHERE payrollPeriodId IS NULL` yields `affectedRows = 0`. |
| INV-SESSION-04 | int + db | Reject with `rejectionReason` = `""`, `"   "`, 9 chars → 400 `VALIDATION_ERROR`, `details.rejectionReason` populated. DB: manual INSERT `status='rejected', rejectionReason=NULL` → CHECK constraint blocks it. |
| INV-SESSION-05 | int (real DB) | Session previously rejected (has `rejectionReason`), teacher resubmits (manually set back to `completed_pending`), admin approves → `rejectionReason` in DB = NULL. |
| INV-SESSION-06 | int (real DB) | Approve a session with `payrollPeriodId` NULL → after commit `payrollPeriodId` still NULL. Sending `payrollPeriodId` in the approve body → stripped, not written. |
| INV-SESSION-07 | **db — real concurrency** | Two parallel connections both `BEGIN` + conditional UPDATE on one `id`, both commit. Assert: total `affectedRows` = 1; `COUNT(Notification WHERE referenceId=sessionId)` = 1; audit row count = 1. Run ≥ 50 iterations to catch rare races. |
| INV-SESSION-08 | int (real DB) | Approve OK → exactly 1 `session_approved` Notification, `userId = teacherId`, `referenceType='session'`. **Rollback test**: inject an error at the INSERT Notification step → after rollback `status` is still `completed_pending` **and** no Notification exists. |
| INV-SESSION-09 | int (real DB) | Reject OK → 1 `session_rejected` Notification, `payload.rejectionReason` matches verbatim. Inject error at INSERT → status unchanged. |
| INV-SESSION-10 | int (real DB) | Seed all 5 statuses → the pending list only returns `completed_pending`; `meta.total` matches the DB `COUNT`. Try `?status=approved` injection → ignored, result unchanged. |
| INV-SESSION-11 | db | INSERT 2 `SessionAttendance` with the same `(sessionId, studentId)` → violates UNIQUE. Check `attendanceSummary.marked ≤ enrolledActive` on the seed. |
| INV-SESSION-12 | int | Send `attendanceSummary` in the approve/reject body → stripped; the returned figures still come from `SessionAttendance`. Edit 1 attendance row in the DB → the next read reflects it. |
| INV-SESSION-13 | db | INSERT session with `actualEnd < actualStart` and `actualEnd = actualStart` → CHECK blocks. `actualEnd`/`actualStart` NULL → allowed. |
| INV-SESSION-14 | int | Call the 3 endpoints with a teacher token, student token, admin token with `status='suspended'`, and no token → 403/403/403/401 respectively. |
| INV-SESSION-15 | int (real DB) | After each successful approve/reject there is exactly 1 audit row with all fields; after each failure (409/404) there are 0 audit rows. |

**Additional mandatory tests (not tied to an INV)**:
- Pagination: `page`/`limit` boundary values (0, 1, 101, negative, non-numeric) → 400; `totalPages = ceil(total/limit)`.
- N+1: enable query log, list 20 sessions → total query count ≤ 5. This threshold is a CI gate.
- Envelope: assert success responses match `{ data, meta }` and errors match the 7-field flat envelope of API_CONVENTIONS.md.

## 16. Unresolved

| # | Question | What it blocks | Owner | Decide by |
|---|---|---|---|---|
| **SCOPE-01** | **`Class` and `ClassEnrollment` have no endpoints at all.** Both have full ENTITY docs (`ENTITY_CLASS.md`, `ENTITY_CLASS_ENROLLMENT.md`) and RBAC_MATRIX rows (`Class create = ✅ Teacher`, `ClassEnrollment enroll = ✅ Student`), but `docs/api/` only has `API_ADMIN.md`, `API_AUTH.md`, `API_CONVENTIONS.md`, `API_ERROR_CODES.md` — **no `API_TEACHER.md`, no `API_STUDENT.md`**, and `API_ADMIN.md` has no Class section. No path to create a Class ⇒ no path to create a ClassSession ⇒ `GET /admin/sessions/pending` is permanently empty in real environments. `className`, `hskLevel`, `enrolledActive` in the §3.1 DTO all read from two tables nobody owns. | **BLOCKS THE WHOLE MODULE** — can be coded and tested via DB seed, but cannot run end-to-end, cannot demo, cannot go to staging | BE lead + PO | before Sprint 3 |
| **API-004** | The three transitions `scheduled → in_progress → completed_pending` have no endpoint in any API file. The `session_submitted_for_review` notification has no producer. | No input data source for this module; the entire teacher lane of payroll is empty | BE lead | before Sprint 3 |
| Q-SES-1 | Status of the `SESSION_*` family: `_FACTS.md` classifies `SESSION_*` as *proposed, not agreed*; but the "Session Review Errors" section of `API_ERROR_CODES.md` has **no** ⚠ proposed banner (only `INVOICE_*`, `RATE_*`, `AI_*` have one). Also the `PAYROLL_*` family (`PAYROLL_SESSION_NOT_COMPLETED`, `PAYROLL_SESSION_NOT_FOUND`, `PAYROLL_PERIOD_*`) exists in the registry but **not** in the "Existing codes" list of `_FACTS.md`. The two sources disagree → this is **contradiction #5**, not yet recorded in `_FACTS.md`. | Entire §9; FE cannot map errors | BE owner of API_ERROR_CODES | before coding §9 |
| Q-SES-2 | Can a `rejected` session be resubmitted? If yes: who calls `rejected → completed_pending`, which endpoint, any attempt limit? If no: the teacher loses an entire teaching session with no appeal path. Currently `rejected` is a **dead end**. | §6 state machine not closed; teacher-side flow | PO | before Sprint 3 |
| Q-SES-3 | May a session with `actualStart` or `actualEnd` NULL be approved? A `per_hour` session missing these two fields cannot be priced by spec 05 (INV-PAYROLL-03). Two options: (a) block at approve — safe, surfaces the error early; (b) allow approve, block at payroll — error surfaces late, mid payroll close. | Spec 04 ↔ 05 boundary; INV-SESSION-13 only constrains when both are non-NULL | BE lead | before Sprint 3 |
| Q-SES-4 | Should a second approve return 409 or an idempotent 200? The spec tentatively locks 409 (§8). FE needs to confirm it can handle a 409 after network retries. | §8, FE contract | FE + BE | before locking the contract |
| Q-SES-5 | Can a user ever be both admin and teacher of a session? If the system moves to multi-role, self-approval must be blocked. | §5 | PO | not urgent |
| Q-SES-6 | Do notifications need realtime (WS/push)? If yes, an outbox must be split out and §7 changes. | §7, §10 | BE lead | Sprint 4 |
| Q-SES-7 | `ClassSession` does not store the submission time (`submittedAt`). Using `updatedAt` as an approximation breaks as soon as any other UPDATE happens. Add a column? | DTO §3.1, metric `session_pending_age_seconds` | BE lead | before Sprint 3 |
| Q-SES-8 | No ENTITY doc covers the audit table, yet INV-SESSION-15 and §13 both require it. What is the table name, schema, owner? | INV-SESSION-15, migration §12 | BE lead | before Sprint 3 |
| Q-SES-9 | `API_CONVENTIONS.md` has no rate-limit section and code 429 (`TOO_MANY_REQUESTS`) is only *proposed*. §13 is proposing it. | §13 | BE lead | Sprint 4 |
| **C1** | `User.nickname` (ENTITY_USER) vs `fullName` (API_AUTH register/PATCH). Which field does `teacherName` in DTO §3.1 read? | FE contract of the pending list | BE lead | before locking the contract |
| **C4** | `Class.hskLevel` says 1–9 in ENTITY, 1–6 in GLOSSARY/DATABASE_SCHEMA (tracked: DOC-004). | `hskLevel` validation + display §3.1 | PO | does not block code |

> Scope note: `docs/front-end-design-docs/pages/_INDEX.md` points to `admin-pages/admin-session-review.md` with the note "attendance summary in payload", **but that file does not exist** in the doc set (the `pages/admin-pages/` directory only has `admin-tuition-rates.md`). The `attendanceSummary` shape in §3.1 is therefore **this spec's proposal**, not yet cross-checked against the FE design.
