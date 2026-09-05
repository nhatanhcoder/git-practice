---
module: Dashboard / Reporting
status: accepted
blocked_by: —
owner: -
last_updated: 2026-09-05
---

## 0. Summary

The module is **only a projection**: it aggregates figures from tables owned by other modules and
returns them as KPI tiles. It **owns no table**, has no migration of its own, writes no row to
the DB, emits no notifications, has no state machine. Every number here is a **function** of
other people's data; the business definition of each figure ("what counts as unpaid", "which
statuses belong to this month's payroll period") belongs to the module that owns that table,
**not** to this module. The direct consequence — and the reason this module is `deferred` — is:
every time a source module changes how it defines its states, every tile here and every test here
must be rewritten.

The second boundary: `GET /admin/monitoring/gemini` sits in this module because it is a
read-only, reporting-style screen, but it reads AI usage data for which **no table is currently
defined** — see §1 and §16.

## 1. Tables touched

**Reads everything, writes nothing.** No table below is owned by this module.

| Table | Read/Write | Owner | Used by tile |
|---|---|---|---|
| `User` | Read | Users module (spec 02) | Count by `role` × `status`: pending review, active teachers, active students, locked accounts |
| `ClassSession` | Read | Sessions module (spec 04) | Count `status='completed_pending'` (session review queue) |
| `PayrollPeriod` | Read | Payroll module (spec 05) | Current-period payroll total; number of `draft`/`finalized` periods unpaid |
| `StudentInvoice` | Read | Billing module | Count/sum by `status`; outstanding debt |
| `TuitionPayment` | Read | Billing module | Revenue collected per month (`paidAt`) |
| `Class`, `ClassEnrollment` | Read *(if any class/size tile)* | Classes module | Whether any tile exists is not locked — §3 |
| *AI usage* | Read | ⛔ **no table** | `GET /admin/monitoring/gemini`. `ENTITY_AI_USAGE_LOG.md` exists but is **0 bytes empty** — not a single field defined. You cannot write a query for an undefined table |
| `Notification` | **Not touched** | Notifications module (spec 07) | Dashboard doesn't read notifications; the bell is a separate channel |

