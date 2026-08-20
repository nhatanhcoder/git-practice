# SPEC 05 — Payroll & TeacherPayRate

---
module: payroll
status: proposed
blocked_by: C2 (ADR-008 append-only vs ENTITY_TEACHER_PAY_RATE "set effectiveTo on current") — BLOCKS §4 · Q-PAY-1 (payroll period boundary + timezone) · RATE_* error-code group *proposed, not agreed* · missing error code for duplicate period · depends on spec 04 (SCOPE-01/02)
owner: -
last_updated: 2026-08-19
---

## 0. Summary

The module is responsible for: setting teacher pay rates (`TeacherPayRate`, append-only) and
finalizing payroll per period (`PayrollPeriod`: collect approved sessions → compute money →
finalize → mark paid). The boundary starts at `ClassSession.status = 'approved'` (produced by
spec 04) and ends at `PayrollPeriod.status = 'paid'`. This module is the **only** place allowed to
write `ClassSession.payrollPeriodId`. This module does NOT approve sessions, does NOT change
`ClassSession.status`, and does NOT touch student tuition (`StudentInvoice`, owned by the billing
module).

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `TeacherPayRate` | Read + INSERT | **INSERT only.** No UPDATE, no DELETE (ADR-008) — ⚠ C2 |
| `PayrollPeriod` | Read + Write | Writes `status`, `totalSessions`, `totalAmount`, `paidAt` |
| `ClassSession` | Read + Write **1 field** | Only writes `payrollPeriodId`. Never writes `status` or any other field |
| `User` | Read | Checks `role = 'teacher'`; display name. ⚠ C1 |
| `Notification` | — | **No write.** No notification type for payroll in ENTITY_NOTIFICATION (Q-PAY-8) |
| `SessionAttendance` | — | Not touched. Attendance doesn't affect teacher pay |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/api/v1/admin/pay-rates` | admin | Create a new rate for a teacher (append) | **defined** (API_ADMIN.md) |
| GET | `/api/v1/admin/pay-rates` | admin | List current rates + history | **PROPOSED** — "shape is proposed, not agreed"; blocked on "pay-rate unit basis undecided" |
| POST | `/api/v1/admin/payroll` | admin | Create `PayrollPeriod` (draft) + collect + compute | **defined** |
| GET | `/api/v1/admin/payroll` | admin | List payroll periods, paginated | **defined** |
| GET | `/api/v1/admin/payroll/:id` | admin | Period detail + per-session breakdown | **PROPOSED** — blocked on "period boundary undecided"; FE `/admin/payroll/[periodId]` fully depends ("the whole finalize path") |
| PATCH | `/api/v1/admin/payroll/:id/finalize` | admin | `draft → finalized` — one-way gate | **defined** |
| PATCH | `/api/v1/admin/payroll/:id/pay` | admin | `finalized → paid` | **defined** |

Doesn't exist and **must not be added**: `PATCH /admin/pay-rates/:id`, `DELETE /admin/pay-rates/:id`,
`DELETE /admin/payroll/:id`, `PATCH /admin/payroll/:id` (editing amounts), endpoint to unassign a
session from a period.

Teacher reading their own payroll: RBAC_MATRIX says `PayrollPeriod read own = 🔒 Teacher`, but
**no route** implements it (no `API_TEACHER.md`) → Q-PAY-7.

## 3. DTO

### 3.1 `POST /admin/pay-rates`

**Request**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `teacherId` | uuid | **yes** | Exists; `User.role = 'teacher'`; `User.status = 'active'` |
| `rateType` | enum | **yes** | `per_session` \| `per_hour`. No other value (Q-PAY-9 on `fixed_monthly`) |
| `rateAmount` | Decimal(10,2) | **yes** | `> 0`; send as **string** to avoid float precision loss (e.g. `"250000.00"`); max 2 decimal places; unit **VND** |
| `effectiveFrom` | Date `YYYY-MM-DD` | **yes** | Must be **strictly greater than** the current latest `effectiveFrom` of that teacher (INV-PAYROLL-16) |

**Not accepted**: `effectiveTo` (⚠ C2 — if C2 resolves per the ENTITY doc, this DTO must change),
`id`, `createdAt`.

**Response 201**

```json
{ "data": { "id": "uuid", "teacherId": "uuid", "rateType": "per_hour",
            "rateAmount": "250000.00", "effectiveFrom": "2026-09-01",
            "effectiveTo": null, "createdAt": "2026-08-19T09:00:00Z" } }
```

`effectiveTo` always returns `null` per ADR-008. The field stays in the response only because the
column exists in the schema; ⚠ C2.

### 3.2 `GET /admin/pay-rates` *(PROPOSED)*

