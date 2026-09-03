# MODULE SPEC — Teacher 06: Income (read-only)

---
module: teacher-income
status: proposed
blocked_by: money representation (Decision A) — for any future computed field; this module reads stored values only
owner: BE owner (unset)
last_updated: 2026-09-03
---

> Owner decision 2026-09-03: **read-only over stored data, no computation.** This module
> never applies a `TeacherPayRate`, never recomputes amounts, never derives per-session money
> — those are exactly the branches blocked by **API-002/C2** (two contradictory rate-reading
> formulas) and Decision A (money representation). It also closes **Q-PAY-7** in
> `05-payroll.md` §16: RBAC grants `PayrollPeriod read own = 🔒 Teacher`, but no route existed.

## 0. Summary

Two read-only endpoints: the teacher's payroll periods and one period's detail. Everything
returned is either a stored column on `PayrollPeriod` / `ClassSession` or a session-list
join. Amounts are serialized as **strings** (module 05 §3.1's convention — Prisma `Decimal`
must not leak into JSON).

Sources, verbatim: `API_TEACHER.md` § Income, `ENTITY_PAYROLL_PERIOD.md`,
`ENTITY_CLASS_SESSION.md`, `docs/api/modules/05-payroll.md` §3.3/§3.5/§5, `RBAC_MATRIX.md`.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `PayrollPeriod` | R only | list + detail |
| `ClassSession` | R only | sessions of a period |
| `Class` | R only | `className` join |
| `TeacherPayRate` | — | **never read here** (RBAC: teacher rate read = ❌; §16-Q3) |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/teacher/payroll` | teacher (own) | List own payroll periods | defined |
| GET | `/teacher/payroll/:id` | teacher (own) | Payroll period detail + sessions | defined |

## 3. DTO

### 3.1 GET `/teacher/payroll` — list

Query: `?status=draft|finalized|paid` · `?year=` · `?page=&limit=`. Row + `meta`, field names
follow module 05 §3.3 verbatim:

```json
{ "id": "uuid", "teacherId": "uuid", "periodStart": "2026-07-01",
  "periodEnd": "2026-07-31", "status": "paid", "totalSessions": 18,
  "totalAmount": "5400000.00", "paidAt": "2026-08-05T09:00:00Z",
  "createdAt": "…" }
```

`totalAmount` is the **stored** `Decimal(12,2)` rendered as a string. `teacherName` is
omitted — the caller is the teacher.

### 3.2 GET `/teacher/payroll/:id` — detail

`PayrollPeriod` fields (§3.1) plus the period's sessions — **stored columns only**:

```json
{ "data": { "id": "uuid", "periodStart": "2026-07-01", "periodEnd": "2026-07-31",
    "status": "finalized", "totalSessions": 18, "totalAmount": "5400000.00",
    "paidAt": null,
    "sessions": [
      { "sessionId": "uuid", "classId": "uuid", "className": "…",
        "scheduledDate": "2026-07-03",
        "actualStart": "2026-07-03T11:00:00Z", "actualEnd": "2026-07-03T13:00:00Z",
        "status": "approved" }
    ] } }
```

Deliberately **absent** (module 05 §3.5 computes these at read time from `TeacherPayRate` —
C2 territory, out of scope by owner decision): `hours`, `appliedRateId`, `appliedRateType`,
`appliedRateAmount`, per-session `amount`. See §16-Q2.

## 4. Business rules (invariants)

| ID | Invariant |
|---|---|
| INV-TINC-01 | Both endpoints resolve the period with `period.teacherId === currentUser.id` in the service layer. Another teacher's period id → `404 PAYROLL_PERIOD_NOT_FOUND` (do not leak existence). The list filters by `teacherId`, never by role guard alone. |
| INV-TINC-02 | Every money value crossing the API is the **stored** column serialized as a string with 2 decimals (`"5400000.00"`). No arithmetic, no rate application, no rounding happens in this module. |
| INV-TINC-03 | No endpoint writes anything. `PayrollPeriod` lifecycle (`draft → finalized → paid`) is entirely Admin's (module 05); a teacher cannot even influence `isRead`-style flags here. |
| INV-TINC-04 | Session rows in the detail are exactly the sessions with `payrollPeriodId = period.id` (INV-PAYROLL-18's set), joined for `className` only — one query, `scheduledDate` ascending. |

## 5. Ownership / RBAC

```
Teacher   period.teacherId === req.user.id      (service layer — module 05 §5's exact
                                                  required condition for Q-PAY-7)