Since the module never writes, it **needs** no DB write permission. If the infrastructure allows,
use a read-only connection/role for this module's queries — turning INV-DASH-03 from a
convention into a technical constraint.

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/api/v1/admin/dashboard/stats` | admin | "User stats, financial summary" | **defined (path only)** — API_ADMIN.md § Dashboard. ⚠️ **Payload is not defined anywhere**; `pages/_INDEX.md` records route `/admin` as *blocked on: stats payload shape* |
| GET | `/api/v1/admin/monitoring/gemini` | admin | Gemini quota/usage for the `/admin/monitoring` screen | ⛔ **PROPOSED, blocked** — API_ADMIN.md § "Referenced by FE contracts, not yet defined", *Blocked on* column: "Gemini key model undecided". `pages/_INDEX.md` marks this screen *blocked on* **"all of it"** and **T-GRADE-3** |

There is no (and no v1 proposal for): a time-series chart endpoint, a report-export endpoint, a
teacher/student dashboard endpoint. `root-design-fe.md` §8 mentions a "Teacher Dashboard" but its
design doc does not exist yet.

**One important detail of `/admin/dashboard/stats`**: `pages/_INDEX.md` describes "KPI tiles
double as the work queue" — the KPI tiles are **simultaneously the admin's work queue** (clicking
the "5 accounts pending review" tile jumps straight to the filtered list). This is exactly why
INV-DASH-01 in §4 is the module's most important invariant: if the number on a tile doesn't match
the screen it leads to, the admin clicks the tile, sees a different list, and loses trust in the
entire financial picture.

## 3. DTO

### Request

`GET /admin/dashboard/stats` — **no parameters for v1**. No `?from=`/`?to=`/`?period=` is
defined; adding parameters means adding a contract to maintain. Tiles meaning "this month" take
their month boundary from the **server** (§4 INV-DASH-10), never from the client.

`GET /admin/monitoring/gemini` — cannot be determined: the unit of measure (per key? per teacher?)
depends on Decision 4. No DTO is written here.

### Response

⚠️ **This entire section is *proposed*.** API_ADMIN.md only writes "User stats, financial
summary". The table below is **candidate tiles with the exact source expression**, so that what
remains to be decided is *which tiles*, not *what a tile means*.

`{ "data": DashboardStats }` — no `meta` (no pagination).

| Proposed field | Type | Source expression (single source of truth) | Detail screen must match (INV-DASH-01) | Notes |
|---|---|---|---|---|
| `pendingUsers` | int | `COUNT(User WHERE status='pending')` | `GET /admin/users?status=pending` → `meta.total` | Is a work queue |
| `activeTeachers` | int | `COUNT(User WHERE role='teacher' AND status='active')` | `GET /admin/users?role=teacher&status=active` | |
| `activeStudents` | int | `COUNT(User WHERE role='student' AND status='active')` | `GET /admin/users?role=student&status=active` | |
| `suspendedUsers` | int | `COUNT(User WHERE status='suspended')` | `GET /admin/users?status=suspended` | |
| `sessionsPendingReview` | int | `COUNT(ClassSession WHERE status='completed_pending')` | `GET /admin/sessions/pending` → `meta.total` | Work queue |
| `unpaidInvoices` | int | ⚠️ **`COUNT(StudentInvoice WHERE status='unpaid')` or `WHERE status IN ('unpaid','partially_paid')`?** | `GET /admin/invoices?status=unpaid` | **Not locked and this is risk #1 for INV-DASH-01** — see §16 |
| `outstandingAmount` | Decimal(12,2) | `SUM(totalAmount − paidAmount) WHERE status IN ('unpaid','partially_paid')` — **`void` excluded** | Outstanding-column total on `/admin/invoices` with the same filter | Never subtract on `void` invoices |
| `revenueThisMonth` | Decimal(12,2) | ⚠️ `SUM(TuitionPayment.amount WHERE paidAt ∈ [month start, next month start))` **or** per invoice period? Two different numbers | Payment list filtered by month | Not locked — §16 |
| `payrollThisMonth` | Decimal(12,2) | ⚠️ `SUM(PayrollPeriod.totalAmount WHERE <period delivered this month> AND status IN (?))` — includes `draft`? | `GET /admin/payroll` with the same filter | ENTITY_PAYROLL_PERIOD: "Fills 'monthly payroll' slot in Admin Dashboard **after Sprint 7**". The payroll period boundary is Decision 3, not locked |
| `generatedAt` | DateTime UTC ISO 8601 | computation time | — | **Mandatory if caching is on** (INV-DASH-09); recommended even without cache so FE can show "figures as of HH:mm" |

Not included in the response: record lists, user names/emails, any personal data (INV-DASH-11).
The dashboard returns **numbers**, not **rows**; to see rows, click through to the detail screen.

`GET /admin/monitoring/gemini` — **no DTO defined**. No source table (§1), no locked unit of
measure (§16). A DTO written now would certainly be thrown away.

## 4. Business rules (invariants)

| ID | Statement |
|---|---|
| **INV-DASH-01** | **Each dashboard number equals the corresponding detail screen's number under the same filter at the same instant.** Dashboard says 5 unpaid invoices ⇒ `GET /admin/invoices` filtered "unpaid" returns `meta.total = 5`, not 4, not 6. Applies to **every** tile in §3, not any single one. |
| **INV-DASH-02** | Each number derives from **exactly one** registered expression in §3, sharing a single definition with the detail screen; no number is computed by two code paths in two places. (Two copies of one expression is how INV-DASH-01 gets broken silently.) |
| **INV-DASH-03** | The module **never writes**: no INSERT/UPDATE/DELETE on any table, no Notification, no status change. Calling the endpoint any number of times never changes system state. |
| **INV-DASH-04** | All tiles in **one** response are read from **the same data snapshot**; no response exists where tile A reflects t₁ and tile B reflects t₂ (e.g. "5 unpaid invoices" while `outstandingAmount` already subtracted the payment just recorded). |
| **INV-DASH-05** | A `status='void'` invoice is **never** counted in any count or money tile. |
| **INV-DASH-06** | All money sums are computed at the DB layer on the Decimal type, never summed as float at the application layer; returned values keep the exact 2-decimal scale. |
| **INV-DASH-07** | An empty set yields `0`, not `null` and not an error: no invoices in the system ⇒ `unpaidInvoices = 0` and `outstandingAmount = "0.00"`. |
| **INV-DASH-08** | Only an actor with `role='admin'` **and** `status='active'` can call; teacher/student are refused before any aggregate query runs. |
| **INV-DASH-09** | If caching is on: **the whole response** is cached as one block, never individual tiles; all tiles in one response come from the same computation; the response carries `generatedAt` as the real computation time (not delivery time). |
| **INV-DASH-10** | Time boundaries are **half-open** `[period start, next period start)` and use **the same timezone, the same definition** as the detail screen; no record is counted twice or dropped at a month boundary. |
| **INV-DASH-11** | The response contains only aggregate figures: no lists, no emails, no names, no `passwordHash`, no ids of specific records. |
| **INV-DASH-12** | Every status-count tile uses only **real** values of the corresponding enum; no tile counts a nonexistent state (e.g. `User.status='rejected'` — C3) and no tile silently misses an enum value when the enum is extended. |
| **INV-DASH-13** | `GET /admin/monitoring/gemini` never returns a Gemini API key, a key fragment, or anything that could recreate the key; usage figures only. |
| **INV-DASH-14** | `0` must be distinguishable from "no data yet / not implemented": a tile whose data source does not exist yet (AI usage) must **not** return `0` as if it had been measured at zero. |

## 5. Ownership / RBAC

`RBAC_MATRIX.md` **has no row for the "Dashboard" resource** — this module's permission is not
directly defined anywhere (§16). Inferred indirectly: the dashboard exposes aggregates of `User`
(list all = ✅ Admin only), `StudentInvoice`, `TuitionPayment`, `PayrollPeriod` (all ✅ Admin only)
⇒ **admin only**. API_ADMIN.md also states at the top: every route under `/admin` requires
`role=admin`.

No ownership rule (admin sees the whole system; there is no "mine").

| Layer | Condition | On failure |
|---|---|---|
| Guard | `req.user.role === 'admin'` | `403 AUTH_INSUFFICIENT_ROLE` |
| Service (mandatory, non-negotiable) | `actor.status === 'active'` — a locked admin with a valid token must still be blocked | `403 AUTH_ACCOUNT_SUSPENDED` |
| Service | — no row-level permission check: every query is a whole-system aggregate | — |

**Why refuse before querying**: the aggregate queries here are the heaviest in the system (§11).
Running them first then checking permissions both leaks response time and lets unauthorized users
burn DB resources.

## 6. State machine

**The module owns no state** — no table, so no lifecycle to draw. But it **reads the states of
four other state machines**, and that is what needs drawing, because every arrow below is an
event that makes dashboard numbers jump:

```
   User.status                 ClassSession.status                PayrollPeriod.status
   pending ─► active           scheduled ─► in_progress           draft ─► finalized ─► paid
        │        │                   ─► completed_pending             │         │        │
        │        ▼                        ─► approved / rejected      │         │        │
        └──► suspended ◄─► active              │                      │         │        │
             │    │                            │                      │         │        │
             ▼    ▼                            ▼                      ▼         ▼        ▼
        pendingUsers                  sessionsPendingReview        payrollThisMonth (which statuses? not locked)
        activeTeachers/Students

   StudentInvoice.status                          TuitionPayment
   unpaid ─► partially_paid ─► paid                (INSERT, no state)
        └──────────► void                                │
             │              │                            ▼
             ▼              ▼                     revenueThisMonth
        unpaidInvoices   outstandingAmount  (void excluded — INV-DASH-05)