**Request (query)**: `page` (int ≥1, default 1) · `limit` (int 1..100, default 20) ·
`teacherId` (uuid, optional — when present returns that teacher's full history) · `activeOnly`
(bool, default `true` — only the rate in effect today).

**Response 200**

```json
{
  "data": [
    { "teacherId": "uuid", "teacherName": "string",
      "current": { "id": "uuid", "rateType": "per_session", "rateAmount": "300000.00", "effectiveFrom": "2026-07-01" },
      "changesCount": 3 }
  ],
  "meta": { "total": 12, "page": 1, "limit": 20, "totalPages": 1 }
}
```

`current` = `null` when the teacher has no rate yet (a row requiring action; FE sorts it to the
top). With `teacherId` + `activeOnly=false`, return the full history sorted `effectiveFrom DESC`,
each element adding `isCurrent: boolean` (derived, not a stored column).

### 3.3 `POST /admin/payroll`

**Request**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `teacherId` | uuid | **yes** | Exists; `role = 'teacher'` |
| `periodStart` | Date `YYYY-MM-DD` | **yes** | Calendar date, no time, no timezone |
| `periodEnd` | Date `YYYY-MM-DD` | **yes** | `>= periodStart`; period length ≤ 366 days |

**Proposed header**: `Idempotency-Key: <uuid>` (§8; not in API_CONVENTIONS.md yet → Q-PAY-5).

**Response 201**

```json
{ "data": { "id": "uuid", "teacherId": "uuid", "teacherName": "string",
            "periodStart": "2026-07-01", "periodEnd": "2026-07-31",
            "status": "draft", "totalSessions": 18, "totalAmount": "5400000.00",
            "paidAt": null, "createdAt": "2026-08-19T09:00:00Z" } }
```

### 3.4 `GET /admin/payroll`

**Request (query)**: `page` · `limit` · `teacherId` (uuid) · `status` (`draft`|`finalized`|`paid`) ·
`periodFrom` / `periodTo` (Date, filter on `periodStart`) · `sort` (`periodStart_desc` default |
`periodStart_asc`).

**Response 200**: `{ "data": [ <object as in 3.3 but without breakdown> ], "meta": {...} }`.

`totalSessions` and `totalAmount` are read straight from the stored columns — **no** JOIN
re-counting (§11).

### 3.5 `GET /admin/payroll/:id` *(PROPOSED)*

**Response 200**

```json
{
  "data": {
    "id": "uuid", "teacherId": "uuid", "teacherName": "string",
    "periodStart": "2026-07-01", "periodEnd": "2026-07-31",
    "status": "finalized", "totalSessions": 18, "totalAmount": "5400000.00",
    "paidAt": null,
    "sessions": [
      { "sessionId": "uuid", "classId": "uuid", "className": "string",
        "scheduledDate": "2026-07-03",
        "actualStart": "2026-07-03T11:00:00Z", "actualEnd": "2026-07-03T13:00:00Z",
        "hours": "2.00",
        "appliedRateId": "uuid", "appliedRateType": "per_hour", "appliedRateAmount": "250000.00",
        "amount": "500000.00" }
    ]
  }
}
```

`sessions[].hours`, `appliedRate*`, `amount` are **derived — recomputed at read time**, no DB
columns. Serious consequence: after a period is `finalized`, the breakdown is recomputed from the
current `TeacherPayRate` — if anyone backdates a rate, `Σ sessions[].amount` will drift from the
locked `totalAmount`. This is exactly why INV-PAYROLL-16 forbids backdating. A more robust option
(storing a breakdown-line snapshot) → Q-PAY-4.

### 3.6 `PATCH /admin/payroll/:id/finalize` and `/pay`

**Request**: empty body `{}`. No field accepted — especially not `totalAmount`, `paidAt`, `status`.

**Response 200**: `{ "data": { "id", "status", "totalSessions", "totalAmount", "paidAt", "updatedAt" } }`.

## 4. Business rules (invariants)

### 4.1 Choosing the applicable rate — the module's keystone

| ID | Statement |
|---|---|
| **INV-PAYROLL-01** | The rate applied to **a session** is that `teacherId`'s `TeacherPayRate` record in effect **at the time the session took place**, selected by exactly this query: `WHERE teacherId = :teacherId AND effectiveFrom <= :sessionDate ORDER BY effectiveFrom DESC LIMIT 1`. `:sessionDate` = `ClassSession.scheduledDate`. **FORBIDDEN**: the current rate (`effectiveTo IS NULL`), the rate at payroll creation date, the rate at `periodEnd`, the rate at `now()`. |
| **INV-PAYROLL-02** | Mandatory consequence of INV-PAYROLL-01: **one `PayrollPeriod` can contain several different rates.** Rate change mid-period → sessions before the change use the old rate, sessions from the change date onward use the new one. No single-rate-for-the-whole-period. |
| **INV-PAYROLL-03** | The rate applied to a session is determined **once by `scheduledDate`** and doesn't depend on processing order or run time. Re-running the computation on the same dataset always produces the same number (deterministic). |
| **INV-PAYROLL-04** | The applied `rateType` also comes from the very record selected in INV-PAYROLL-01 — not from the newest record. One period may mix both `per_session` and `per_hour` if the teacher switched basis mid-period. |

### 4.2 Money formulas

| ID | Statement |
|---|---|
| **INV-PAYROLL-05** | `rateType = 'per_session'` → `amount(session) = rate.rateAmount`. Per session, regardless of duration. |
| **INV-PAYROLL-06** | `rateType = 'per_hour'` → `amount(session) = rate.rateAmount × hours(session)`, with `hours(session) = (actualEnd − actualStart)` converted to **decimal hours**. **FORBIDDEN** to use `scheduledStart`/`scheduledEnd` — those are expected times, not real ones. |
| **INV-PAYROLL-07** | `hours` computed at **minute** resolution: `hours = floor((actualEnd − actualStart) / 60s) / 60`, rounding down to the nearest minute, represented as Decimal with 4 decimal places. Seconds are dropped. |
| **INV-PAYROLL-08** | Money rounding: `amount(session)` rounds **HALF_UP to 2 decimal places per session**, then sums. **FORBIDDEN** to sum first and round later. Reason: `totalAmount` must match exactly the sum of the breakdown lines shown on `/admin/payroll/[periodId]` — a one-cent drift between total and breakdown is an accounting bug, not a display bug. |
| **INV-PAYROLL-09** | `totalAmount = Σ amount(session)` over the collected set, type `Decimal(12,2)`, always `>= 0`. |
| **INV-PAYROLL-10** | `totalSessions = COUNT(session)` over the collected set — **counts sessions**, even when `rateType = 'per_hour'`. Not hours. |
| **INV-PAYROLL-11** | The entire money path uses Decimal end-to-end (Prisma `Decimal` ↔ PostgreSQL `numeric`). **FORBIDDEN**: JS `Number`, `parseFloat`, `+`, `*` at any stage, including serialization. Money leaves JSON as **string**. |

### 4.3 The collected session set

| ID | Statement |
|---|---|
| **INV-PAYROLL-12** | Session `s` is collected into `PayrollPeriod(teacherId, periodStart, periodEnd)` **if and only if** all 4 conditions hold simultaneously: `s.teacherId = :teacherId` **and** `s.status = 'approved'` **and** `s.payrollPeriodId IS NULL` **and** `s.scheduledDate BETWEEN :periodStart AND :periodEnd` (boundary **closed at both ends** — proposed, Q-PAY-1). |
| **INV-PAYROLL-13** | A session not yet `approved` is never collected. `status = 'approved'` must be in the WHERE clause of both the SELECT and the UPDATE, not just checked in the application layer. |
| **INV-PAYROLL-14** | Each `ClassSession` belongs to **at most one** `PayrollPeriod`. `payrollPeriodId` is assign-once: once NOT NULL it is never overwritten, even if the period is dropped. The `payrollPeriodId IS NULL` condition must be in the WHERE of the assigning UPDATE. |
| **INV-PAYROLL-15** | No session is ever paid twice: `SELECT payrollPeriodId, COUNT(*) FROM ClassSession WHERE payrollPeriodId IS NOT NULL GROUP BY id HAVING COUNT(*) > 1` is always empty (guaranteed by INV-PAYROLL-14 + primary key). |
| **INV-PAYROLL-16** | If **any** session in the collected set has no applicable rate per INV-PAYROLL-01 → **the whole request fails**: no `PayrollPeriod` created, no `payrollPeriodId` assigned. All-or-nothing. **FORBIDDEN** to compute 0 VND, **FORBIDDEN** to skip that session. |
| **INV-PAYROLL-17** | `per_hour` with `actualStart IS NULL` or `actualEnd IS NULL` → `hours` can't be computed → the request fails entirely (same mechanism as INV-PAYROLL-16). Related to Q-SES-3 of spec 04. |
| **INV-PAYROLL-18** | After commit: `totalSessions = COUNT(ClassSession WHERE payrollPeriodId = period.id)`. This is a verifiable invariant via one cross-check query, used as an assertion in tests and in the monitoring job. |

### 4.4 Payroll period lifecycle

| ID | Statement |
|---|---|
| **INV-PAYROLL-19** | The only valid transitions are **two**: `draft → finalized`, `finalized → paid`. Everything else is rejected, including `finalized → draft`, `paid → finalized`, `draft → paid` (skipping), and self-transitions. |
| **INV-PAYROLL-20** | `finalized` is a **one-way gate**: once `finalized`, `totalAmount`, `totalSessions`, `periodStart`, `periodEnd`, `teacherId` and the period's session set are permanently immutable. No endpoint can change them. |
| **INV-PAYROLL-21** | A period in `finalized` or `paid` → every `ClassSession` with `payrollPeriodId` pointing to it is fully write-locked (matching spec 04's INV-SESSION-03). |
| **INV-PAYROLL-22** | `paidAt IS NULL` when `status ∈ {draft, finalized}`; `paidAt IS NOT NULL` when `status = 'paid'`; the value is set **exactly once** at the moment of transition to `paid` and never overwritten. |
| **INV-PAYROLL-23** | No endpoint deletes a payroll period. A mistakenly created `draft` period currently has **no cancellation path** — see Q-PAY-6. |

### 4.5 Duplicate & rate constraints

| ID | Statement |
|---|---|
| **INV-PAYROLL-24** | **At most one** `PayrollPeriod` exists per `(teacherId, periodStart, periodEnd)`. Guaranteed by a **DB UNIQUE constraint**, not just a service check. |
| **INV-PAYROLL-25** | Two `PayrollPeriod`s of **the same teacher** must not overlap in date range. UNIQUE in INV-PAYROLL-24 is **not enough**: `2026-07-01..07-31` and `2026-07-15..08-15` are different key pairs so both pass. Needs an `EXCLUDE USING gist` on `daterange` (§12). Status: **proposed**, Q-PAY-3. |
| **INV-PAYROLL-26** | `TeacherPayRate` is append-only: INSERT only. No UPDATE of old records, no DELETE, no endpoint allowing either (ADR-008 Accepted). ⚠ **C2** — see §16. |
| **INV-PAYROLL-27** | A new record's `effectiveFrom` must be **strictly greater than** the teacher's current `MAX(effectiveFrom)`. Backdating is forbidden. Reason: backdating changes the money of already `finalized`/`paid` periods (see §3.5 — breakdown recomputed at read time). |
| **INV-PAYROLL-28** | At most one `TeacherPayRate` per `(teacherId, effectiveFrom)` — DB UNIQUE. Without it, the rate-selection query in INV-PAYROLL-01 becomes **non-deterministic** (two rows with the same `effectiveFrom`, `LIMIT 1` picks arbitrarily). |
| **INV-PAYROLL-29** | `rateAmount > 0`, exactly 2 decimal places, `Decimal(10,2)`. `rateType ∈ {per_session, per_hour}`. |
| **INV-PAYROLL-30** | `teacherId` must point to a `User` with `role = 'teacher'`. Checked at the service layer (FK only points to `User`, doesn't distinguish roles). |
| **INV-PAYROLL-31** | Only an actor with `role = 'admin'` **and** `status = 'active'` can call all 7 endpoints. Checked at the service layer, not only by an `@Roles()` guard. |
| **INV-PAYROLL-32** | Responses never contain `User.passwordHash`, `User.email`, or other sensitive fields — only `teacherId` + display name. |

## 5. Ownership / RBAC

Guard: `@Roles('admin')` on all 7 routes. Additional check at the **service layer**:

- `actor.role === 'admin' && actor.status === 'active'` — otherwise → `AUTH_INSUFFICIENT_ROLE` 403.
- **No ownership filter**: RBAC_MATRIX says `TeacherPayRate set = ✅ Admin`, `PayrollPeriod
  create/finalize/pay = ✅ Admin` → admin operates on every teacher.
- Teacher: `PayrollPeriod read own = 🔒` — **no route yet** (Q-PAY-7). When built, it must be a
  separate route (e.g. `/api/v1/teacher/payroll`) with a service-layer condition
  `period.teacherId === actor.id` — **not** `/admin/*` opened to teachers.
- Teacher and `TeacherPayRate`: `❌` — per the current matrix a teacher can't even read their own
  rate. (Business-wise dubious, but that's what the matrix says; not self-corrected.)
- Student: `❌` everywhere.
- Financial segregation: today any admin can both finalize and pay. Whether to split "finalizer"
  ≠ "payer" roles (four-eyes principle) → Q-PAY-10.

## 6. State machine

### 6.1 `PayrollPeriod`

```
       POST /api/v1/admin/payroll
       ├─ collect sessions (approved, payrollPeriodId IS NULL, within date range)
       ├─ look up rate by each session's scheduledDate
       ├─ compute each session's amount → totalAmount, totalSessions
       └─ assign payrollPeriodId to each session
                    │  ← ALL IN ONE TRANSACTION (§7)
                    ▼
              ┌───────────┐
              │   draft   │   totalAmount computed, paidAt = NULL
              └───────────┘   sessions already assigned payrollPeriodId
                    │
                    │ PATCH /admin/payroll/:id/finalize      (empty body)
                    ▼
        ╔═══════════════════════╗
        ║      finalized        ║ ◄══ ONE-WAY GATE
        ╚═══════════════════════╝     totalAmount / totalSessions / session set
                    │                 PERMANENTLY IMMUTABLE — no path back to draft
                    │                 sessions in the period are write-locked (INV-PAYROLL-21)
                    │ PATCH /admin/payroll/:id/pay           (empty body)
                    ▼
        ╔═══════════════════════╗
        ║        paid           ║ ◄══ FINAL STATE
        ╚═══════════════════════╝     paidAt = now(), set exactly once
                                      no transition out of here
```

**Transition table**

| From | To | Endpoint | Valid |
|---|---|---|---|
| (none) | `draft` | `POST /admin/payroll` | ✅ |
| `draft` | `finalized` | `PATCH /:id/finalize` | ✅ |
| `finalized` | `paid` | `PATCH /:id/pay` | ✅ |
| `draft` | `paid` | — | ❌ skipping, 409 |
| `finalized` | `draft` | — | ❌ **doesn't exist** |
| `paid` | any | — | ❌ **doesn't exist** |
| any | (deleted) | — | ❌ no endpoint (Q-PAY-6) |

**One-way gate — precise statement**: after `finalize`, the amount is a payment commitment.
No "undo", no admin flag, no `totalAmount` edit. Mistakes found after finalize must be handled
by an adjustment period in a later period — **but the adjustment-period mechanism isn't
designed** (Q-PAY-6). The gate also propagates to `ClassSession`: sessions in a finalized period
are write-locked (handshake with INV-SESSION-03).

### 6.2 `TeacherPayRate`

```
(none) ──INSERT──► immutable record ──► [END]
                            │
                            └── no UPDATE, no DELETE, no status
```

`TeacherPayRate` **has no state machine** — no `status` column. "In effect" is a property
**derived from dates**, not stored state: the rate in effect on day D = the record with the
newest `effectiveFrom <= D`. This is exactly C2's dispute: if `effectiveTo` gets written,
"in effect" becomes stored state and every statement in INV-PAYROLL-01 must be rewritten.

## 7. Transaction boundary

### TX-PAY-A — `POST /admin/payroll` (the module's most important block)

Isolation: `READ COMMITTED` + `SELECT ... FOR UPDATE` in step 3. No `SERIALIZABLE` (high retry
cost on the hot session table, and row locks already serialize sufficiently).

```
BEGIN
 1. Validate DTO. SELECT User WHERE id=:teacherId → exists, role='teacher'
    (fail → rollback, nothing written)

 2. INSERT PayrollPeriod (teacherId, periodStart, periodEnd,
                          status='draft', totalSessions=0, totalAmount=0)
    -- INSERT FIRST, deliberately: UNIQUE(teacherId, periodStart, periodEnd) fires right here,
    -- blocking a concurrent same-period request at the earliest point, BEFORE the expensive
    -- collect-and-compute work.
    -- P2002 → rollback → 409 (§9)

 3. SELECT id, scheduledDate, actualStart, actualEnd
      FROM "ClassSession"
     WHERE "teacherId"=:teacherId AND status='approved'
       AND "payrollPeriodId" IS NULL
       AND "scheduledDate" BETWEEN :periodStart AND :periodEnd
     ORDER BY "scheduledDate", id
       FOR UPDATE
    -- FOR UPDATE locks rows: a concurrent request with an overlapping range must WAIT,
    -- then re-read state after commit → no double collection.

 4. SELECT id, rateType, rateAmount, effectiveFrom
      FROM "TeacherPayRate" WHERE "teacherId"=:teacherId
     ORDER BY "effectiveFrom" DESC
    -- ONE single query loading all of the teacher's rates (a small row count),
    -- then match in memory by scheduledDate → avoids N+1 (§11).

 5. For each session: pick rate (INV-PAYROLL-01) → compute amount (INV-PAYROLL-05..08)
    -- No applicable rate found   → THROW → full rollback (INV-PAYROLL-16)
    -- per_hour missing actualStart/End → THROW → full rollback (INV-PAYROLL-17)

 6. UPDATE "ClassSession" SET "payrollPeriodId"=:periodId, "updatedAt"=now()
     WHERE id IN (:ids) AND "payrollPeriodId" IS NULL AND status='approved'
    -- affectedRows MUST equal the row count of step 3. Otherwise → THROW → rollback (INV-PAYROLL-14)

 7. UPDATE "PayrollPeriod" SET "totalSessions"=:n, "totalAmount"=:sum, "updatedAt"=now()
     WHERE id=:periodId

 8. INSERT audit (actorId, periodId, action='create', totalAmount, totalSessions, at)
COMMIT
```

**Mandatorily one transaction**: collect + compute + INSERT period + assign `payrollPeriodId` +
write audit. No externally observable intermediate state: no created period with unassigned
sessions (a wrong 0-VND period on screen), no assigned session whose period rolled back (an
"orphaned" session, permanently locked out of every future period because `payrollPeriodId` NOT
NULL points to a nonexistent id).

If step 6 ran outside step 2's transaction, a crash in between leaves an orphaned session that
**cannot self-recover** — the session is approved, assigned, but never paid. That is a teacher's
real lost money, not a minor data issue.

### TX-PAY-B — `finalize`

```
BEGIN
 1. UPDATE "PayrollPeriod" SET status='finalized', "updatedAt"=now()
     WHERE id=:id AND status='draft'          -- conditional update
    -- affectedRows = 0 → THROW (error classification in §8)
 2. INSERT audit (actorId, periodId, action='finalize', totalAmount at lock time, at)
COMMIT
```

The audit must record `totalAmount` **at lock time** — it's the only record proving the
committed amount, independent of the §3.5 breakdown being recomputed.

### TX-PAY-C — `pay`

```
BEGIN
 1. UPDATE "PayrollPeriod" SET status='paid', "paidAt"=now(), "updatedAt"=now()
     WHERE id=:id AND status='finalized' AND "paidAt" IS NULL
 2. INSERT audit (actorId, periodId, action='pay', paidAt, at)
COMMIT
```

`AND "paidAt" IS NULL` is logically redundant (status already implies it) but kept as a second
barrier for INV-PAYROLL-22.

### TX-PAY-D — `POST /admin/pay-rates`

```
BEGIN
 1. SELECT User WHERE id=:teacherId → role='teacher'
 2. pg_advisory_xact_lock(hashtext('pay_rate:' || :teacherId))
    -- serialize per teacher; can't FOR UPDATE because there may be no rows yet
 3. SELECT MAX("effectiveFrom") FROM "TeacherPayRate" WHERE "teacherId"=:teacherId
    -- :effectiveFrom <= max → THROW RATE_EFFECTIVE_DATE_IN_PAST (INV-PAYROLL-27)
 4. INSERT "TeacherPayRate" (...)
    -- UNIQUE(teacherId, effectiveFrom) is the last barrier if the advisory lock is bypassed
 5. INSERT audit
COMMIT
```

**Must NOT be inside the transaction** (all TX): outbound HTTP, email/bank notification, file
writes. If teachers need a notification when a period is `paid` later, use an outbox (INSERT in
TX, worker sends outside TX) — out of scope for now, Q-PAY-8.

## 8. Idempotency & concurrency

### 8.1 Two requests creating the same period for the same teacher

This is the scenario that must be absolutely blocked: double collection = paying twice.

**Three defense layers, all three required** (each blocks a different scenario):

| Layer | Mechanism | Blocks |
|---|---|---|
| **L1 — DB constraint** | `UNIQUE (teacherId, periodStart, periodEnd)` on `PayrollPeriod`, named `payroll_period_teacher_range_uq` | Two **different** admins both clicking "create period 07/2026" for the same teacher. INSERT at TX-PAY-A step 2 → the loser gets Prisma `P2002` → 409. This barrier is **impossible to bypass**, even if the application layer has a bug. |
| **L2 — Idempotency key** | Header `Idempotency-Key: <uuid>` + helper table `IdempotencyKey(key PK, endpoint, actorId, requestHash, responseStatus, responseBody jsonb, createdAt)`, TTL 24h | **The same client** retrying after a network timeout, or a user double-click. L1 doesn't help here because the client needs the **old response back**, not a confusing 409. Semantics: same `key` + same `requestHash` → replay the stored response verbatim (201 + old body); same `key` + different `requestHash` → 422. Write `IdempotencyKey` **inside TX-PAY-A**. |
| **L3 — Session predicate** | `AND "payrollPeriodId" IS NULL` in the WHERE of step 6 (TX-PAY-A) + checking `affectedRows` matches step 3's count | Two **different but overlapping** periods (e.g. `07-01..07-31` and `07-15..08-15`) — L1 can't catch these (different key pairs). L3 ensures each session enters exactly one period, so money isn't doubled even if overlapping periods get created. |

**A gap remains**: L3 blocks doubled money but **doesn't block creating overlapping periods**,
leading to two periods where the second only picks up leftover sessions — skewed reporting.
Closed by `EXCLUDE USING gist` (INV-PAYROLL-25, §12) — proposed, Q-PAY-3.

**Why `FOR UPDATE` in step 3 is necessary despite L3**: without it, two overlapping requests
both SELECT the same session set, both reach step 6, one wins and the other sees mismatched
`affectedRows` → rollback after doing all the work. With `FOR UPDATE`, the second request waits
at step 3, re-reads after commit, sees the sessions already have `payrollPeriodId` → cleanly
excludes them.

### 8.2 Concurrent finalize / pay

**Conditional update — optimistic lock using `status` as the version column** (like spec 04 §8):

```sql
UPDATE "PayrollPeriod" SET status='finalized', "updatedAt"=now()
 WHERE id = $1 AND status = 'draft';
```

Prisma `updateMany` → check `count === 1`. **Forbidden**: `findUnique` to check status then
`update` by `id` — read-then-write isn't atomic; two admins finalizing concurrently would both
"win" and write two audit rows.

Classification when `affectedRows = 0` (one `SELECT id, status` after rollback):

| Result | HTTP | code |
|---|---|---|
| 0 rows | 404 | `PAYROLL_PERIOD_NOT_FOUND` |
| finalize with status ∈ {`finalized`,`paid`} | 409 | `PAYROLL_PERIOD_FINALIZED` |
| pay with status = `draft` | 409 | `PAYROLL_PERIOD_FINALIZED` (not finalized ⇒ can't pay) |
| pay with status = `paid` | 409 | `PAYROLL_PERIOD_FINALIZED` |

⚠ The last three branches share one code because the registry **lacks** a code specific to
"not finalized" and "already paid". This is an error-code gap → Q-PAY-11. No new codes invented.

### 8.3 Concurrent `POST /admin/pay-rates`

Two admins setting a rate for the same teacher at the same time → without a lock both pass the
`MAX(effectiveFrom)` check then both INSERT, creating two records with the same `effectiveFrom`
→ INV-PAYROLL-01 becomes non-deterministic (`LIMIT 1` picks randomly between two different rates
→ **pay depends on luck**). Blocked by `pg_advisory_xact_lock` (TX-PAY-D step 2) +
`UNIQUE(teacherId, effectiveFrom)` as the last barrier.

### 8.4 Payroll running concurrently with session approval (spec 04)

TX-PAY-A step 3 locks `ClassSession` rows with `FOR UPDATE`; spec 04's TX-SES-A writes the same
rows via conditional UPDATE. Two transactions touching the same row → PostgreSQL serializes at
the row-lock level automatically. Two outcomes, both correct: (a) approve commits first → the
session lands in the collected set; (b) payroll commits first → the session goes to the next
period. No scenario of a session collected with a stale status.

### 8.5 Repeated finalize / pay requests

The second gets **409**, not a fake-idempotent 200 (same reason as spec 04 §8: this is a
financial action; silently swallowing a second click hides a two-admin conflict). No
`Idempotency-Key` for these two endpoints — the natural key `(periodId, current status)` already
suffices.

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| No token / broken token | 401 | `AUTH_TOKEN_INVALID` | in API_ERROR_CODES.md |
| Token expired | 401 | `AUTH_TOKEN_EXPIRED` | in API_ERROR_CODES.md |
| Not admin / admin suspended | 403 | `AUTH_INSUFFICIENT_ROLE` | in API_ERROR_CODES.md |
| Malformed DTO (`rateAmount <= 0`, `periodEnd < periodStart`, wrong enum, wrong uuid) | 400 | `VALIDATION_ERROR` + `details` | in API_ERROR_CODES.md |
| `teacherId` doesn't exist | 404 | `USER_NOT_FOUND` | in API_ERROR_CODES.md |
| `teacherId` exists but `role ≠ 'teacher'` | 400 | `VALIDATION_ERROR` with `details.teacherId` | in API_ERROR_CODES.md |
| `:id` payroll period doesn't exist | 404 | `PAYROLL_PERIOD_NOT_FOUND` | ⚠ **disputed** — in API_ERROR_CODES.md §3 registry, **not** in `_FACTS.md`'s "Existing error codes" list (Q-PAY-11) |
| finalize when ≠ `draft`; pay when ≠ `finalized` | 409 | `PAYROLL_PERIOD_FINALIZED` | ⚠ **disputed** (as above) |
| No rate in effect at a session's `scheduledDate` | 404 | `RATE_NOT_FOUND` | **proposed, not agreed** (RATE_* group) |
| `effectiveFrom` ≤ current `MAX(effectiveFrom)` | 400 | `RATE_EFFECTIVE_DATE_IN_PAST` | **proposed, not agreed** |
| Someone adds a rate edit/delete route | 409 | `RATE_IMMUTABLE` | **proposed, not agreed** — no route needs it today |
| **Duplicate period `(teacherId, periodStart, periodEnd)`** | 409 | **DUPLICATE_ENTRY** | ⚠ **GAP** — this code only appears in the `GlobalExceptionFilter` code snippet in API_ERROR_CODES.md §5 (mapping Prisma `P2002`), **not in the §3 registry table**. No `PAYROLL_PERIOD_DUPLICATE` code exists (*proposed*, 2026-08-19). Needs locking (Q-PAY-11) |
| Overlapping period (if EXCLUDE constraint enabled) | 409 | *(no code yet)* | ⚠ **GAP** (Q-PAY-3 + Q-PAY-11) |
| `per_hour` with `actualStart`/`actualEnd` NULL | 400 | *(no code yet)* | ⚠ **GAP** — `PAYROLL_SESSION_NOT_COMPLETED` is closest but semantically wrong (the session is already approved). Q-PAY-11 |
| `Idempotency-Key` duplicate, `requestHash` differs | 422 | *(no code yet)* | ⚠ **GAP** — Q-PAY-5 |

**Error-code summary**: this module has **4 error branches with no valid code** and **2 code
groups in dispute**. No new codes invented. If still unresolved at coding time: use the correct
HTTP status + `VALIDATION_ERROR` or the closest code, leave a TODO with a tracking code, and
**don't** lock FE contracts for those branches.

Flat error envelope per API_CONVENTIONS.md; `details` only on `VALIDATION_ERROR`.

## 10. Side effects & notifications

**This module produces NO Notification.** `ENTITY_NOTIFICATION.md` lists 11 types and **none is
for payroll**: no `payroll_finalized`, no `payroll_paid`, no `pay_rate_changed`.

Business consequence: teachers are **not notified** when their payroll period is finalized or
paid, and not notified when their rate changes. Combined with `TeacherPayRate` read = `❌` for
teachers, a teacher **has no way at all** to know their rate changed. → Q-PAY-8.

**The module's real side effects** (not notifications):

| Action | Side effect on other tables |
|---|---|
| `POST /admin/payroll` | Writes `ClassSession.payrollPeriodId` for N sessions → a second lock layer on those sessions (spec 04 INV-SESSION-03) |
| `PATCH /:id/finalize` | Permanently locks the amount + write-locks all sessions in the period (INV-PAYROLL-21) |
| `PATCH /:id/pay` | Sets `paidAt`; it's input for the "monthly payroll" tile of `GET /admin/dashboard/stats` |
| `POST /admin/pay-rates` | Changes the applicable rate for **future sessions**; doesn't change created periods (thanks to INV-PAYROLL-27 forbidding backdating) |

No email, no webhook, no bank gateway call. `PATCH /:id/pay` merely **records** that the
transfer happened outside the system (ENTITY_PAYROLL_PERIOD: "Admin marks after actual bank
transfer").

## 11. Index & query

```
PayrollPeriod:  UNIQUE ("teacherId", "periodStart", "periodEnd")   -- INV-PAYROLL-24, named payroll_period_teacher_range_uq
PayrollPeriod:  INDEX  ("teacherId", "periodStart" DESC)           -- GET /admin/payroll filter + sort
PayrollPeriod:  INDEX  (status)                                    -- status filter + dashboard
TeacherPayRate: UNIQUE ("teacherId", "effectiveFrom")              -- INV-PAYROLL-28 (mandatory, not optimization)
TeacherPayRate: INDEX  ("teacherId", "effectiveFrom" DESC)         -- the rate-selection query INV-PAYROLL-01
ClassSession:   INDEX  ("teacherId", status, "scheduledDate")      -- the collect query TX-PAY-A step 3
ClassSession:   INDEX  ("payrollPeriodId")                         -- breakdown GET /admin/payroll/:id
ClassSession:   INDEX  ("teacherId", "scheduledDate")
                  WHERE status='approved' AND "payrollPeriodId" IS NULL   -- partial, the collect set is always small
```

**N+1 risk — must be blocked**:

1. **Worst**: a loop looking up `TeacherPayRate` per session → N queries for N sessions (a
   20–40-session period = 40 queries). **Fix**: one query loading all of the teacher's rates
   (`ORDER BY effectiveFrom DESC`), match in memory by scanning the sorted array for the first
   element with `effectiveFrom <= scheduledDate`. Each teacher's rate-row count is always small
   (tens).
2. `GET /admin/payroll` list: **forbidden** to JOIN `ClassSession` to re-count `totalSessions` —
   read the stored column directly. That's why the column exists.
3. `GET /admin/payroll` list: loop fetching `teacherName` per row → use
   `include: { teacher: { select: { id, nickname } } }`.
4. `GET /admin/payroll/:id`: fetch the period's sessions in **one** query (index `payrollPeriodId`),
   fetch `Class` via `include`, fetch rates in one query per item 1.
5. `meta.total`: separate `COUNT(*)` with the same WHERE, not `findMany().length`.

**Correctness-check queries** (run in the monitoring job, §14):

```sql
-- INV-PAYROLL-18: totalSessions must match the real assigned session count
SELECT p.id, p."totalSessions", COUNT(s.id)
  FROM "PayrollPeriod" p LEFT JOIN "ClassSession" s ON s."payrollPeriodId" = p.id
 GROUP BY p.id, p."totalSessions" HAVING p."totalSessions" <> COUNT(s.id);
-- result MUST be empty

-- orphan sessions: assigned but the period doesn't exist
SELECT s.id FROM "ClassSession" s
 WHERE s."payrollPeriodId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "PayrollPeriod" p WHERE p.id = s."payrollPeriodId");
-- MUST be empty (FK guarantees, but checked to catch a missing FK)

-- assigned but not approved: violates INV-PAYROLL-13
SELECT id FROM "ClassSession" WHERE "payrollPeriodId" IS NOT NULL AND status <> 'approved';
-- MUST be empty
```

## 12. Migration & seed

**Mandatory migration**

```
-- PayrollPeriod
ADD UNIQUE ("teacherId", "periodStart", "periodEnd")     -- INV-PAYROLL-24
ADD CHECK  ("periodEnd" >= "periodStart")
ADD CHECK  ("totalAmount" >= 0 AND "totalSessions" >= 0)
ADD CHECK  (("status" = 'paid') = ("paidAt" IS NOT NULL))  -- INV-PAYROLL-22
ADD INDEX  ("teacherId", "periodStart" DESC), INDEX (status)

-- TeacherPayRate
ADD UNIQUE ("teacherId", "effectiveFrom")                -- INV-PAYROLL-28
ADD CHECK  ("rateAmount" > 0)
ADD INDEX  ("teacherId", "effectiveFrom" DESC)

-- ClassSession
ADD FK     ("payrollPeriodId") REFERENCES "PayrollPeriod"(id)   -- confirm it exists
ADD INDEX  ("payrollPeriodId")
ADD partial INDEX per §11
```

**Proposed migration, awaiting decisions** (don't run before they're locked):

```
-- Q-PAY-3: prevent overlapping periods (INV-PAYROLL-25)
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT payroll_period_no_overlap
  EXCLUDE USING gist (
    "teacherId" WITH =,
    daterange("periodStart", "periodEnd", '[]') WITH &&
  );
-- Must check existing overlapping data BEFORE running, otherwise the migration fails.

-- Q-PAY-5: idempotency table
CREATE TABLE "IdempotencyKey" (
  key text PRIMARY KEY, endpoint text NOT NULL, "actorId" uuid NOT NULL,
  "requestHash" text NOT NULL, "responseStatus" int, "responseBody" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
```

**C2-dependent migration** (don't run before C2 is locked): if resolved purely per ADR-008, the
`TeacherPayRate.effectiveTo` column becomes dead → either DROP (breaking for the FE contract), or
keep and add `CHECK ("effectiveTo" IS NULL)` to forbid writes. If resolved per the ENTITY doc,
an UPDATE mechanism must be added and **INV-PAYROLL-01, 26, 27, §6.2, §7 TX-PAY-D entirely
rewritten**.

**Seed for testing money and conflicts** (must INSERT directly into the DB because spec 04's
SCOPE-01/02 block the API creation path):

1. 2 admins `role=admin, status=active` (to test two-admin conflicts).
2. Teacher **T1** — `rateType=per_session`, 2 rates: `250000.00` from `2026-07-01`,
   `300000.00` from `2026-07-16`.
3. Teacher **T2** — `rateType=per_hour`, 1 rate `200000.00` from `2026-07-01`.
4. Teacher **T3** — **no rate at all** (tests INV-PAYROLL-16).
5. Teacher **T4** — first rate from `2026-07-10`, with an `approved` session on `2026-07-05`
   (**before** the first rate → tests INV-PAYROLL-16's "has a rate but not yet in effect" branch).
6. T1's sessions: 4 `approved` sessions on `07-03, 07-10, 07-20, 07-25` → period 07/2026 must
   produce `2×250000 + 2×300000 = 1,100,000` with `totalSessions = 4`. **This is the
   INV-PAYROLL-02 verification case.**
7. T2's sessions: a 2h00 session (`11:00Z→13:00Z`) → `400000.00`; a 1h30 session
   (`11:00Z→12:30Z`) → `300000.00`; a 1h37m20s session → `hours = 1.6166` (round down to the
   minute: 97 minutes) → `200000 × 97/60 = 323333.333…` → **HALF_UP to 2 decimals = `323333.33`**.
   Period total = `1,023,333.33`. **This is the INV-PAYROLL-07 + INV-PAYROLL-08 verification
   case.**
8. A T2 session missing `actualEnd` (tests INV-PAYROLL-17).
9. `completed_pending` and `rejected` sessions within the period range (must **not** be collected
   — INV-PAYROLL-13).
10. An `approved` session that already has `payrollPeriodId` pointing to an old period (must
    **not** be re-collected — INV-PAYROLL-14).
11. `approved` sessions on `2026-06-30` and `2026-08-01` (test the period boundary,
    INV-PAYROLL-12).
12. One `draft`, one `finalized`, one `paid` period ready for transition tests.

## 13. Security & rate limit

- **Never return**: `User.passwordHash`, `User.email`, `User.lastLoginAt`, `User.bio`. Use
  explicit `select`, never a bare `include: { teacher: true }` (INV-PAYROLL-32).
- **Pay is sensitive HR data**: `rateAmount`, `totalAmount` must **not** go into `info`-level
  logs, APM trace attributes, or analytics events. Only in the access-controlled audit table.
- **Don't** log `Idempotency-Key` together with the body (the body contains money).
- Cross-teacher leakage: every endpoint is admin-only so there's no tenant risk; but when the
  teacher route is built (Q-PAY-7), **mandatory** `period.teacherId === actor.id` filtering at
  the service layer, never trusting client-sent query params.
- **Proposed rate limits** (API_CONVENTIONS.md has no rate-limit section → Q-PAY-12):
  `POST /admin/payroll` **10 req/min/admin** (each request is a heavy TX holding row locks; spam
  locks up the session table); `POST /admin/pay-rates` 20/min; `PATCH finalize|pay` 20/min; the
  `GET`s 60/min. Over → 429 — ⚠ no 429 code in the registry.
- **Audit mandatory, immutable, non-deletable**: every `create`/`finalize`/`pay`/`set-rate`
  records `actorId`, `entityId`, `action`, `totalAmount` or `rateAmount` at that moment, `at`,
  `ip`. The `finalize` audit is the only voucher for the committed amount.
- Validate uuid before querying to avoid Prisma errors leaking schema details into responses.

## 14. Observability

**Logs** (structured; **without** money amounts — see §13):
- `payroll.create.attempt` / `.success` / `.conflict` / `.rollback` — `{ actorId, teacherId, periodStart, periodEnd, sessionCount }`
- `payroll.create.no_rate` — `{ teacherId, sessionId, scheduledDate }` — **level ERROR**; missing data blocks an entire payroll period
- `payroll.finalize.conflict` / `payroll.pay.conflict` — `{ actorId, periodId, observedStatus }` — **level WARN**; two-admin conflict
- `payrate.create.success` / `.rejected_backdate` — `{ actorId, teacherId, effectiveFrom }`

**Metrics**:
- `payroll_create_latency_ms` — histogram. TX-PAY-A holds row locks on `ClassSession`; rising p99
  = lock-spill risk into spec 04's approve flow.
- `payroll_create_rollback_total{reason}` — `reason ∈ {no_rate, missing_actual_time,
  affected_rows_mismatch, duplicate_period}`. A non-zero `affected_rows_mismatch` = an unsealed race.
- `payroll_period_conflict_total` — finalize/pay conflict counter.
- `payroll_draft_age_seconds` — histogram of `draft` period age. Periods stuck in draft too long
  = pay not finalized.
- `payroll_sessions_unpaid_gauge` — count of `approved` sessions with `payrollPeriodId IS NULL`
  older than 45 days. Rising = teachers being missed from every payroll period. **This is the
  module's most important metric** — it catches the exact kind of error nobody complains about
  until it's too late.
- `payroll_integrity_violations_gauge` — number of rows returned by the 3 check queries in §11,
  run periodically. Must always be 0.

**Alerts**: `payroll_sessions_unpaid_gauge > 0`; `payroll_integrity_violations_gauge > 0`
(highest severity); `payroll_create_rollback_total{reason="affected_rows_mismatch"}` > 0;
`payroll_draft_age_seconds` p95 > 14 days.

## 15. Test matrix

`svc` = unit service · `int` = integration via HTTP + **real DB** · `db` = direct on **real DB**.
**Everything can make money wrong.**

| INV | Type | Test description |
|---|---|---|
| INV-PAYROLL-01 | **int (real DB)** | Teacher has `250000` from `07-01` and `300000` from `07-16`. A session on `07-10` must apply `250000`; a session on `07-16` must apply `300000` (boundary: exactly on `effectiveFrom` the **new** rate applies); a session on `07-20` applies `300000`. Add a `400000` rate from `08-01` **after** period 07 exists → recomputing period 07 doesn't change. |
| INV-PAYROLL-02 | **int (real DB)** | Seed §12 item 6 → `totalAmount = "1100000.00"`, `totalSessions = 4`. Assert the period holds **2 different rates** by checking `GET /admin/payroll/:id` breakdown: 2 rows `appliedRateAmount="250000.00"`, 2 rows `"300000.00"`. |
| INV-PAYROLL-03 | int (real DB) | Run the computation 3 times on the same dataset (rollback between runs) → identical `totalAmount` to the cent. Reverse the `ORDER BY` of step 3 → result unchanged. |
| INV-PAYROLL-04 | int (real DB) | Teacher switches `per_session` → `per_hour` mid-period. Sessions before the switch count-based, after switch hour-based. Check each breakdown line's `appliedRateType`. |
| INV-PAYROLL-05 | int (real DB) | `per_session`, 5 sessions of different lengths (including one 15-min session) → `totalAmount = 5 × rate`, independent of duration. |
| INV-PAYROLL-06 | **int (real DB)** | `per_hour` at 200000 VND: 2h00 → `400000.00`; 1h30 → `300000.00`; 0h45 → `150000.00`. Test the **scheduled-time ban**: a session scheduled 2h but actual 1h → must produce `200000.00`, not `400000.00`. |
| INV-PAYROLL-07 | **int (real DB)** | 1h37m20s → round down to 97 minutes → `hours = 1.6166…`. 1h00m59s → 60 minutes → `hours = 1.00`. 0h00m30s → 0 minutes → `amount = 0.00`. |
| INV-PAYROLL-08 | **int (real DB)** | §12 item 7 case: 3 sessions → `400000.00 + 300000.00 + 323333.33 = 1023333.33`. Assert **`Σ breakdown[].amount` === `totalAmount`** to the cent. Counter-case: summing first then rounding would produce a different number → the test must fail if someone reorders. |
| INV-PAYROLL-09 | db | `totalAmount` column `numeric(12,2)`; INSERTing a negative value → CHECK blocks. Empty period → `totalAmount = 0.00`. |
| INV-PAYROLL-10 | int (real DB) | `per_hour` with 3 sessions totaling 7.5 hours → `totalSessions = 3` (**not** 7 or 8). |
| INV-PAYROLL-11 | **int (real DB)** | Rate `333333.33` × 3 `per_session` sessions → exactly `999999.99`. Rate `0.01` × 10000 sessions → no precision loss. Check the JSON response: money is **string**, not number. Check for no `Number()`/`parseFloat` on the money path (static test: grep + lint rule). |
| INV-PAYROLL-12 | **int (real DB)** | Period `07-01..07-31`: sessions on `06-30` and `08-01` **don't** enter; sessions on `07-01` and `07-31` **do** (closed both ends). |
| INV-PAYROLL-13 | int (real DB) | Within the period range there are `completed_pending`, `rejected`, `scheduled`, `in_progress` sessions → none collected; their `payrollPeriodId` stays NULL after commit. |
| INV-PAYROLL-14 | **db — real concurrency** | Create period A `07-01..07-15` then period B `07-10..07-25` (overlapping). A session on `07-12` must belong to **exactly one** period. Run the two requests concurrently → assert `affectedRows` matched or a clean rollback; no session's `payrollPeriodId` changed. |
| INV-PAYROLL-15 | db | The "session paid twice" query in §11 returns empty after every test. |
| INV-PAYROLL-16 | **int (real DB)** | Teacher T3 (no rate) → `POST /admin/payroll` returns 404 `RATE_NOT_FOUND`; assert **`COUNT(PayrollPeriod)` unchanged** and **no session assigned** `payrollPeriodId`. Teacher T4 (session `07-05` before first rate `07-10`) → same result. Mixed case: 9 sessions with rates + 1 without → **all 10 unassigned**, no period created. |
| INV-PAYROLL-17 | int (real DB) | `per_hour` with a session missing `actualEnd` → request fails entirely, no period created, no session assigned. |
| INV-PAYROLL-18 | db | After every period-creating test, run the `totalSessions` cross-check query in §11 → empty. Put it in the suite's `afterEach`. |
| INV-PAYROLL-19 | int (real DB) | 3-status × 2-action matrix: `draft`+pay → 409; `finalized`+finalize → 409; `paid`+finalize → 409; `paid`+pay → 409; `draft`+finalize → 200; `finalized`+pay → 200. After each 409, the DB is unchanged (match `updatedAt`). |
| INV-PAYROLL-20 | **int (real DB)** | After finalize: no endpoint can change `totalAmount`/`totalSessions`/the session set. Sending `totalAmount` in a finalize/pay body → stripped. Creating a new overlapping period → no session removed from the finalized period. |
| INV-PAYROLL-21 | int + db | Session in a `finalized` period: every UPDATE via service blocked; `UPDATE ... WHERE payrollPeriodId IS NULL` gives `affectedRows = 0`. Handshake with spec 04's INV-SESSION-03 test. |
| INV-PAYROLL-22 | int + db | `draft`/`finalized` → `paidAt` NULL. After pay → NOT NULL. Second pay → 409, `paidAt` **unchanged**. DB: INSERT `status='paid', paidAt=NULL` → CHECK blocks; INSERT `status='draft', paidAt=now()` → CHECK blocks. |
| INV-PAYROLL-23 | int | No DELETE route for `/admin/payroll/:id` (route 404, not 403). |
| INV-PAYROLL-24 | **db — real concurrency** | Two concurrent connections doing `POST /admin/payroll` with the same `(teacherId, periodStart, periodEnd)`. Assert: exactly **1** period in the DB; exactly **1** response 201, the other 409; **total assigned sessions = one period's worth, not doubled**; the single period's `totalAmount` equals the expected value. Repeat ≥ 50 rounds. |
| INV-PAYROLL-25 | db | (When EXCLUDE is enabled) INSERT period `07-01..07-31` then `07-15..08-15` for the same teacher → constraint blocks. Same range but **different teacher** → allowed. Adjacent `07-01..07-31` + `08-01..08-31` → allowed (`'[]'` boundary doesn't overlap). |
| INV-PAYROLL-26 | int | No PATCH/DELETE route for `/admin/pay-rates/:id`. After many POSTs, `COUNT(TeacherPayRate)` grows exactly by the POST count and **no old record's `updatedAt` changed**. |
| INV-PAYROLL-27 | int (real DB) | With a rate `effectiveFrom='2026-07-01'` existing: POST `2026-06-15` → 400 `RATE_EFFECTIVE_DATE_IN_PAST`; `2026-07-01` (equal) → 400; `2026-07-02` → 201. |
| INV-PAYROLL-28 | **db — real concurrency** | Two connections INSERTing rates with the same `(teacherId, effectiveFrom)` → exactly 1 succeeds. Without the UNIQUE this test must fail (proving the constraint is necessary, not decorative). |
| INV-PAYROLL-29 | int + db | `rateAmount` = `0`, `-1`, `"abc"`, `"100.999"` → 400 `VALIDATION_ERROR`. `rateType = "fixed_monthly"` → 400. DB: CHECK blocks `rateAmount <= 0`. |
| INV-PAYROLL-30 | int (real DB) | `teacherId` pointing to a `role='student'` or `role='admin'` user → 400 with `details.teacherId`. Nonexistent `teacherId` → 404 `USER_NOT_FOUND`. |
| INV-PAYROLL-31 | int | 7 endpoints × {teacher token, student token, `suspended` admin, no token} → 403/403/403/401. |
| INV-PAYROLL-32 | int | Match every response key against a whitelist; assert no `passwordHash`, no `email`. |

**Additional non-INV tests** (still mandatory):
- **Idempotency (Q-PAY-5)**: same `Idempotency-Key` + same body sent twice → 1 period in the DB,
  the second response identical to the first. Same key + different body → 422.
- **TX-PAY-A atomic rollback**: inject errors at step 6 and step 7 → after rollback: 0 new
  periods, 0 assigned sessions, 0 audit rows.
- **Empty period**: a period with no eligible sessions → behavior currently unlocked (Q-PAY-6);
  the test must lock the chosen behavior so it doesn't drift.
- **N+1 gate**: enable query logging, create a 40-session period → total queries ≤ 8.
  `GET /admin/payroll` with 20 rows → ≤ 4 queries. The threshold is a CI gate.
- **Envelope**: success responses match `{ data }` / `{ data, meta }`; errors match the flat
  7-field envelope.

## 16. Unresolved

| # | Question | What it blocks | Owner | Decide by |
|---|---|---|---|---|
| **C2** 🔴 | **The module's most serious contradiction.** `ADR-008 Rates append-only` (status **Accepted**) says: change a rate = **CREATE A NEW RECORD** with a new `effectiveFrom`, **no update endpoint, no delete**, and the rate-lookup query is `WHERE effectiveFrom <= <date> ORDER BY effectiveFrom DESC LIMIT 1` — **`effectiveTo` is never used**. But `ENTITY_TEACHER_PAY_RATE.md` (and `ENTITY_STUDENT_TUITION_RATE.md`) says: *"To update rate: **set `effectiveTo` on current**, create new record"* and *"Active rate = where `effectiveTo IS NULL` or `effectiveTo > today`"* — i.e. the old row **IS updated**. **Both can't be true.** Three consequences of coding before locking: (a) two different rate-selection SQL queries → two different amounts for the same payroll period; (b) if `effectiveTo` is written, `TeacherPayRate` stops being append-only and concurrency (§8.3) and audit must be redesigned; (c) every invariant INV-PAYROLL-01, 02, 03, 04, 26, 27 and all of §6.2, §7 TX-PAY-D must be rewritten. **This spec tentatively locks per ADR-008** (reasoning: the ADR is Accepted while the ENTITY doc isn't an ADR; and FE `admin-tuition-rates.spec.md` describes the rate history using only `effectiveFrom` + a `current` flag, **no `effectiveTo`** → another vote for ADR-008). **This is a tentative lock, not a decision.** Verification note: `docs/shared/decisions/008-append-only-rates.md` is link-referenced by API_ADMIN.md and API_ERROR_CODES.md but **doesn't exist in the docs** (the `docs/shared/` folder only holds `RBAC_MATRIX.md`) — ADR-008's content is currently only known via the summary in `_FACTS.md`; the original was never read. | **BLOCKS ALL OF §4** — no money computation can be coded before this is locked | BE lead + PO + ADR-008 author | **before any line of this module's code** |
| **Q-PAY-1** 🔴 | **Payroll period boundary — three sub-questions, all three must be answered.** (1) **Timezone**: `periodStart`/`periodEnd` are `Date` (no timezone), but `ClassSession.actualStart` is a **UTC** `DateTime` (API_CONVENTIONS: all DateTimes are UTC) while classes run on Vietnam time (UTC+7). A class at 06:00 on `01/07` VN time = `2026-06-30T23:00Z` — **falls into last month** if anchored on UTC. This spec anchors collection on `ClassSession.scheduledDate` (type `Date`, no timezone, so immune) — **but it must be confirmed that `scheduledDate` is written as the VN local date, not the UTC date of `actualStart`**. If written per UTC, every early-morning class is billed in the wrong month. (2) **Closed/open boundary**: the spec tentatively locks `BETWEEN periodStart AND periodEnd` (closed both ends, `[]`). Confirm nobody reads it as `[)`. (3) **Must a period always be a calendar month?** FE `pages/_INDEX.md` says "period boundary undecided" and that's why `GET /admin/payroll/:id` is blocked. If periods are arbitrary, overlap must be sealed (Q-PAY-3); if periods are always months, UNIQUE `(teacherId, periodStart, periodEnd)` is almost enough. | INV-PAYROLL-12; `GET /admin/payroll/:id` (PROPOSED, blocks the FE's whole finalize flow); INV-PAYROLL-25 | PO + BE lead | **before Sprint 3** |
| **Q-PAY-9** | **Add `rateType = fixed_monthly`?** The enum only has `per_session` \| `per_hour`. FE `pages/_INDEX.md` lists "Pay-rate unit basis" as **pending decision #2**, which is why `GET /admin/pay-rates` is blocked. If `fixed_monthly` is added: (a) enum changes → migration; (b) INV-PAYROLL-05/06 get a third branch; (c) **`totalSessions` loses meaning** with flat pay (18 sessions or 2 sessions, same amount) — the column must be redefined; (d) proration questions arise when a teacher joins/leaves mid-month; (e) non-monthly periods raise the question of how to split. **Locking after coding means rewriting §4.** | Enum `rateType`; INV-PAYROLL-05/06/10; `GET /admin/pay-rates` | PO | **before Sprint 3** |
| Q-PAY-3 | Prevent overlapping periods: enable `EXCLUDE USING gist` or not (needs the `btree_gist` extension, needs cleaning existing overlapping data first)? If not enabled, overlapping periods with skewed numbers are accepted — INV-PAYROLL-14 still prevents doubled money but reports lie. | INV-PAYROLL-25; migration §12 | BE lead + DBA | before Sprint 3 |
| Q-PAY-4 | The breakdown at `GET /admin/payroll/:id` is currently **recomputed at read time** from `TeacherPayRate`, no snapshot stored. After a period is `finalized`, if rate data is touched by any path (migration, manual DB edit, or C2 resolving in favor of updates), the breakdown drifts from the locked `totalAmount`. Add a `PayrollPeriodLine` table (per-line snapshot: `sessionId`, `appliedRateId`, `hours`, `amount`)? | §3.5 reliability; accounting reconciliation ability | BE lead | before Sprint 4 |
| Q-PAY-5 | `Idempotency-Key`: `API_CONVENTIONS.md` has **no idempotency section at all**. Standardize a header + `IdempotencyKey` table system-wide, or payroll-only? What error code for "key duplicate, body differs"? | §8.1 layer L2; migration §12 | BE lead | before Sprint 3 |
| Q-PAY-6 | **A mistakenly created `draft` period has no cancellation path.** No `DELETE /admin/payroll/:id`. Sessions already assigned `payrollPeriodId` and no unassign endpoint → a mistaken period **permanently locks** those sessions out of every future period. Related: should an empty period (0 sessions) return 201 with `totalAmount=0` or be rejected? And how are mistakes found **after** finalize handled (the adjustment-period mechanism isn't designed)? | INV-PAYROLL-23; §6.1; real operations | PO + BE lead | **before Sprint 3** |
| Q-PAY-7 | RBAC_MATRIX says `PayrollPeriod read own = 🔒 Teacher` and ENTITY_PAYROLL_PERIOD says "Teacher can view own PayrollPeriods (read-only)", but **no route exists** and there's no `API_TEACHER.md`. Teachers currently can't see their pay. | §5; teacher lane | BE lead | before Sprint 4 |
| Q-PAY-8 | **No Notification type for payroll** in ENTITY_NOTIFICATION (11 types, no `payroll_*`, no `pay_rate_changed`). Combined with `TeacherPayRate read = ❌` for teachers (RBAC_MATRIX), a teacher **has no path to know their rate changed or their period was paid**. Add types (enum migration + ADR needed)? | §10; teacher experience | PO | before Sprint 4 |
| **Q-PAY-11** | **Error-code gaps — 4 branches without a valid code.** (a) Duplicate period: no `PAYROLL_PERIOD_DUPLICATE` (*proposed*, 2026-08-19); **DUPLICATE_ENTRY** only appears in the `GlobalExceptionFilter` snippet of API_ERROR_CODES.md §5, **not in the §3 registry table**. (b) Overlapping period: no code. (c) `per_hour` missing `actualStart`/`actualEnd`: no semantically correct code. (d) Idempotency-key conflict: no code. **Plus**: the `PAYROLL_*` group (`PAYROLL_PERIOD_NOT_FOUND`, `PAYROLL_PERIOD_FINALIZED`, `PAYROLL_SESSION_*`) **is** in API_ERROR_CODES.md §3 but **not** in `_FACTS.md`'s "Existing error codes" list → disputed status (this is **contradiction #5**, not yet recorded in `_FACTS.md`, same as spec 04's Q-SES-1). And `PAYROLL_PERIOD_FINALIZED` currently carries 3 different meanings (§8.2) for lack of codes. | All of §9; FE can't map errors | BE owner of API_ERROR_CODES | **before coding §9** |
| Q-PAY-10 | Split the "finalizer" ≠ "payer" roles (four-eyes for money-out actions)? Today every admin does both. | §5 | PO | before Sprint 4 |
| Q-PAY-12 | `API_CONVENTIONS.md` has no rate-limit section; the registry has no 429 code. §13 is proposing both. | §13 | BE lead | Sprint 4 |
| Q-PAY-13 | No ENTITY doc for the audit table, but §7, §13 and INV-PAYROLL-19/20/22 all depend on it. The `finalize` audit is the only financial voucher. What's the table called, who owns it? (overlaps spec 04's Q-SES-8) | Migration §12; §13 | BE lead | before Sprint 3 |
| **C1** | `User.nickname` (ENTITY_USER) vs `fullName` (API_AUTH). Which field does `teacherName` in DTO §3.2, §3.3, §3.5 read? | FE contract of all 3 payroll screens | BE lead | before locking the contract |

**Reverse dependency on spec 04**: this module only has input data when `approved` sessions
exist. And spec 04's SCOPE-01 (`Class`/`ClassEnrollment` have no endpoints) and SCOPE-02 (no
teacher-side endpoint to move a session to `completed_pending`) are blocking that source.
**Payroll cannot run end-to-end until those two scope gaps are filled** — only testable via DB
seed.