Student   ❌
Admin     ❌ (Admin reads all periods via module 05's /admin/payroll)
```

`RBAC_MATRIX.md`: `PayrollPeriod read own = 🔒 Teacher`. `TeacherPayRate` read is a
**three-way doc conflict** (no RBAC read row vs `PERMISSIONS_TEACHER.md` granting read-own) —
this module reads no rate either way (§16-Q3).

## 6. State machine

None. Read-only over module 05's `draft → finalized → paid` machine.

## 7. Transaction boundary

Single read queries. No writes, no transactions needed.

## 8. Idempotency & concurrency

GET is idempotent. A period finalizing mid-read returns either the pre- or post-write row —
no consistency contract beyond Prisma's default isolation.

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| Period id not found / not the caller's | 404 | `PAYROLL_PERIOD_NOT_FOUND` | agreed |
| Bad query values (status, year) | 400 | `VALIDATION_ERROR` | agreed (fallback family) |

## 10. Side effects & notifications

None — read-only. (Q-PAY-8: no payroll notification types exist at all; when they are added,
`payroll_paid` to the teacher would be module 05's job, not this one's.)

## 11. Index & query

- `PayrollPeriod(teacherId, periodStart DESC)` — list.
- `ClassSession(payrollPeriodId)` — detail join.
- No N+1: `className` comes from one join, not per-session lookups.

## 12. Migration & seed

Adds `PayrollPeriod` (per `ENTITY_PAYROLL_PERIOD.md`: `Decimal(12,2) totalAmount`, enums
`status`) — created **before** `ClassSession.payrollPeriodId` FK can exist, so this and module
05-TSES ship as one migration set (`PayrollPeriod` first). Seed: 3 periods for the seeded
teacher (`draft` / `finalized` / `paid` with `paidAt`), 1 period for a second teacher
(ownership test), sessions assigned via `payrollPeriodId`.

## 13. Security & rate limit

- Cross-teacher probing returns 404, not 403 — payroll data existence is itself sensitive.
- Money strings are display-safe; no formatting happens server-side beyond the fixed
  2-decimal string (VND has no minor unit — Decision A still open, §16-Q1; the string form is
  chosen precisely because it commits to nothing).

## 14. Observability

- Metric: `teacher_income_read_total`, list/detail p95. No PII in logs.

## 15. Test matrix

| INV | Type | Test |
|---|---|---|
| INV-TINC-01 | integration | teacher B reads A's period → 404; list shows only own rows |
| INV-TINC-02 | integration | `totalAmount` renders as string with 2 decimals, byte-equal to the stored Decimal; no numeric JSON |
| INV-TINC-03 | integration | no write endpoint exists (negative probe); POST/PUT/DELETE on the paths → 404/405 |
| INV-TINC-04 | integration (real DB) | detail sessions = exactly the seeded `payrollPeriodId` set, ordered by `scheduledDate`; `className` correct; derived rate fields absent |

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| Q1. **Decision A (money representation)** — untouched here by design; string-pass-through only. Whenever computed money appears (FE income detail wants per-session amounts), C2 + Decision A must be locked first. | any future computed field | PO + BE lead | before any money math |
| Q2. Module 05 §3.5's derived per-session fields (`hours`, `appliedRate*`, `amount`) are omitted. The built FE income drawer displays amounts — it will need either this module extended (post-C2) or FE changes. | FE income detail fidelity | BE lead + FE | after C2 |
| Q3. **Three-way doc conflict on TeacherPayRate read**: this file's RBAC reading (no read row → forbidden, same as module 05 §5) vs `PERMISSIONS_TEACHER.md` § Income which **grants** "Read their own TeacherPayRate". Recorded, not resolved — this module reads no rate either way. | teacher rate visibility | PO | RBAC review |
| Q4. **C1**: `className` is safe (Class-owned); if a teacher display name is ever added, nickname vs fullName applies. | — | BE lead | if DTO grows |