```

Read this diagram by dependency direction: **the Dashboard module has no right to redefine any
arrow above.** If the Users module adds `rejected` (C3), if Billing changes the `partially_paid`
threshold, if Payroll changes its period boundary — the tiles below change meaning without a
single line of this module being edited. That is exactly why §16 concludes the module must be
built last.

The only lifecycle owned by this module is the **lifecycle of its endpoints**, and both are in
the left half:

```
   proposed ──► defined (path) ──► defined (payload) ──► implemented
      │                 │
      │                 └── GET /admin/dashboard/stats  ← currently here (path exists, payload not)
      └── GET /admin/monitoring/gemini                  ← currently here (only recorded as missing)
```

## 7. Transaction boundary

No writes ⇒ no write transaction. But a **read transaction is still needed**, for the reason in
INV-DASH-04.

- All aggregate statements of **one** request run inside **one** read-only transaction at
  `REPEATABLE READ` — so every tile sees the same snapshot. If each statement ran independently
  at `READ COMMITTED`, a payment recorded between two statements would yield a self-contradictory
  response (count still 5 unpaid invoices but the outstanding sum already dropped the amount just
  collected) — the reader would conclude the dashboard is wrong, and they'd be right.
- The equivalent cheaper way: collapse everything into **one single SQL statement** using
  multiple subqueries/CTEs — a single statement always runs on one consistent snapshot with no
  explicit transaction. This is the recommended way (§11).
- No locking (`FOR UPDATE`, `FOR SHARE` are forbidden in this module) — the dashboard must not
  slow down running business operations.
- Set a dedicated `statement_timeout` for the module's queries (proposed 2 seconds, §11): a stuck
  aggregate must not drag the whole admin page down.
- If a materialized view is adopted later: refresh runs in its own transaction, using
  `REFRESH ... CONCURRENTLY` so readers are never locked.

## 8. Idempotency & concurrency

`GET` is safe and idempotent by definition: calling again doesn't change state (INV-DASH-03), it
can only return different numbers because the data changed.

**The module's only concurrency problem is cache stampede.** If caching is on (§11) and several
admins open the dashboard just as the cache expires, they all rush to recompute the heaviest
queries in the system. Handling: **single-flight** (only one process computes; the other requests
wait and share the result) + jittered TTL by a few seconds so keys don't expire together.

**Numbers changing between viewing the dashboard and clicking into the detail screen** — this is
not an INV-DASH-01 violation. The invariant says "at the same instant"; a few seconds between two
requests, another admin may have approved an account. Correct handling: show `generatedAt` so the
user knows when the numbers were computed, and **don't** try to freeze the numbers. Wrong
handling: long caching to make "both screens match" — it turns a temporary drift into a permanent
one.

**No Idempotency-Key, no ETag/If-None-Match** (not defined by API_CONVENTIONS.md). If dashboard
polling load needs reducing later, ETag is the right direction, but it must be locked at the
conventions layer for the whole system.

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| No token / broken token | 401 | `AUTH_TOKEN_INVALID` | in API_ERROR_CODES.md (⚠️ not in `_FACTS.md` — spec 01 §16) |
| Access token expired | 401 | `AUTH_TOKEN_EXPIRED` | exists |
| Teacher/student token | 403 | `AUTH_INSUFFICIENT_ROLE` | exists |
| Admin currently `suspended` | 403 | `AUTH_ACCOUNT_SUSPENDED` | exists |
| Bad parameters (if any are added later) | 400 | `VALIDATION_ERROR` | exists |
| Aggregate query exceeds `statement_timeout` | 500 | ⚠️ **no code** | No timeout/overload code in the registry. Don't invent → §16 |
| `GET /admin/monitoring/gemini` — every branch | — | ⛔ `AI_QUOTA_EXCEEDED` (429), `AI_KEY_INVALID` (401), `AI_GRADING_FAILED` (502) are all **proposed, not agreed** (API_ERROR_CODES.md states clearly: blocked on Gemini key model, UC-A-005) | **No code usable yet** |

There is no `DASHBOARD_*` group in the registry — and in this module that is **not a gap**: the
dashboard has no business-error branch of its own (no "not found", no "wrong status"), only the
shared authentication/authorization errors. The single exception is the overload branch above.

## 10. Side effects & notifications

**None.** The module emits no `Notification` (no type in ENTITY_NOTIFICATION.md relates to
reporting), sends no mail, calls no webhook, writes no audit, touches no table.

One **technical** side effect if caching is on: writing to the cache store. Not an exception to
INV-DASH-03 (no business state changes) but worth remembering when debugging "why didn't the
number change after I approved".

The other direction is more significant: **this module is where other modules' consequences
surface**. The `sessionsPendingReview` tile *is* the Sessions module's queue; the `pendingUsers`
tile is the Users module's queue. If a module writes a wrong status, the first symptom a user
sees will be "the dashboard number is wrong" — and the investigation will start in the wrong
place, here, instead of the module that caused the error. §14 therefore requires a periodic
reconciliation job, to distinguish "dashboard computes wrong" from "source data is wrong".

## 11. Index & query

This module is the **most N+1-prone and has the slowest queries** in the system, because a single
request touches 5–6 tables and always scans the whole dataset rather than filtering by one user.

### 11.1 Four mandatory rules

1. **Never fetch a list and count in the application layer.** `findMany().length` on
   `StudentInvoice` drags the whole invoice table over the network to get an integer. Use
   `COUNT`/`SUM` in the DB.
2. **Collapse every tile on the same table into ONE statement.** Four invoice-count tiles by
   status ⇒ **one** `SELECT status, COUNT(*), SUM(...) FROM "StudentInvoice" GROUP BY status`,
   not four separate `COUNT` statements. Same for `User`: **one** `GROUP BY role, status`
   statement serves all four user tiles. Four tiles → one scan.
3. **Collapse multiple tables into one round trip** with a single statement containing multiple
   scalar subqueries (or CTEs). Double benefit: reduces 6 round trips to 1, **and** guarantees
   INV-DASH-04 without an explicit transaction (§7).
4. **No per-record loops.** The classic N+1 pattern in this module: fetch teacher list then loop
   per teacher to sum this period's pay (1 + N statements, N grows with teacher count); or fetch
   invoice list then loop per invoice to sum `TuitionPayment`. Replace with **one**
   `GROUP BY teacherId` / `GROUP BY invoiceId` statement. ORM relation `include` is forbidden in
   this module — the dashboard only needs numbers, not objects.

### 11.2 Indexes needed per tile

```
User:           INDEX (role, status)                                   -- one GROUP BY role,status serves 4 tiles
ClassSession:   INDEX (status)  or  partial:
                CREATE INDEX ... ON "ClassSession"(id) WHERE status='completed_pending'
                                                                       -- the review set is always small vs. total
                                                                       -- sessions (spec 04 §11 already requires this
                                                                       -- index — reuse it, do NOT duplicate)
StudentInvoice: INDEX (status)                                         -- GROUP BY status
StudentInvoice: partial INDEX WHERE status IN ('unpaid','partially_paid')
                                                                       -- SUM(totalAmount - paidAmount): only scan
                                                                         outstanding, skip all paid invoices
                                                                         (the bulk of the table over time)
StudentInvoice: INDEX ("dueDate")                                      -- only if an "overdue" tile exists
TuitionPayment: INDEX ("paidAt")                                       -- monthly revenue; consider BRIN when the
                                                                          table is large and written in time order
                                                                          (BRIN is many times smaller than B-tree)
PayrollPeriod:  INDEX (status)                                         -- already in spec 05 §11 — reuse
PayrollPeriod:  INDEX ("periodStart", "periodEnd")                     -- filter periods intersecting current month
```

**Indexes belong to the owning module's migration, not this module's** (§12) — if every module
creates indexes for its own needs, near-duplicate indexes multiply, cost writes, and confuse
optimization.

### 11.3 Materialized view: not now, and the trigger to reconsider

**Recommendation: no materialized view in v1.** At current scale (hundreds of users, thousands
of invoices/sessions), the indexed `GROUP BY` statements above run in a few milliseconds; an MV
only adds a stale-data layer and **directly threatens INV-DASH-01** (dashboard reads MV, detail
screens read the base table ⇒ two sources ⇒ drift exactly by the refresh lag — the very class of
error invariant #1 exists to block).

MV trigger — when **both** are true: (a) one aggregate query exceeds **300–500ms** measured in
production, and (b) the source table exceeds **1 million rows** (earliest candidates are
`TuitionPayment` and `ClassSession`, since both only grow and never shrink). Then:
`REFRESH MATERIALIZED VIEW CONCURRENTLY` on a schedule, **mandatorily** returning `generatedAt`,
and INV-DASH-01 must be restated as "within refresh lag" — i.e. a public, spec-recorded
downgrade of the standard, not a silent one.

### 11.4 Cache: not now, and how to turn it on

**Recommendation: no cache in v1** — for two reasons: the tiles are **work queues** (an admin
approves an account, comes back, sees the old number, thinks the action failed, clicks again),
and the money tiles are financial figures (stale numbers here drive wrong decisions).

Condition to enable: endpoint p95 exceeds **500ms** measured in production. When enabled, all 5
requirements are mandatory:

| # | Requirement | Why |
|---|---|---|
| 1 | **TTL 30–60 seconds**, no more | 60s is a cadence already in the system (notification polling, DEBT-002) so users are used to that lag; longer makes work queues untrustworthy |
| 2 | Cache **the whole response**, never individual tiles | INV-DASH-09 — mixing new and old tiles yields a self-contradictory response, worse than uniformly stale numbers |
| 3 | Return `generatedAt` | Users must distinguish "correct now" from "as of HH:mm" |
| 4 | **Single-flight** + jittered TTL | Anti-stampede (§8) |
| 5 | **Action-based invalidation** for work-queue tiles | After `approve`/`suspend`/`approve session`/`record payment`, drop the cache immediately — otherwise the very users who just acted are the ones seeing wrong numbers. (If #5 can't be done, TTL must drop to 10–15 seconds for the work-queue tiles.) |

Both the TTL and the invalidation mechanism are **not locked by any document** → §16.

### 11.5 Protection

`statement_timeout` of 2 seconds for the module's queries (§7) and a light per-user rate limit
on the endpoint (the dashboard typically auto-refreshes periodically on the FE). A single admin
keeping a dashboard tab open with a 10-second auto-refresh is enough to keep the DB CPU high if
queries aren't optimized.

## 12. Migration & seed

**This module owns no migration** — 0 tables, 0 columns, 0 enums. That is a direct consequence
of §0 and a good property: the dashboard could be fully rewritten without a single migration.

It only **places index requirements** on other modules' migrations (§11.2). The rule: indexes
serving dashboard tiles go into the owning module's migration, annotated "serves
`GET /admin/dashboard/stats`", so someone cleaning up indexes later doesn't delete them by
mistake.

**Seed — the module's most important part.** A **golden dataset** with known numbers per tile is
needed, shared by both dashboard tests and detail-screen tests (this is the condition that makes
INV-DASH-01 tests meaningful). The dataset must contain all **edge samples**, because every
number-drift bug hides here:

| Edge sample | What it checks |
|---|---|
| 1 `void` invoice with a large `totalAmount` | INV-DASH-05 — if counted, the outstanding sum is visibly wrong |
| 1 `partially_paid` invoice | The "unpaid" definition boundary (§16) — this tile immediately exposes the unsettled decision |
| 1 `paid` invoice with `paidAmount` exactly `totalAmount` | The `paidAmount >= totalAmount` threshold |
| 1 payment with `paidAt` **last day of previous month** and 1 **first day of this month** | INV-DASH-10 — the half-open boundary; where timezone drift shows up |
| 1 user per status × per role (including `suspended`) | INV-DASH-12 |
| 1 session in **each** of the 5 statuses | The work-queue tile must not miscount `approved`/`rejected` |
| 1 payroll period in each `draft`/`finalized`/`paid` | The payroll tile — which statuses count (§16) |
| 1 teacher with **no** sessions, 1 student with **no** invoices | INV-DASH-07 — `SUM` over an empty set must be 0, not null |
| **Completely empty** system (second seed set) | Every tile = 0, no error, no null |

## 13. Security & rate limit

| Topic | Rule |
|---|---|
| Scope | Admin `active` only (§5). This endpoint exposes **the whole financial picture of the system** in one request — revenue, debt, payroll spend. A leak here equals leaking the entire invoice table |
| Data never returned | Record lists, emails, names, personal ids (INV-DASH-11). If FE needs "the 5 most recent overdue invoices", that's a paginated list endpoint, not stuffing the dashboard |
| Gemini key | INV-DASH-13 — no key, no last-4-chars, no length. If the key model is "one key per teacher" (Decision 4), the monitoring screen also exposes *who is using how much* — i.e. individual performance data; who may see it must be locked |
| Rate limit | Per-user limit proposed for this heavy endpoint (§11.5). ⚠️ No 429 error code yet (spec 01 §16) |
| Logs | Don't dump the full financial payload into shared logs; when logging slow queries, log the **execution plan**, not the result |
| Early refusal | Permission check **before** running queries (§5) — security and resource-abuse prevention at once |

## 14. Observability

**Measure per tile, not just per endpoint**: name a metric per aggregate statement
(`dashboard.query.users`, `.invoices`, `.payments`, `.payroll`, `.sessions`) and measure p95/p99
separately. Reason: when the endpoint slows down after a few months, the cause is almost
certainly **one** tile (usually the `TuitionPayment` monthly sum, since that table only grows);
aggregate endpoint measurement only says "slow", not where.

- Endpoint-wide p95/p99; **alert over 2 seconds** (hitting `statement_timeout`).
- Log queries over 500ms **with the execution plan** — this is the materialized-view threshold
  in §11.3; the decision needs real numbers, not gut feeling.
- If caching is on: hit/miss ratio, stampedes blocked by single-flight, average age of data
  served (`now − generatedAt`).
- **Periodic reconciliation job checking INV-DASH-01 in production**: run the dashboard and the
  detail-screen queries in one transaction then compare each pair; drift ⇒ alert. This is the
  only invariant in the system **worth continuously monitoring in production**, because it breaks
  silently when a source module changes its state definition without anyone updating the
  dashboard (§10) — no test catches that at compile time.
- Count endpoint calls per admin — catches forgotten auto-refresh tabs.
- Source table sizes over time: input for the MV/partition decision in §11.3.

## 15. Test matrix

This is the **invariant gate**: every INV in §4 must have at least one row here. A missing row =
no merge.

| INV | Test type | Description |
|---|---|---|
| INV-DASH-01 | real DB (reconciliation test) | With the golden dataset (§12): call `/admin/dashboard/stats` **and** each matching detail endpoint (`/admin/users?status=pending`, `?role=teacher&status=active`, `/admin/sessions/pending`, `/admin/invoices?status=...`, `/admin/payroll`) → assert **each pair** is equal. Repeat **after each write operation**: approve 1 user → both move together; record 1 payment → the count and money tiles change in sync with the invoice screen; void 1 invoice → both drop it |
| INV-DASH-02 | service | Assert dashboard and detail screens use **one shared** filter-building function/condition block (verified by a test calling the same builder), no two copies of an expression. Regression test: change the definition in one place → **both** sides follow |
| INV-DASH-03 | real DB | Snapshot checksums/row counts of **every** table before and after 100 calls to both endpoints → assert unchanged. Run the endpoint with a read-only connection → still succeeds (proves no write path) |
| INV-DASH-04 | real DB (concurrency) | While a dashboard request is running, another transaction records a payment and commits → assert the response is **internally consistent** (count and money tiles both reflect the before state, or both the after; never mixed). Repeat to catch races |
| INV-DASH-05 | real DB | Seed 1 large `void` invoice → assert `unpaidInvoices` and `outstandingAmount` **don't** change vs. without it. Void a currently-counted `unpaid` invoice → both the count and money tiles drop by exactly its contribution |
| INV-DASH-06 | real DB | Seed values with decimal parts prone to float error (e.g. many `0.10`, `1_500_000.55` entries) → assert the sum matches **exactly** a Decimal-computed sum; assert the response keeps exactly 2 decimals with no scientific notation |
| INV-DASH-07 | integration | Run on an empty DB (second seed set) → every count tile `= 0`, every money tile `= "0.00"`, no field `null`, HTTP 200 (not 404, not 500) |
| INV-DASH-08 | integration | Teacher token → 403 `AUTH_INSUFFICIENT_ROLE`; student token → 403; no token → 401; `suspended` admin with valid token → 403 `AUTH_ACCOUNT_SUSPENDED`. Assert **no** aggregate query runs in these branches (spy/count queries) |
| INV-DASH-09 | integration | Run only with caching on: call twice within TTL → the two responses are **identical including `generatedAt`**; after TTL → new `generatedAt`. Assert no mixed old/new-tile response exists (write data between two calls, check internal consistency) |
| INV-DASH-10 | real DB | Seed payments exactly at the boundary: `23:59:59` last day of previous month, `00:00:00` first day of this month, `00:00:00` first day of next month → assert each record is counted **exactly once** in exactly one month — no double, no loss. Repeat with data around a VN-timezone day rollover to expose the unsettled timezone decision (§16) |
| INV-DASH-11 | integration | Serialize the response → assert no `passwordHash`, no `@` (email), no record arrays; every field is a number, numeric string, or timestamp |
| INV-DASH-12 | real DB | Assert the status-count tiles of one table sum **equal** to the table's total `COUNT(*)` (no enum value missed). Regression: add a new enum value to `User.status` (e.g. `rejected` — C3) → the test **must fail**, forcing the enum-changer to update the dashboard |
| INV-DASH-13 | integration | (Once the monitoring endpoint is unlocked) Serialize the response → assert no Gemini key, no key prefix/suffix; assert the key doesn't appear in that request's logs |
| INV-DASH-14 | integration | A tile whose source doesn't exist yet (AI usage) must **not** return `0`: either absent from the payload or carrying a locked "no data" marker. Assert no tile returns `0` while its source table doesn't exist |

Beyond the invariant gate: test **query count** for one dashboard request stays under a threshold
(e.g. ≤ 3) — the only way to catch N+1 returning after a refactor; test the error envelope has
the flat shape of API_CONVENTIONS.md.

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| **⛔ BUILD ORDER — this module must be done LAST.** Every tile is a function of tables owned by other modules (§1, §6). Building early means rewriting, not "possibly" but certainly: Billing hasn't locked the tuition model (Decision 1, `INVOICE_*` still *proposed*), Payroll hasn't locked the period boundary (Decision 3) or the pay unit (Decision 2), Users may add `rejected` (C3), rates still conflict on append-only (C2). Each of those decisions changes the **meaning** of at least one tile, and rewrites **all** the reconciliation tests in §15 | Blocks coding the module. Proposed milestone: **after Sprint 7** — ENTITY_PAYROLL_PERIOD.md states outright "Fills 'monthly payroll' slot in Admin Dashboard **after Sprint 7**". What should be done early instead of coding: lock the **tile list** and **source expressions** (§3), because that's what the other modules need to place indexes and keep INV-DASH-02 | - | before Sprint 7 |
| **⛔ GEMINI MONITORING IS DOUBLE-BLOCKED (actually three layers).** (1) **Key model not locked** — Decision 4 (`pages/_INDEX.md`), UC-A-005: shared key or one key per teacher. This decision defines the **unit of measure** (per key or per person) ⇒ defines the schema and every tile of the screen. (2) **No real AI usage data** — Gemini is only called when teachers grade writing essays (AI Suggest, Sprint 4, T-GRADE-3); before that the screen has nothing to show, and without real data no tile can be verified. (3) **`ENTITY_AI_USAGE_LOG.md` is an EMPTY file (0 bytes)** — the source table has not a single field defined | Blocks the whole `/admin/monitoring` screen (`pages/_INDEX.md` says *blocked on: **all of it***). Blocks the §3 DTO, every index, the `AI_*` error codes (currently *proposed, not agreed*). **No code, no DTO before** — everything written now will be thrown away | - | after Sprint 4 (data exists) **and** after Decision 4 |
| **Which tiles make up the `GET /admin/dashboard/stats` payload?** API_ADMIN.md only says "User stats, financial summary"; `pages/_INDEX.md` marks route `/admin` *blocked on: stats payload shape* | Blocks §3 (entirely), the FE contract, the §11.2 index list (without knowing the tiles, you don't know which indexes are needed) | - | before coding |
| **Is "unpaid invoice" `unpaid`, or `unpaid` + `partially_paid`?** | **Risk #1 for INV-DASH-01**: if the dashboard picks one way and `/admin/invoices` picks another, the two screens drift forever and neither side calls it their bug. Blocks both the count and the money tile | - | before coding, at the same time as the invoices screen |
| **Revenue by `TuitionPayment.paidAt` or by invoice period?** Two different numbers, both defensible: one is cash collected, one is recognized revenue | Blocks `revenueThisMonth`; blocks the meaning of every "vs. last month" comparison FE wants to display (`root-design-fe.md` §4.1 has trend arrows) | - | before coding |
| **Which statuses does "this month" payroll include — `draft`, `finalized`, `paid`?** And is the period boundary a calendar month (Decision 3 not locked)? | Blocks `payrollThisMonth`. Including `draft` = expected money; only `paid` = money spent — two wildly different numbers for two different purposes | - | before Sprint 7 |
| **Month-boundary timezone: UTC or Vietnam time (UTC+7)?** API_CONVENTIONS.md says every DateTime is UTC and **the FE is responsible for converting to local time** — but here the grouping happens on the **server** | Blocks INV-DASH-10 and its test. A 7-hour shift makes transactions from 00:00–07:00 on the 1st fall into the previous month — enough to skew month-end revenue reports and make the dashboard disagree with user perception | - | before coding month-based tiles |
| **Caching: on or off, what TTL, what action-based invalidation?** (§11.4 proposes: no cache in v1; if enabled, 30–60s + single-flight + `generatedAt` + invalidate after write actions) | Blocks INV-DASH-09 and its test row. Wrong choice makes work queues show stale numbers right after an admin acted | - | before optimization (doesn't block v1) |
| **Where does `generatedAt` go in the envelope?** API_CONVENTIONS.md only has `data` and `meta`, and `meta` is reserved for pagination | Blocks the response shape; a conventions-level decision, not a module-level one — putting it in `meta` arbitrarily sets precedent for the whole system | - | before coding |
| **`RBAC_MATRIX.md` has no "Dashboard" row.** Permission is currently inferred indirectly from the source tables (§5) | Blocks the completeness of the permission matrix — an endpoint exposing the entire financial picture without a row in the official permission doc | - | before go-live |
| **No error code for the overload/timeout branch** (§9) | Blocks behavior when a query exceeds `statement_timeout`; currently only a generic 500 can be returned | - | before go-live |
| **Which tiles are "work queue" and do they need fresher data than others?** `pages/_INDEX.md`: "KPI tiles double as the work queue" | Blocks the cache design (§11.4 item 5) and grouped-TTL decisions | - | together with the cache decision |
| **C4 (DOC-004) — HSK 1–9 or 1–6.** Only matters if the dashboard has a distribution tile by `hskLevelGoal`/`hskLevel` | Blocks that tile's group count (9 groups or 6); blocks nothing if no HSK tile exists | - | only when an HSK tile is locked |
| **C3 — if `User.status` gains `rejected`**, the `pendingUsers` tile changes meaning (rejected profiles currently stuck in `pending` are **being counted** into the review queue) | Blocks INV-DASH-12 and the accuracy of the admin's most important queue tile: today this number is **inflated** by rejected profiles with no way to mark them | - | together with the account-lifecycle ADR |

*(C1 doesn't touch this module — the dashboard returns no user names. C2 touches indirectly: if
rates aren't truly append-only, the "currently applied rate" lookup changes, changing every money
tile derived from rates.)*
