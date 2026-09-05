# SPEC 06 — Billing (StudentTuitionRate · StudentInvoice · TuitionPayment)

---
module: billing
status: accepted
blocked_by: —
owner: -
last_updated: 2026-09-05
---

## 0. Summary

The module is responsible for the entire **student revenue** flow: setting tuition rates
(`StudentTuitionRate`, append-only), issuing invoices (`StudentInvoice`), recording payments
(`TuitionPayment`). The three tables share one module because they share **one transaction
boundary**: recording a payment both INSERTs a child row and UPDATEs the parent's total and
status, and an invoice's amount is decided by the rate table at issuance time — splitting into
three modules would split one transaction into three, i.e. accepting money errors.

The boundary **starts** at `StudentTuitionRate` (admin sets a rate) and **ends** at
`StudentInvoice.status ∈ {paid, void}`. This module does NOT touch teacher pay (`TeacherPayRate`,
`PayrollPeriod` — spec 05), does NOT approve sessions, does NOT create/edit `User`, and does NOT
call any payment gateway (VietQR is only a **reconciliation string** stored in
`transactionReference`, not an API integration).

⚠ This module is the system's **highest financial-risk module**: it is the only place with an
aggregated field (`paidAmount`) that must always match a child-record set, and the only place
where two admins can write the same money row concurrently.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `StudentTuitionRate` | Read + INSERT | **INSERT only.** No UPDATE, no DELETE (ADR-008) — ⚠ C2 |
| `StudentInvoice` | Read + INSERT + **limited** UPDATE | UPDATE may only touch 3 fields: `paidAmount`, `status`, `updatedAt`. No endpoint changes `totalAmount`, `periodStart`, `periodEnd`, `studentId`, `dueDate` after creation (INV-BILLING-21) |
| `TuitionPayment` | Read + INSERT | **INSERT only.** Absolutely immutable (INV-BILLING-23) |
| `User` | Read | Checks `role = 'student'` for `studentId`; `role = 'admin'` + `status = 'active'` for `recordedBy`; display name. ⚠ C1 |
| `Notification` | INSERT | Type `new_invoice` sent to the student on invoice creation. **Only one type** — no type for payments, no type for void (§10) |
| `ClassEnrollment` | — | **Not touched** in the current `monthly` model. Must be touched if Q-BILL-2 resolves per-class |
| `PayrollPeriod` / `TeacherPayRate` | — | Not touched. Money in and money out are two independent modules with no cross-constraint |
| *(audit table)* | INSERT | No ENTITY doc yet — Q-BILL-11. Payments and voids are financial vouchers; audit is mandatory |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/api/v1/admin/tuition-rates` | admin | Create a new tuition rate for a student (append) | **defined** (API_ADMIN.md) |
| GET | `/api/v1/admin/tuition-rates` | admin | List current rates + history | **PROPOSED** — "shape is proposed, not agreed"; blocked on "tuition model undecided" |
| POST | `/api/v1/admin/invoices` | admin | Create one invoice | **defined** |
| GET | `/api/v1/admin/invoices` | admin | List invoices, paginated, filtered | **defined** |
| GET | `/api/v1/admin/invoices/:id` | admin | Invoice detail + embedded `payments[]` | **defined** |
| PATCH | `/api/v1/admin/invoices/:id/void` | admin | Void an invoice — one-way gate | **defined** |
| POST | `/api/v1/admin/invoices/:id/payments` | admin | Record one payment | **defined** |
| GET | `/api/v1/admin/invoices/summary` | admin | Aggregates for the `/admin/invoices` screen header | **PROPOSED** — blocked on: — (no technical blocker, just unsigned) |
| POST | `/api/v1/admin/invoices/batch` | admin | Bulk-generate invoices for one period | **PROPOSED** — blocked on "partial-failure semantics" (Q-BILL-3) |
| POST | `/api/v1/admin/invoices/batch/preview` | admin | Dry run, writes nothing | **PROPOSED** — blocked on: — |

**Doesn't exist and must not be added**: `PATCH /admin/tuition-rates/:id`,
`DELETE /admin/tuition-rates/:id` (ADR-008 + API_ADMIN.md states "no PATCH, no DELETE"),
`PATCH /admin/invoices/:id` (editing amounts), `DELETE /admin/invoices/:id`,
`PATCH|DELETE /admin/invoices/:id/payments/:paymentId` (INV-BILLING-23), any endpoint writing
`paidAmount` or `status` directly.

**SCOPE-BILL-01 — scope gap**: `RBAC_MATRIX.md` says `StudentInvoice read own = 🔒 Student` and
`ENTITY_STUDENT_INVOICE` says "Student sees only own invoices (S-BILL-1)", but **no route**
implements it (no `API_STUDENT.md` in the docs). Students currently **have no way to view their
own invoices** — while still receiving the `new_invoice` notification pointing at a nonexistent
page. See Q-BILL-8.

## 3. DTO

Module-wide convention: **every money value over HTTP is a `string`**, never a `number`
(INV-BILLING-14). Every `Date` is `YYYY-MM-DD` (no time, no timezone). Every `DateTime` is UTC
ISO 8601.

### 3.1 `POST /admin/tuition-rates`

**Request**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `studentId` | uuid | **yes** | Exists; `User.role = 'student'`; `User.status = 'active'` |
| `rateAmount` | string decimal | **yes** | `> 0`; max 2 decimal places; `Decimal(10,2)` → cap `99999999.99`; unit VND. Sent as string (e.g. `"2500000.00"`) |
| `billingCycle` | enum | no | Only accepts `monthly`. Default `monthly`. Other values → 400 (Q-BILL-2) |
| `effectiveFrom` | Date | **yes** | Must be **strictly greater than** the student's current `MAX(effectiveFrom)` (INV-BILLING-05) |

**Not accepted**: `effectiveTo` (⚠ C2 — if C2 resolves per the ENTITY doc, this DTO must change),
`id`, `createdAt`, `updatedAt`.

**Response 201**

```json
{ "data": { "rate": {
    "id": "uuid", "studentId": "uuid", "rateAmount": "2500000.00",
    "billingCycle": "monthly", "effectiveFrom": "2026-09-01",
    "effectiveTo": null, "createdAt": "2026-08-19T09:00:00Z" } } }
```

⚠ **C5 (envelope contradiction, new)**: `admin-tuition-rates.md` (page contract) says "Envelope
field: **`data.rate`**" — i.e. an object nested one level deeper. `API_CONVENTIONS.md` says the
envelope is `{ "data": {...} }` with the object directly in `data`. Two different readings: FE
reads `res.data.rate.rateAmount`, BE per convention returns `res.data.rateAmount` → **FE receives
`undefined`, not an HTTP error**. This spec tentatively follows the page contract (`data.rate`)
since that's the consuming side, but it must be locked once for the whole system (Q-BILL-9).
`effectiveTo` always returns `null` per ADR-008; the field stays only because the column exists
in the schema.

### 3.2 `GET /admin/tuition-rates` *(PROPOSED)*

**Request (query)**: `page` (int ≥1, default 1) · `limit` (int 1..100, default 20) ·
`studentId` (uuid, optional — when present returns that student's full history) · `activeOnly`
(bool, default `true`).

**Response 200**

```json
{
  "data": [
    { "studentId": "uuid", "studentName": "string",
      "current": { "id": "uuid", "rateAmount": "2500000.00", "billingCycle": "monthly", "effectiveFrom": "2026-03-01" },
      "changesCount": 2 }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

`current = null` when the student has no rate yet — FE sorts these rows **to the top**
(`admin-tuition-rates.spec.md` §5: "These rows sort to the top", §10: "Do not sort students with
no rate to the bottom"). With `studentId` + `activeOnly=false` → return the full history
`ORDER BY effectiveFrom DESC`, each element adding `isCurrent: boolean` (**derived at read time,
not a stored column**).

⚠ This endpoint must return **students without a rate too** — i.e. the source is `User WHERE
role='student'` LEFT JOIN rate, not the rate table. Implementing from the rate table would make
the rows needing action disappear from the screen.

### 3.3 `POST /admin/invoices`

**Request**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `studentId` | uuid | **yes** | Exists; `role = 'student'`; `status = 'active'` |
| `periodStart` | Date | **yes** | Calendar date |
| `periodEnd` | Date | **yes** | `>= periodStart`; period length ≤ 366 days |
| `dueDate` | Date | **yes** | `>= periodStart` (INV-BILLING-29). Proposal: default `periodEnd + 7 days` if the client omits it — **not locked** (Q-BILL-10) |
| `totalAmount` | string decimal | **no** | Omitted → taken from the rate at `periodStart` (INV-BILLING-01). Present → **overrides**; `> 0`, ≤ 2 decimal places, `Decimal(12,2)` |

**Proposed header**: `Idempotency-Key: <uuid>` (§8.3; not in API_CONVENTIONS.md → Q-BILL-4).

⚠ Overriding `totalAmount` is inferred from `ENTITY_STUDENT_TUITION_RATE`: "System uses active
rate as **default** `totalAmount`" — the word *default* implies editable. But an override makes
the invoice **no longer explainable by any rate** (the `StudentInvoice` table has no `rateId`
column, no `rateAmountSnapshot` column) → reconciliation ability lost. See Q-BILL-7.

**Response 201**

```json
{ "data": { "invoice": {
    "id": "uuid", "studentId": "uuid", "studentName": "string",
    "periodStart": "2026-09-01", "periodEnd": "2026-09-30",
    "totalAmount": "2500000.00", "paidAmount": "0.00",
    "outstandingAmount": "2500000.00", "status": "unpaid",
    "dueDate": "2026-10-07", "createdAt": "2026-08-19T09:00:00Z" } } }
```

`outstandingAmount = totalAmount − paidAmount`, **derived at read time, no stored column**
(INV-BILLING-16). Why it must be returned: FE needs it to bound the amount input in the payment
form; making FE subtract two decimal strings is an invitation to float subtraction.

### 3.4 `GET /admin/invoices`

**Request (query)**: `page` · `limit` · `studentId` (uuid) · `status`
(`unpaid`|`partially_paid`|`paid`|`void`, repeatable) · `periodFrom` / `periodTo` (Date, filter
on `periodStart`) · `dueBefore` (Date) · `overdue` (bool — `status ∈ {unpaid, partially_paid}`
AND `dueDate < <today in VN time>`, see Q-BILL-12) · `sort` (`periodStart_desc` default |
`periodStart_asc` | `dueDate_asc`).

**Response 200**: `{ "data": [ <object as in 3.3, WITHOUT payments[]> ], "meta": {...} }`.

`paidAmount` read straight from the column — **forbidden** to JOIN `TuitionPayment` and `SUM` at
the list endpoint (§11). The column exists exactly for this reason.

### 3.5 `GET /admin/invoices/:id`

**Response 200** — `payments[]` **embedded** (page contract `admin-invoice-detail`: "embedded
`payments[]`"):

```json
{ "data": { "invoice": {
    "id": "uuid", "studentId": "uuid", "studentName": "string",
    "periodStart": "2026-09-01", "periodEnd": "2026-09-30",
    "totalAmount": "2500000.00", "paidAmount": "1000000.00",
    "outstandingAmount": "1500000.00", "status": "partially_paid",
    "dueDate": "2026-10-07", "createdAt": "2026-08-19T09:00:00Z",
    "payments": [
      { "id": "uuid", "amount": "1000000.00", "paidAt": "2026-09-05T03:00:00Z",
        "paymentMethod": "bank_transfer", "transactionReference": "FT26248xxxx",
        "recordedBy": { "id": "uuid", "name": "string" },
        "createdAt": "2026-09-05T03:12:00Z" } ] } } }
```

`payments[]` sorted `ORDER BY paidAt ASC, id ASC` (deterministic order — two payments with the
same `paidAt` must still come out in the same order on every read). **No pagination of
`payments[]`**: the payment count per invoice is in the tens, and paginating would make
`Σ payments[].amount` on screen mismatch `paidAmount` — exactly the kind of display bug mistaken
for a money bug.

### 3.6 `PATCH /admin/invoices/:id/void`

**Request**: `{ "reason": "string" }` — mandatory, 5..500 chars.

⛔ **No column stores `reason`.** `ENTITY_STUDENT_INVOICE` has no `voidReason`, no `voidedAt`, no
`voidedBy`. Voiding an invoice is a financial action with consequences (§4.3), but the system
**can't record who voided, when, or why** except in the not-yet-existing audit table. Two options:
(a) add 3 columns + migration; (b) audit only. → Q-BILL-11.

**Response 200**: invoice object as in §3.3 with `status: "void"`. `paidAmount` **kept as-is**,
not reset to 0 (INV-BILLING-19).

### 3.7 `POST /admin/invoices/:id/payments`

**Request**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `amount` | string decimal | **yes** | `> 0` **and** `<= invoice.totalAmount − invoice.paidAmount` (INV-BILLING-10); ≤ 2 decimal places; `Decimal(10,2)` |
| `paidAt` | DateTime UTC | **yes** | `<= now() + 5 minutes` (clock-skew tolerance). Backdating allowed (matches bank statements) |
| `paymentMethod` | string | **yes** | ≤ 50 chars. The column is **free-form** `varchar(50)` — ENTITY only says "e.g. `bank_transfer`, `cash`, `vietqr`". Whitelist of exactly those 3 proposed; not locked (Q-BILL-13) |
| `transactionReference` | string | no | ≤ 200 chars. Used to reconcile VietQR statements |

**Not accepted**: `recordedBy` (server takes it from the token — INV-BILLING-24), `invoiceId`
(from the path), `id`, `createdAt`.

**Proposed header**: `Idempotency-Key: <uuid>` (§8.2).

**Response 201** — returns **both the payment and the invoice's new state**:

```json
{ "data": {
    "payment": { "id": "uuid", "invoiceId": "uuid", "amount": "1500000.00",
                 "paidAt": "2026-09-20T04:00:00Z", "paymentMethod": "bank_transfer",
                 "transactionReference": "FT26263xxxx",
                 "recordedBy": { "id": "uuid", "name": "string" },
                 "createdAt": "2026-09-20T04:05:00Z" },
    "invoice": { "id": "uuid", "totalAmount": "2500000.00", "paidAmount": "2500000.00",
                 "outstandingAmount": "0.00", "status": "paid" } } }
```

The `invoice` must be in the same response: if FE had to re-call `GET /admin/invoices/:id` to
learn the new state, there'd be a window where a second admin already recorded another payment →
FE displays a wrong balance and lets the user enter an amount that's no longer valid.

### 3.8 `GET /admin/invoices/summary` *(PROPOSED)*

**Request (query)**: **exactly §3.4's filter set** (`studentId`, `status`, `periodFrom`,
`periodTo`, `dueBefore`, `overdue`) minus `page`/`limit`/`sort`.

```json
{ "data": { "summary": {
    "invoiceCount": 42, "totalInvoiced": "105000000.00",
    "totalPaid": "78500000.00", "totalOutstanding": "26500000.00",
    "countByStatus": { "unpaid": 8, "partially_paid": 5, "paid": 28, "void": 1 },
    "overdueCount": 3, "overdueAmount": "7500000.00" } } }
```

Two mandatory constraints: (1) `void` is **not** counted in `totalInvoiced`/`totalOutstanding`
(a voided invoice isn't a receivable) but still appears in `countByStatus` — otherwise the header
total never matches the table below; (2) the filter must match §3.4 absolutely — if one condition
drifts, header and table say two different numbers on the same screen.

### 3.9 `POST /admin/invoices/batch/preview` *(PROPOSED)*

**Request**: `periodStart` · `periodEnd` · `dueDate` (Date, required) · `studentIds` (uuid[],
optional — omitted = **every** `User role='student' status='active'`).

```json
{ "data": {
    "rows": [
      { "studentId": "uuid", "studentName": "string", "outcome": "ok",
        "rateId": "uuid", "rateAmount": "2500000.00", "totalAmount": "2500000.00" },
      { "studentId": "uuid", "studentName": "string", "outcome": "no_rate",
        "rateId": null, "rateAmount": null, "totalAmount": null },
      { "studentId": "uuid", "studentName": "string", "outcome": "duplicate",
        "existingInvoiceId": "uuid", "existingStatus": "unpaid" }
    ],
    "summary": { "ok": 38, "no_rate": 1, "duplicate": 1, "totalAmount": "95000000.00" } } }
```

`outcome ∈ {ok, no_rate, duplicate}`. **This endpoint writes 0 bytes** — no invoice, no
notification, no audit beyond the access-log line (INV-BILLING-31).

### 3.10 `POST /admin/invoices/batch` *(PROPOSED)*

**Request**: as §3.9 + `Idempotency-Key` (mandatory, not optional — §8.3).

The response shape **depends on Q-BILL-3** (§7 TX-BILL-E). The two shapes correspond to the two
options listed in §7; **not locked here**.

## 4. Business rules (invariants)

### 4.1 Choosing the tuition rate — the module's keystone

| ID | Statement |
|---|---|
| **INV-BILLING-01** | The rate applied to a `StudentInvoice` is that `studentId`'s `StudentTuitionRate` record in effect **at the invoice's `periodStart`**, selected by exactly this query: `WHERE "studentId" = :studentId AND "effectiveFrom" <= :periodStart ORDER BY "effectiveFrom" DESC LIMIT 1`. **FORBIDDEN**: the current rate (`effectiveTo IS NULL`), the rate at `now()`, the rate at invoice-creation date, the rate at `periodEnd`, the rate at `dueDate`. |
| **INV-BILLING-02** | `totalAmount` is a **snapshot at creation time**. Any later rate change — including a new rate whose `effectiveFrom` falls inside the period — **never** changes an existing invoice's `totalAmount`. No job recomputes it, no endpoint recomputes it. |
| **INV-BILLING-03** | No rate found per INV-BILLING-01 → **the whole request fails**, no invoice created. **FORBIDDEN** to fall back to `0`, **FORBIDDEN** to fall back to the current rate, **FORBIDDEN** to create an invoice with `totalAmount` null. |
| **INV-BILLING-04** | `StudentTuitionRate` is append-only: INSERT only. No UPDATE of old records, no DELETE, no endpoint allowing either (ADR-008 Accepted). ⚠ **C2** — see §16. |
| **INV-BILLING-05** | A new record's `effectiveFrom` must be **strictly greater than** the student's current `MAX(effectiveFrom)`. Backdating forbidden. Direct reason: backdating changes the applicable rate of **already-invoiced periods**, making `GET /admin/tuition-rates` (history) unable to explain the invoices already sent to parents. |
| **INV-BILLING-06** | At most one `StudentTuitionRate` per `(studentId, effectiveFrom)` — **DB UNIQUE**. Without it, the INV-BILLING-01 query becomes **non-deterministic**: two rows with the same `effectiveFrom` but different `rateAmount`, `LIMIT 1` picks arbitrarily → **invoice amounts depend on luck**. |
| **INV-BILLING-07** | `rateAmount > 0`, exactly ≤ 2 decimal places, `Decimal(10,2)`. `billingCycle` only accepts `monthly` — the enum currently has one value (Q-BILL-2). |
| **INV-BILLING-08** | `studentId` must point to a `User` with `role = 'student'`. Checked at the **service layer** — the FK only points to `User` and doesn't distinguish roles, so the DB can't stop setting a tuition rate for a teacher. |

### 4.2 Money arithmetic — the part that must not be off by a single cent

| ID | Statement |
|---|---|
| **INV-BILLING-09** | `StudentInvoice.paidAmount` = **the SUM of `amount` over every `TuitionPayment` with `invoiceId` = that invoice**, at **every committed instant**. No exceptions, no lag, no sync job. An invoice with no payments → `paidAmount = 0.00`. This invariant is verifiable with one cross-check query (§11) and must run as an assertion after **every** module test. |
| **INV-BILLING-10** | Each `TuitionPayment.amount` must satisfy **simultaneously**: `amount > 0` **AND** `amount <= (invoice.totalAmount − invoice.paidAmount)` **read at write time, under lock**. No overpay. No `amount = 0`. No `amount < 0` (no negative-payment concept — consequence: **no refund mechanism**, see Q-BILL-5). |
| **INV-BILLING-11** | Mandatory consequence of INV-BILLING-09 + 10: `0 <= paidAmount <= totalAmount` **always holds**. This constraint must exist as a **DB CHECK constraint**, not just an inference. |
| **INV-BILLING-12** | `status` is a **derived function** of `(paidAmount, totalAmount)`, never set independently: `status = 'void'` → stays `void` (one-way gate, INV-BILLING-18); otherwise `paidAmount = 0` → `unpaid`; `0 < paidAmount < totalAmount` → `partially_paid`; `paidAmount >= totalAmount` → `paid`. The derivation must be computed **in the SQL from current column values**, not in JS from a previously-read value (§8.1). |
| **INV-BILLING-13** | `totalAmount > 0`. A 0-cent invoice is self-contradictory: per INV-BILLING-12, `paidAmount(0) >= totalAmount(0)` → `status = 'paid'` **at creation**, contradicting `ENTITY_STUDENT_INVOICE`: "`status = unpaid` on creation". Must be blocked by a DB CHECK. |
| **INV-BILLING-14** | The entire money path uses Decimal end-to-end (Prisma `Decimal` ↔ PostgreSQL `numeric`). **FORBIDDEN**: JS `Number`, `parseFloat`, `+`, `-`, `*` at any stage, **including serialization**. Money leaves JSON as **string**. A `Prisma.Decimal` object **must never leak straight into a response** — it must pass an explicit serializer (Q-BILL-1). |
| **INV-BILLING-15** | Every money value this module writes to the DB has a **zero fractional part** (VND has no subunit). ⚠ **PROPOSED** — blocked by Q-BILL-1; the current schema (`Decimal(10,2)`/`(12,2)`) **allows** `0.01` and the module currently has **no constraint** blocking it. |
| **INV-BILLING-16** | `outstandingAmount = totalAmount − paidAmount` is **derived at read time**: no column, never accepted from a client, never cached. |

### 4.3 Invoice lifecycle

| ID | Statement |
|---|---|
| **INV-BILLING-17** | The only valid transitions are **5**: `unpaid → partially_paid`, `unpaid → paid`, `partially_paid → paid`, `unpaid → void`, `partially_paid → void`. Everything else is rejected, including: `paid → *` (even `void`), `void → *`, `partially_paid → unpaid`, `paid → partially_paid`. |
| **INV-BILLING-18** | `void` is a **one-way gate, a final state**: a `void` invoice **accepts no further payments**. The `status <> 'void'` condition must be in the **WHERE clause of the UPDATE**, not just an `if` in the service (§8.1). |
| **INV-BILLING-19** | `void` **doesn't delete or modify** existing `TuitionPayment`s and **doesn't reset** `paidAmount` to 0. Consequence: an invoice with `status='void'` and `paidAmount > 0` legitimately exists — i.e. money a student paid toward a now-voided invoice. The system **currently has no mechanism** to represent returning that money (INV-BILLING-10 forbids `amount <= 0`). → Q-BILL-5. |
| **INV-BILLING-20** | An invoice with `status = 'paid'` **cannot be voided**. The `status IN ('unpaid','partially_paid')` condition is in the WHERE of the void UPDATE. |
| **INV-BILLING-21** | After creation, `studentId`, `periodStart`, `periodEnd`, `totalAmount`, `dueDate` are **permanently immutable**. No endpoint edits them. No invoice-deletion endpoint. Mistakes can only be handled by `void` + creating a new invoice (and `void` is only available when not `paid` — INV-BILLING-20). |
| **INV-BILLING-22** | `paidAmount` and `status` **only change as a consequence** of (a) INSERTing a `TuitionPayment` or (b) the `void` action. No direct API write path. A request body containing `paidAmount`/`status` gets **stripped**, not errored. |

### 4.4 `TuitionPayment` — immutability

| ID | Statement |
|---|---|
| **INV-BILLING-23** | `TuitionPayment` is **absolutely immutable**: INSERT only. No UPDATE, no DELETE, no PATCH/DELETE route exists. `updatedAt` after INSERT **never** differs from `createdAt`. (`ENTITY_TUITION_PAYMENT`: "Immutable once created — no edit/delete".) |
| **INV-BILLING-24** | `recordedBy` = the actor's id from the **token**, never from the body. The actor must be `role='admin'` **and** `status='active'`. This is the signature on a financial voucher — taking it from the body would let any admin sign as anyone else. |
| **INV-BILLING-25** | `invoiceId` is immutable: a payment belongs to **exactly one** invoice and **never** moves to another. Wrong invoice recorded = void the wrong invoice + re-record — no gentler fix. |
| **INV-BILLING-26** | `paidAt <= now() + 5 minutes`. Backdating allowed (statement reconciliation), **future dating is not**. |
| **INV-BILLING-27** | When `transactionReference IS NOT NULL`: the pair `(paymentMethod, transactionReference)` is **unique system-wide**. One bank transaction is recorded exactly once, even if mistakenly recorded against two different invoices. ⚠ **PROPOSED** — inferred from `ENTITY_TUITION_PAYMENT`: "`transactionReference` used to match against VietQR bank statements"; not in any source doc. |

### 4.5 Duplicates & period boundaries

| ID | Statement |
|---|---|
| **INV-BILLING-28** | **At most one non-`void` invoice** per `(studentId, periodStart, periodEnd)`. Guaranteed by a **partial DB UNIQUE index** (`WHERE status <> 'void'`), not just a service check. Partial (not plain UNIQUE) because a voided invoice **must be re-issuable** for the same period — a plain UNIQUE would lock that period forever. |
| **INV-BILLING-29** | `periodEnd >= periodStart` **and** `dueDate >= periodStart`. DB CHECK. |
| **INV-BILLING-30** | Two non-`void` invoices of **the same student** must not overlap in date range. INV-BILLING-28 **isn't enough**: `09-01..09-30` and `09-15..10-15` are different key pairs so both pass → the student is billed twice for the second half of September. Needs `EXCLUDE USING gist` on `daterange` (§12). ⚠ **PROPOSED** — Q-BILL-14. |
| **INV-BILLING-31** | `POST /admin/invoices/batch/preview` **writes nothing**: 0 `StudentInvoice`, 0 `Notification`, 0 `TuitionPayment`, 0 business audit rows. Running preview 100 times leaves the DB byte-identical. |

### 4.6 RBAC & leakage

| ID | Statement |
|---|---|
| **INV-BILLING-32** | All 10 endpoints only accept an actor with `role = 'admin'` **and** `status = 'active'`. Checked at the **service layer**, not only by an `@Roles()` guard. |
| **INV-BILLING-33** | No path lets a non-admin actor read someone else's invoice. When the student route opens (SCOPE-BILL-01), the `invoice.studentId = actor.id` condition must be in the **query's WHERE**, not an `if` after reading. |
| **INV-BILLING-34** | Module responses **never** contain `User.passwordHash`, `User.email`, `User.lastLoginAt`, `User.bio`, `User.hskLevelGoal`. Only `studentId`/`recordedBy.id` + display name. |

## 5. Ownership / RBAC

Guard: `@Roles('admin')` on all 10 routes. Additional check at the **service layer**:

- `actor.role === 'admin' && actor.status === 'active'` — otherwise → `AUTH_INSUFFICIENT_ROLE`
  403. Why `status` must be re-checked: an issued token stays valid after an admin is suspended;
  the role guard reads the token claim, not the DB.
- **No ownership filter for admins**: `RBAC_MATRIX.md` says `StudentTuitionRate set = ✅`,
  `StudentInvoice create = ✅`, `TuitionPayment record = ✅` → admin operates on every student.
- `recordedBy` **always** `= actor.id` (INV-BILLING-24). No parameter allows recording on
  someone's behalf.
- Teacher: `❌` on all three tables — no route, no exception.
- Student: `StudentInvoice read own = 🔒` per RBAC_MATRIX but **no route** (SCOPE-BILL-01). When
  opened, the mandatory condition: `WHERE "studentId" = :actorId AND status <> 'void'` — and it
  must be a **dedicated handler**, not the admin handler reused with a `studentId` query param
  (reuse = IDOR waiting for one forgotten guard).
- No role split "invoice issuer" ≠ "payment recorder". Every admin can do both — one admin can
  create an invoice, record it fully paid, and void it themselves. See Q-BILL-15.

## 6. State machine

### 6.1 `StudentInvoice`

```
                    POST /admin/invoices
                            │
                            ▼
                    ┌───────────────┐
                    │    unpaid     │  paidAmount = 0
                    └───────┬───────┘
             payment        │        payment
        (0 < Σ < total)     │     (Σ >= total)
              ┌─────────────┴─────────────┐
              ▼                           ▼
      ┌───────────────┐   payment  ┌─────────────┐
      │partially_paid │───────────►│    paid     │ ◄── FINAL STATE
      └───────┬───────┘ (Σ>=total) └─────────────┘     cannot be voided
              │                                        no way back
              │ PATCH /void          PATCH /void            (INV-BILLING-20)
              │      ┌───────────────────┘  ✗ REJECTED 409
              ▼      ▼
      ┌─────────────────┐
      │      void       │ ◄── FINAL STATE. Accepts no payment (INV-BILLING-18)
      └─────────────────┘     paidAmount KEPT (INV-BILLING-19)
```

**Two one-way gates**: `paid` and `void`. Neither has an exit — even via a valid DB edit, since
payments are immutable and `paidAmount` can't decrease.

`paid → void` being rejected is deliberate (`INVOICE_ALREADY_PAID`: "A fully paid invoice cannot
be voided or re-issued"). Operational consequence: a mistakenly created invoice that is **already
fully paid** has **no fix path** — can't void, can't delete, can't edit `totalAmount`. This is a
real dead end, not an inference. → Q-BILL-5.

### 6.2 `StudentTuitionRate`

```
   POST /admin/tuition-rates ──► (new record, effectiveFrom > current MAX)
                                       │
                                       └──► NO state. NO transition.
                                            NO UPDATE. NO DELETE. (ADR-008)
```

Per ADR-008 the `effectiveTo` column is a **dead column**: always `NULL`, never written. "Current
rate" is the record with the largest `effectiveFrom <= <date of interest>`, not the record with
`effectiveTo IS NULL`. ⚠ **C2** — if C2 resolves per the ENTITY doc, this section,
INV-BILLING-01/04/05, §7 TX-BILL-D and §8.5 must be entirely rewritten.

### 6.3 `TuitionPayment`

```
   POST /admin/invoices/:id/payments ──► (new record) ──► PERMANENTLY IMMUTABLE
```

No state, no transition, no deletion. This is the ledger.

## 7. Transaction boundary

### TX-BILL-A — `POST /admin/invoices/:id/payments` (the module's most important block)

**Isolation: `READ COMMITTED` + `SELECT ... FOR UPDATE` in step 1.** No `SERIALIZABLE`.

```
BEGIN  -- READ COMMITTED
 1. SELECT id, "totalAmount", "paidAmount", status
      FROM "StudentInvoice" WHERE id = :invoiceId
      FOR UPDATE
    -- 0 rows → rollback → 404 INVOICE_NOT_FOUND
    -- FOR UPDATE: turns contention into a queue. The second admin WAITS here,
    -- then re-reads paidAmount AFTER the first admin commits.

 2. Check against the just-read values UNDER LOCK (not values read in an earlier request):
      status = 'void'                                   → rollback → 409
      status = 'paid'                                   → rollback → 409 (outstanding = 0)
      amount <= 0                                       → rollback → 400
      amount > (totalAmount - paidAmount)               → rollback → 400

 3. INSERT "TuitionPayment" (id, "invoiceId", amount, "paidAt", "paymentMethod",
                             "transactionReference", "recordedBy" = :actorId)
    -- UNIQUE (paymentMethod, transactionReference) if enabled → P2002 → rollback → 409

 4. UPDATE "StudentInvoice"
       SET "paidAmount" = "paidAmount" + :amount,
           status = CASE
                      WHEN "paidAmount" + :amount >= "totalAmount" THEN 'paid'
                      WHEN "paidAmount" + :amount > 0              THEN 'partially_paid'
                      ELSE 'unpaid' END,
           "updatedAt" = now()
     WHERE id = :invoiceId
       AND status <> 'void'
       AND "paidAmount" + :amount <= "totalAmount"
    -- affectedRows MUST = 1. Otherwise → THROW → rollback.
    -- NOTE: paidAmount and status computed FROM COLUMN VALUES, not from step 1's read.

 5. INSERT audit (actorId, invoiceId, paymentId, action='record_payment',
                  amount, paidAmountAfter, statusAfter, at, ip)
COMMIT
```

**Mandatorily one transaction**: INSERT `TuitionPayment` + UPDATE `paidAmount` + recompute
`status` + write audit. No observable intermediate state:

- If the payment INSERT commits but the invoice UPDATE doesn't → `paidAmount` < `Σ payments` →
  **INV-BILLING-09 broken**. The system tells the student they still owe the amount already paid;
  manual reconciliation is the only way to find it.
- If the invoice UPDATE commits but the payment INSERT doesn't → `paidAmount` > `Σ payments` →
  the invoice shows collected money with **no voucher**. That's real lost money for the center.
- Neither direction self-heals, because payments are immutable (INV-BILLING-23) — no valid
  compensating operation exists.

**Why `READ COMMITTED` suffices — and under what condition**

`READ COMMITTED` is **not** sufficient if written read-compute-write:

```
-- WRONG: lost update
SELECT "paidAmount" ...            -- T1 reads 0, T2 reads 0
newPaid = 0 + 1_500_000 (in JS) -- both compute 1,500,000
UPDATE ... SET "paidAmount" = :newPaid  -- T2 overwrites T1
-- Result: 2 payments of 1.5M, paidAmount = 1,500,000. INV-BILLING-09 broken.
```

`READ COMMITTED` **is** sufficient when the write is **one self-referential UPDATE with the
guarding condition in the WHERE** (step 4). Mechanism: when T2 hits a row locked by T1, T2 waits;
T1 commits; T2 **re-reads the row's newest version and RE-EVALUATES the WHERE clause** against it
(EvalPlanQual). So `paidAmount + :amount <= totalAmount` is checked against the balance **after**
T1, not the balance T2 read initially. This is why the expression `"paidAmount" =
"paidAmount" + :amount` (column-based addition) is mandatory and `= :computedValue` (assigning a
JS-computed value) is forbidden.

**Why `SELECT ... FOR UPDATE` in step 1 is still needed** — three reasons, not redundancy:

1. **Error classification.** Without the lock, step 4 only returns `affectedRows = 0` without
   saying why (void? over balance? nonexistent?). Returning the right error code requires
   re-reading the row after rollback — one more round trip that may itself read a changed state.
   With the lock, the step-2 checks are exact and stable.
2. **Protects the step-3 INSERT.** The payment INSERT happens **before** the UPDATE. Without the
   lock, T2 already wrote the payment row before discovering the over-balance at step 4 →
   rollback (correct, but wasteful and noisy for sequences/audit). With the lock, T2 stops at
   step 2.
3. **Enables the "recompute from `SUM`" strategy.** If we ever change step 4 to
   `SET "paidAmount" = (SELECT COALESCE(SUM(amount),0) FROM "TuitionPayment" WHERE "invoiceId" = :id)`
   then **`READ COMMITTED` alone is NOT enough**: T2's `SUM` won't see T1's uncommitted payment.
   It's exactly `FOR UPDATE` at step 1 that makes T2 wait for T1's commit, so the `SUM` is
   complete. In other words: the lock is what keeps both write strategies correct.

**Why not `SERIALIZABLE`**: the transaction touches **one** invoice row; `FOR UPDATE` already
serializes exactly the needed scope. `SERIALIZABLE` adds the obligation to catch `40001` and
retry at every endpoint, without blocking any additional scenario. The cost buys nothing.

**Lock note (precise, not trivia)**: INSERTing a `TuitionPayment` referencing the invoice FK
takes `FOR KEY SHARE` on the parent invoice row. `FOR KEY SHARE` **conflicts with `FOR UPDATE`** —
so two payment transactions on the **same** invoice serialize as intended. Conversely, a plain
UPDATE on the invoice (not touching key columns) takes `FOR NO KEY UPDATE`, which does **not**
conflict with `FOR KEY SHARE` — meaning if `FOR UPDATE` at step 1 were dropped, T2's payment
INSERT would **not be blocked** by T1's UPDATE; only the two step-4 UPDATEs would block each
other. That's exactly scenario (2) above. The lock is scoped to **one invoice row**, so two
different invoices never block each other — no throughput concern.

### TX-BILL-B — `POST /admin/invoices`

Isolation: `READ COMMITTED`. No row lock needed (no row to lock — creating new); relies on UNIQUE
constraints.

```
BEGIN
 1. SELECT id, role, status FROM "User" WHERE id = :studentId
    -- nonexistent → 404 USER_NOT_FOUND;  role <> 'student' → 400
 2. If totalAmount not sent:
      SELECT id, "rateAmount" FROM "StudentTuitionRate"
       WHERE "studentId" = :studentId AND "effectiveFrom" <= :periodStart
       ORDER BY "effectiveFrom" DESC LIMIT 1
    -- 0 rows → rollback → 400 INVOICE_NO_TUITION_RATE (INV-BILLING-03)
 3. INSERT "StudentInvoice" (..., "totalAmount" = :amount, "paidAmount" = 0,
                             status = 'unpaid')
    -- partial UNIQUE (studentId, periodStart, periodEnd) WHERE status <> 'void'
    -- → P2002 → rollback → 409 INVOICE_PERIOD_DUPLICATE
 4. INSERT "Notification" (userId = :studentId, type = 'new_invoice',
                           referenceId = invoice.id, referenceType = 'invoice',
                           isRead = false, payload = {...})
 5. INSERT audit (actorId, invoiceId, action='create', totalAmount, rateId, at)
COMMIT
```

**The Notification is INSIDE the transaction** (step 4) because `Notification` is a row in the
**same database** — not a network call. Moving it out to "avoid long transactions" is a bad
trade: it creates two broken states (an invoice without its notification; a notification pointing
at a rolled-back invoice → deep-link 404) in exchange for a few milliseconds. If real email/push
arrives later, the outbox pattern is needed then, and the outbox row also lives in this
transaction.

### TX-BILL-C — `PATCH /admin/invoices/:id/void`

```
BEGIN
 1. UPDATE "StudentInvoice" SET status = 'void', "updatedAt" = now()
     WHERE id = :id AND status IN ('unpaid','partially_paid')   -- conditional update
    -- affectedRows = 0 → THROW, error classification in §8.4
    -- Does NOT touch paidAmount (INV-BILLING-19). Does NOT delete any payment.
 2. INSERT audit (actorId, invoiceId, action='void', reason,
                  paidAmountAtVoid, statusBefore, at, ip)
COMMIT
```

`paidAmountAtVoid` is a **mandatory** audit field: if non-zero, it's the only record proving the
center holds money from a voided invoice (Q-BILL-5, metric in §14).

### TX-BILL-D — `POST /admin/tuition-rates`

```
BEGIN
 1. SELECT id, role, status FROM "User" WHERE id = :studentId  -- role='student'
 2. SELECT pg_advisory_xact_lock(hashtext('tuition_rate:' || :studentId))
    -- serialize per student; without it two requests both pass step 3
 3. SELECT MAX("effectiveFrom") FROM "StudentTuitionRate" WHERE "studentId" = :studentId
    -- :effectiveFrom <= MAX → rollback → 400 RATE_EFFECTIVE_DATE_IN_PAST
 4. INSERT "StudentTuitionRate" (...)
    -- UNIQUE (studentId, effectiveFrom) is the last barrier → P2002 → 409
 5. INSERT audit (actorId, studentId, rateId, action='set_rate', rateAmount,
                  effectiveFrom, at)
COMMIT
```

No notification: `ENTITY_NOTIFICATION` has no type for tuition-rate changes (§10).

### TX-BILL-E — `POST /admin/invoices/batch` *(PROPOSED — NOT LOCKED, Q-BILL-3)*

This is an open question; the spec **doesn't decide itself**. Two options with measurable
consequences:

**Option A — all-or-nothing (one transaction for the whole batch)**

```
BEGIN
  for each student in the list (ORDER BY studentId — deterministic order, anti-deadlock):
      pick rate at periodStart → none → THROW (cancels the ENTIRE batch)
      INSERT invoice  → P2002 → THROW (cancels the ENTIRE batch)
      INSERT notification
  INSERT audit (action='batch_create', count, totalAmount)
COMMIT
```

- **Gains**: no half-done state; simple retry (the batch either ran or it didn't); a single
  audit row for the whole batch; `Idempotency-Key` only needs to wrap one response.
- **Loses**: **one** student missing a rate blocks the **entire** 40-student period — and that's
  a common scenario, not a rare one (the FE fixture already has "Mai Tuấn Kiệt · Not set up").
  The admin must fix each error then re-run the whole batch. A long transaction holds locks and a
  large volume of new rows in one commit; with a few hundred students, runtime is long enough to
  hit HTTP timeouts.
- Error code: 422 with `details` listing the broken students — but **nothing was created**,
  contradicting the meaning of `INVOICE_BATCH_PARTIAL_FAILURE` ("Batch generation **partly
  failed**").

**Option B — per-item (one transaction per invoice)**

```
for each student (ORDER BY studentId):
    BEGIN
      pick rate → none → rollback this item, record into failed[]
      INSERT invoice → P2002 → rollback this item, record into skipped[]
      INSERT notification
    COMMIT
INSERT audit (action='batch_create', created[], failed[], skipped[])
```

- **Gains**: one broken student doesn't block the other 39; each transaction is short; matches
  the existing `INVOICE_BATCH_PARTIAL_FAILURE` (422) code in the registry; re-running the batch
  is safe thanks to INV-BILLING-28's partial UNIQUE (already-created items → `skipped`).
- **Loses**: the response is no longer a clean 201 — must return 422 with `details` even when
  39/40 succeeded, or 200 with classification (no standard for that in `API_CONVENTIONS.md`). A
  mid-run crash leaves a half-done batch — re-run relies entirely on the UNIQUE.
  `Idempotency-Key` gets more complex: it must store **per-item** results, not one response.

**The spec's proposal (needs BE lead + PO sign-off, not a decision)**: **Option B, gated by a
mandatory pre-check phase in the same request** — validate the entire list (rate, period
duplicate, role, status) **before writing the first row**; any `outcome = no_rate` → **reject
the whole batch** with 422 + `details`, nothing written; all valid → write per-item in separate
transactions. Reasoning: combines A's "no wrong issuance" with B's "short, re-runnable
transactions", and turns `INVOICE_BATCH_PARTIAL_FAILURE` into an error **caused only by
infrastructure failure**, not missing data — the kind an admin fixes by clicking re-run.
Condition: `POST /admin/invoices/batch/preview` must be called first and display exactly the list
that will be created.

### Boundary summary table

| Operation | Mandatorily same TX | Isolation | Lock |
|---|---|---|---|
| Record payment | INSERT payment + UPDATE `paidAmount` + compute `status` + audit | READ COMMITTED | `SELECT ... FOR UPDATE` on 1 invoice row |
| Create invoice | INSERT invoice + INSERT notification + audit | READ COMMITTED | none (relies on UNIQUE) |
| Void | Conditional UPDATE + audit | READ COMMITTED | none (conditional update) |
| Set rate | Advisory lock + MAX check + INSERT + audit | READ COMMITTED | `pg_advisory_xact_lock` per student |
| Batch | **NOT LOCKED** — Q-BILL-3 | READ COMMITTED | locks in ascending `studentId` order |

## 8. Idempotency & concurrency

### 8.1 Two admins recording a payment on the same invoice at the same time

The scenario that must be absolutely blocked. Invoice `2,500,000`, paid `1,000,000`, balance
`1,500,000`. Admin A records `1,500,000` (bank transfer), admin B simultaneously records
`1,500,000` (cash). One beat off and `paidAmount = 4,000,000` on a `2,500,000` invoice, or
`paidAmount = 2,500,000` with three vouchers totaling `4,000,000`.

**Four defense layers, all four required** (each blocks a scenario the others don't):

| Layer | Mechanism | Blocks | Why the others aren't enough |
|---|---|---|---|
| **L1 — Row lock** | `SELECT ... FROM "StudentInvoice" WHERE id = :id FOR UPDATE` (TX-BILL-A step 1) | Two admins operating on the same invoice concurrently: the second **waits**, re-reads the balance after the first commits, and is rejected with the **right error code** instead of an unexplained `affectedRows = 0` | With only L2 the error is ambiguous and the payment row was already INSERTed before the over-balance was detected |
| **L2 — Conditional UPDATE** | `UPDATE ... SET "paidAmount" = "paidAmount" + :amt, status = CASE ... WHERE id = :id AND status <> 'void' AND "paidAmount" + :amt <= "totalAmount"` | Lost update and overpay, **even if someone drops L1** or opens a second write path bypassing the service. Under `READ COMMITTED`, the WHERE is re-evaluated on the newest row version (§7) | A service check (`if (amount > outstanding) throw`) is **TOCTOU**: the gap between read and write is where money is lost |
| **L3 — CHECK constraint** | `CHECK ("paidAmount" >= 0 AND "paidAmount" <= "totalAmount")` on `StudentInvoice` | **The last line of defense.** Blocks every write path: sloppy migrations, manual fix scripts, a second endpoint someone adds later, ORM bugs. Cannot be bypassed even if the entire app layer is wrong | L1/L2 only exist in happy-path code; L3 exists in the data |
| **L4 — Cross-check query** | `SELECT` comparing `paidAmount` with `SUM(payments)` (§11), run periodically + in test `afterEach` | **Aggregate drift** — a `paidAmount` that differs from `Σ payments` while still inside `[0, totalAmount]`, invisible to L3. The only error type no DB constraint can catch | A CHECK constraint **cannot express** a cross-row aggregate condition; PostgreSQL has no such constraint |

**DB constraints are the last line of defense** (repeated because this is the point that gets cut
under deadline pressure): a service-layer check is only correct when *every* write path goes
through that exact service. In reality there are migrations, seeds, 2 a.m. data-fix scripts, and
a second endpoint someone writes three months later. Three constraints **must exist in the DB**
for this module:

```
CHECK ("paidAmount" >= 0 AND "paidAmount" <= "totalAmount")   -- INV-BILLING-11
CHECK ("totalAmount" > 0)                                     -- INV-BILLING-13
CHECK (amount > 0)                       on TuitionPayment  -- INV-BILLING-10
```

Plus the CHECK tying `status` to `paidAmount` (§12) — it turns INV-BILLING-12 from a code
convention into a data invariant.

**Not used as blocking mechanisms**: `SERIALIZABLE` (redundant, §7); `SELECT ... FOR SHARE`
(doesn't block two writers); optimistic locking via a `version` column (`StudentInvoice` has no
such column, and adding one is a migration while `FOR UPDATE` already suffices).

### 8.2 Repeated payment recording (double-click, network retry)

**Business data cannot dedupe**: two payments with the same `invoiceId`, same `amount`, same
`paymentMethod`, same day are **perfectly valid** (a student pays 500k cash twice in a day). Any
"smart" content-based dedupe will swallow a real payment.

Two mechanisms, different purposes:

1. **`Idempotency-Key: <uuid>`** (proposed, Q-BILL-4) — table `IdempotencyKey(key PK, endpoint,
   actorId, requestHash, responseStatus, responseBody jsonb, createdAt)`, TTL 24h, written
   **inside TX-BILL-A**. Same `key` + same `requestHash` → replay the stored response verbatim
   (201 + old body). Same `key` + different `requestHash` → 422. This is the only thing that
   correctly handles "client double-clicked / timeout retry" — because the client needs **the old
   response back**, not a second payment and not a confusing error.
2. **`UNIQUE (paymentMethod, transactionReference) WHERE "transactionReference" IS NOT NULL`**
   (INV-BILLING-27, proposed) — blocks **re-recording one real bank transaction**, even when two
   admins record it days apart, against two different invoices, with no shared `Idempotency-Key`.
   This is the most common operator error in manual statement reconciliation.

The two mechanisms don't replace each other: (1) blocks **technical** repetition within seconds;
(2) blocks **business** repetition across days.

### 8.3 Batch run twice → no duplicate invoices

**Two layers, both required:**

| Layer | Mechanism | Blocks |
|---|---|---|
| **DB (mandatory)** | `CREATE UNIQUE INDEX ... ON "StudentInvoice" ("studentId","periodStart","periodEnd") WHERE status <> 'void'` (INV-BILLING-28) | Every duplicate-creation path: batch run twice, batch + manual creation, two admins both clicking, batch retry after timeout. This is the **unbypassable barrier**. Partial (`WHERE status <> 'void'`) so a voided invoice can still be re-issued for the same period |
| **Application** | `Idempotency-Key` **mandatory** on `POST /admin/invoices/batch` (not optional) | The client needs **the old response**, not a 409. For batch, the response contains the created list — without replay, the admin can't know who the previous run created |

**Why the unique constraint alone isn't enough for batch**: it makes the second run return "40
duplicate errors" instead of "already ran, here's the result" — data-safe, but operationally the
admin can't distinguish "batch completed" from "batch totally failed", and the natural reaction
is to go delete data by hand. That's when money starts going wrong.

**Why `Idempotency-Key` alone isn't enough**: it only blocks **the same client sending the same
key**. Two admins clicking "Generate September invoices" on two machines produce two different
keys → two valid batches → every student gets two invoices.

**Remaining gap**: both layers only block **exact** `(studentId, periodStart, periodEnd)`
triples. A `09-01..09-30` batch and a `09-15..10-15` batch are different pairs → both layers pass
→ students get two overlapping invoices. Closed by `EXCLUDE USING gist` (INV-BILLING-30, §12) —
**proposed**, Q-BILL-14.

**Preview-to-batch drift**: `preview` computes at time T1, `batch` writes at T2. If between T1
and T2 someone INSERTs a new rate with `effectiveFrom <= periodStart`, the actually-written
amount differs from what was approved on screen. INV-BILLING-05 (no backdating) covers
`periodStart` in the past, **not** the case of issuing ahead for a future period (August issuing
September invoices, a new rate with `effectiveFrom = 09-01` inserted in between). Proposal:
`batch` additionally accepts `previewHash` (hash of the previewed `(studentId, totalAmount)`
list); mismatch → 409 with diff, nothing written. Not locked → Q-BILL-16.

### 8.4 Void running concurrently with payment recording

Both are conditional UPDATEs on **the same invoice row**, so PostgreSQL serializes at the
row-lock level. Two outcomes, **both correct**:

- Payment commits first → void sees `status` already `partially_paid`/`paid`. If `paid` → void
  rejected 409 (INV-BILLING-20); if `partially_paid` → void succeeds, leaving a `void` invoice
  with `paidAmount > 0` (INV-BILLING-19 → Q-BILL-5).
- Void commits first → payment sees `status = 'void'`, `WHERE status <> 'void'` doesn't match →
  `affectedRows = 0` → rollback → 409 `INVOICE_ALREADY_VOID`. The payment row already INSERTed
  at step 3 rolls back with it — **no** orphan payment pointing at a voided invoice.

No third outcome. The `status <> 'void'` condition **must** be in the WHERE; if only checked in
the service, the second scenario creates a payment on a voided invoice.

**Classification when `affectedRows = 0`** (one `SELECT id, status, paidAmount, totalAmount`
after rollback):

| Result | HTTP | code |
|---|---|---|
| 0 rows | 404 | `INVOICE_NOT_FOUND` |
| record payment, `status = 'void'` | 409 | `INVOICE_ALREADY_VOID` |
| record payment, `status = 'paid'` | 409 | `INVOICE_ALREADY_PAID` |
| record payment, balance remains but `amount >` balance | 400 | `INVOICE_PAYMENT_EXCEEDS_TOTAL` |
| void, `status = 'void'` | 409 | `INVOICE_ALREADY_VOID` |
| void, `status = 'paid'` | 409 | `INVOICE_ALREADY_PAID` |

### 8.5 Concurrent `POST /admin/tuition-rates`

Two admins setting a rate for the same student: without a lock both pass the `MAX(effectiveFrom)`
check then both INSERT two records with **the same `effectiveFrom`, different `rateAmount`** →
the rate-selection query in INV-BILLING-01 (`ORDER BY effectiveFrom DESC LIMIT 1`) becomes
**non-deterministic**: each invoice creation can produce one of two amounts. Blocked by
`pg_advisory_xact_lock` (TX-BILL-D step 2) + `UNIQUE (studentId, effectiveFrom)` as the last
barrier (INV-BILLING-06).

### 8.6 Repeated `void` requests

The second gets **409**, **not** a fake-idempotent 200. Same reasoning as specs 04/05: this is a
financial action; silently swallowing the second click hides two admins operating on the same
invoice — information the operator needs. No `Idempotency-Key` for this endpoint: the natural key
`(invoiceId, current status)` already suffices.

### 8.7 Lock ordering & deadlock

Every operation touching multiple invoice rows in one transaction (batch option A, the
reconciliation job) **must** lock in ascending order of a deterministic key (`ORDER BY id` or
`ORDER BY "studentId", "periodStart"`). Two batches running in parallel with different orders
will deadlock; PostgreSQL kills one side with `40P01` and that batch loses all its work.

## 9. Error → code mapping

⚠ **The entire `INVOICE_*` and `RATE_*` groups are *proposed, not agreed*** (API_ERROR_CODES.md
§3 states two warnings; `_FACTS.md` confirms: "INVOICE_* RATE_* SESSION_* AI_* groups =
*proposed, not agreed* — not usable"). Meaning: **every module-specific error branch currently
has no valid code to use**. No new codes invented; below lists the codes **needed** and marks
their status.

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| No token / broken token | 401 | `AUTH_TOKEN_INVALID` | ✅ in API_ERROR_CODES.md |
| Token expired | 401 | `AUTH_TOKEN_EXPIRED` | ✅ exists |
| Not admin / admin suspended | 403 | `AUTH_INSUFFICIENT_ROLE` | ✅ exists |
| Malformed DTO (`amount <= 0`, `rateAmount <= 0`, `periodEnd < periodStart`, `dueDate < periodStart`, future `paidAt`, bad uuid, bad `billingCycle`, > 2 decimal places) | 400 | `VALIDATION_ERROR` + `details` | ✅ exists |
| `studentId` doesn't exist | 404 | `USER_NOT_FOUND` | ✅ exists |
| `studentId` exists but `role ≠ 'student'` | 400 | `VALIDATION_ERROR` with `details.studentId` | ✅ exists |
| Invoice `:id` doesn't exist | 404 | `INVOICE_NOT_FOUND` | ⚠ **proposed, not agreed** |
| Record payment on a `void` invoice | 409 | `INVOICE_ALREADY_VOID` | ⚠ **proposed, not agreed** |
| Void an already-`void` invoice | 409 | `INVOICE_ALREADY_VOID` | ⚠ **proposed, not agreed** |
| Void a `paid` invoice; record payment on a `paid` invoice | 409 | `INVOICE_ALREADY_PAID` | ⚠ **proposed, not agreed** |
| Duplicate `(studentId, periodStart, periodEnd)` (P2002 partial UNIQUE) | 409 | `INVOICE_PERIOD_DUPLICATE` | ⚠ **proposed, not agreed** |
| No rate in effect at `periodStart` on invoice creation | 400 | `INVOICE_NO_TUITION_RATE` | ⚠ **proposed, not agreed** |
| `amount >` balance (`totalAmount − paidAmount`) | 400 | `INVOICE_PAYMENT_EXCEEDS_TOTAL` | ⚠ **proposed, not agreed** |
| Batch partially failed | 422 | `INVOICE_BATCH_PARTIAL_FAILURE` + `details` listing failed `studentId`s | ⚠ **proposed, not agreed** — and the semantics depend on Q-BILL-3 |
| `GET /admin/tuition-rates` for a student with no rate, when the endpoint requests a specific rate | 404 | `RATE_NOT_FOUND` | ⚠ **proposed, not agreed** |
| `effectiveFrom <= MAX(effectiveFrom)` existing | 400 | `RATE_EFFECTIVE_DATE_IN_PAST` | ⚠ **proposed, not agreed** |
| Someone adds a rate edit/delete route | 409 | `RATE_IMMUTABLE` | ⚠ **proposed, not agreed** — no route needs it today |
| **Duplicate `(paymentMethod, transactionReference)`** — re-recording one bank transaction | 409 | ⛔ **TO ADD** | ⛔ **no code exists.** `INVOICE_PERIOD_DUPLICATE` is semantically wrong (this is a duplicate transaction, not a duplicate period). **DUPLICATE_ENTRY** only appears in the `GlobalExceptionFilter` snippet in §5, **not in the §3 registry table** |
| **`Idempotency-Key` duplicate, `requestHash` differs** | 422 | ⛔ **TO ADD** | ⛔ no code; `API_CONVENTIONS.md` has no idempotency section (Q-BILL-4) |
| **Overlapping-period invoice** (if the EXCLUDE constraint is enabled) | 409 | ⛔ **TO ADD** | ⛔ no code (Q-BILL-14) |
| **Voiding an invoice with `paidAmount > 0`** (if locked as blocking — Q-BILL-5) | 409 | ⛔ **TO ADD** | ⛔ no code. The spec currently allows it, so not needed yet — but if Q-BILL-5 locks "block", it's mandatory |
| **`totalAmount` override differing from rate** (if locked as forbidden — Q-BILL-7) | 400 | ⛔ **TO ADD** | ⛔ no code |
| **`paymentMethod` outside whitelist** (if whitelist locked — Q-BILL-13) | 400 | `VALIDATION_ERROR` with `details.paymentMethod` | ✅ usable (no new code needed) |
| Rate limit exceeded | 429 | ⛔ **TO ADD** | ⛔ registry has no 429 code (Q-BILL-17) |
| Unexpected error | 500 | **INTERNAL_SERVER_ERROR** | ⚠ only in the §5 sample code, not in the §3 registry |

**Module error-code summary**: **11 branches** must use codes from the `INVOICE_*`/`RATE_*`
groups — all **unapproved**; **5 branches** ⛔ **have no code at all**, not even in the proposed
table. If still unresolved at coding time: use the correct HTTP status + `VALIDATION_ERROR` or
the closest code, leave a `TODO(error-code)` with a tracking code (exactly what FE is doing:
`admin-tuition-rates.md` writes `TODO(error-code)` directly in its Actions table), and **don't**
lock FE contracts for those branches.

Error envelope **flat** per `API_CONVENTIONS.md`: `statusCode` · `error` (reason phrase, string)
· `code` · `message` (Vietnamese) · `details` (**only** on `VALIDATION_ERROR`) · `timestamp` ·
`path`. No `success` flag, no nested `error` object.

## 10. Side effects & notifications

| Action | Notification | Recipient | referenceType / referenceId |
|---|---|---|---|
| `POST /admin/invoices` (and each invoice in a batch) | `new_invoice` | student (`userId = invoice.studentId`) | `invoice` / `invoice.id` |
| `POST /admin/invoices/:id/payments` | ⛔ **no type** | — | — |
| `PATCH /admin/invoices/:id/void` | ⛔ **no type** | — | — |
| `POST /admin/tuition-rates` | ⛔ **no type** | — | — |

`new_invoice`'s `payload` (jsonb): `{ periodStart, periodEnd, totalAmount, dueDate }` — enough
for FE to render the notification without another API call. `isRead = false`, `readAt = null`.

**Three notification gaps, all business gaps not missing side features**:

1. **No `payment_recorded`**: after a student transfers money, there is **no confirmation at
   all** that the center recorded it. Combined with SCOPE-BILL-01 (students have no invoice-view
   route), a student **has no way to know** how much they've paid.
2. **No `invoice_voided`**: an invoice gets voided but the old `new_invoice` notification stays
   in the student's list (`ENTITY_NOTIFICATION`: "Notifications are append-only — never deleted,
   only marked read") → deep-link to a voided invoice, nothing can retract it.
3. **No `tuition_rate_changed`**: tuition changes without notifying students/parents. RBAC for
   students reading `StudentTuitionRate` is also `❌` (no row in RBAC_MATRIX allows it) → no way
   to know.

Adding types = enum migration of `Notification.type` + ADR → Q-BILL-8.

**Other real side effects** (not notifications):

| Action | Side effect |
|---|---|
| `POST /admin/invoices` | Creates a receivable → feeds `GET /admin/dashboard/stats` ("financial summary") and `GET /admin/invoices/summary` |
| `POST /admin/invoices/:id/payments` | Changes `paidAmount` + `status`; changes `totalOutstanding` of every report; is an accounting voucher (audit mandatory) |
| `PATCH /:id/void` | Removes the invoice from receivables; **doesn't** return already-collected money (INV-BILLING-19) |
| `POST /admin/tuition-rates` | Changes the amount of **future-issued invoices**; doesn't touch created ones (INV-BILLING-02) |

No email, no webhook, **no bank API call**. "VietQR" in the docs is only a reference string
stored in `transactionReference` for **manual** statement reconciliation — no integration, no
callback, no confirmation webhook. If a real bank webhook ever arrives, it becomes **a second
payment-writing source** and all of §8.1 must be revisited (at which point `recordedBy` is no
longer an admin).

## 11. Index & query

```
StudentInvoice:      UNIQUE INDEX ("studentId","periodStart","periodEnd") WHERE status <> 'void'
                       -- INV-BILLING-28, named student_invoice_period_uq. PARTIAL, not plain UNIQUE.
StudentInvoice:      INDEX ("studentId", "periodStart" DESC)      -- GET /admin/invoices filter + sort
StudentInvoice:      INDEX (status)                                -- filter + summary + dashboard
StudentInvoice:      INDEX ("dueDate") WHERE status IN ('unpaid','partially_paid')
                       -- partial: overdue queries only care about uncollected invoices
TuitionPayment:      INDEX ("invoiceId")                           -- payments[] embedded in §3.5 + cross-check query
TuitionPayment:      INDEX ("paidAt" DESC)                         -- daily statement reconciliation
TuitionPayment:      UNIQUE INDEX ("paymentMethod","transactionReference")
                       WHERE "transactionReference" IS NOT NULL    -- INV-BILLING-27 (PROPOSED)
TuitionPayment:      INDEX ("recordedBy")                          -- audit: who recorded which amounts
StudentTuitionRate:  UNIQUE ("studentId","effectiveFrom")          -- INV-BILLING-06 (MANDATORY, not optimization)
StudentTuitionRate:  INDEX ("studentId","effectiveFrom" DESC)      -- the rate-selection query INV-BILLING-01
```

**N+1 risk — must be blocked**:

1. **Worst — batch/preview**: a loop looking up `StudentTuitionRate` per student → N queries for
   N students (40 students = 40 queries, and preview runs every time the admin changes a
   parameter). **Fix**: one query loading rates for the **whole** list
   `WHERE "studentId" = ANY(:ids) ORDER BY "studentId", "effectiveFrom" DESC`, group in memory,
   pick the first element with `effectiveFrom <= periodStart`. Each student's rate-row count is
   in the tens.
2. **Batch — period-duplicate check**: a `findFirst` loop per student → N queries. **Fix**: one
   query `WHERE "studentId" = ANY(:ids) AND "periodStart" = :ps AND "periodEnd" = :pe AND status <> 'void'`.
3. `GET /admin/invoices` list: **forbidden** to JOIN + `SUM("TuitionPayment")` to recompute
   `paidAmount`. Read the column directly. That's why the column exists
   (`ENTITY_STUDENT_INVOICE`: "Accumulated from TuitionPayment records").
4. `GET /admin/invoices` list: a loop fetching `studentName` per row → use
   `include: { student: { select: { id, nickname } } }` (⚠ C1).
5. `GET /admin/invoices/:id`: `payments[]` in **one** query (index `invoiceId`);
   `recordedBy.name` via an `include` with an explicit `select` — **not** a bare
   `include: { recordedBy: true }` (leaks `passwordHash`, `email` — INV-BILLING-34).
6. `GET /admin/invoices/summary`: **one** aggregate query (`COUNT`, `SUM`, `FILTER`), not 4
   per-status queries summed in JS, and absolutely not `findMany().reduce()`.
7. `meta.total`: a separate `COUNT(*)` with the same WHERE, not `findMany().length`.

**Correctness-check queries** (run in the §14 monitoring job **and** in the whole test suite's
`afterEach` — §15):

```sql
-- L4 / INV-BILLING-09: paidAmount must match the payment total. RESULT MUST BE EMPTY.
SELECT i.id, i."paidAmount", COALESCE(SUM(p.amount), 0) AS sum_payments
  FROM "StudentInvoice" i
  LEFT JOIN "TuitionPayment" p ON p."invoiceId" = i.id
 GROUP BY i.id, i."paidAmount"
HAVING i."paidAmount" <> COALESCE(SUM(p.amount), 0);

-- INV-BILLING-12: status must match the paidAmount-derived value. MUST BE EMPTY.
SELECT id, status, "paidAmount", "totalAmount" FROM "StudentInvoice"
 WHERE status <> 'void' AND status <> CASE
         WHEN "paidAmount" >= "totalAmount" THEN 'paid'
         WHEN "paidAmount" > 0             THEN 'partially_paid'
         ELSE 'unpaid' END;

-- INV-BILLING-11: overpay. MUST BE EMPTY.
SELECT id FROM "StudentInvoice" WHERE "paidAmount" > "totalAmount" OR "paidAmount" < 0;

-- INV-BILLING-19 / Q-BILL-5: voided invoices holding student money.
-- NOT required empty, but each row is a refund due with no process.
SELECT id, "studentId", "paidAmount" FROM "StudentInvoice"
 WHERE status = 'void' AND "paidAmount" > 0;

-- INV-BILLING-15 / Q-BILL-1: money with a non-zero fractional part (unpayable in VND).
SELECT id, "paidAmount", "totalAmount" FROM "StudentInvoice"
 WHERE "totalAmount" <> trunc("totalAmount") OR "paidAmount" <> trunc("paidAmount")
UNION ALL SELECT id, amount, amount FROM "TuitionPayment" WHERE amount <> trunc(amount);

-- INV-BILLING-30: two non-void invoices of the same student overlapping periods. MUST BE EMPTY.
SELECT a.id, b.id FROM "StudentInvoice" a JOIN "StudentInvoice" b
    ON a."studentId" = b."studentId" AND a.id < b.id
 WHERE a.status <> 'void' AND b.status <> 'void'
   AND daterange(a."periodStart", a."periodEnd", '[]')
    && daterange(b."periodStart", b."periodEnd", '[]');
```

## 12. Migration & seed

**Mandatory migration**

```sql
-- StudentInvoice
ADD CHECK ("totalAmount" > 0)                                       -- INV-BILLING-13
ADD CHECK ("paidAmount" >= 0 AND "paidAmount" <= "totalAmount")     -- INV-BILLING-11 (last line of defense)
ADD CHECK ("periodEnd" >= "periodStart" AND "dueDate" >= "periodStart")  -- INV-BILLING-29
ADD CHECK (                                                          -- INV-BILLING-12 as a data invariant
      status = 'void'
   OR (status = 'unpaid'         AND "paidAmount" = 0)
   OR (status = 'partially_paid' AND "paidAmount" > 0 AND "paidAmount" < "totalAmount")
   OR (status = 'paid'           AND "paidAmount" >= "totalAmount"))
CREATE UNIQUE INDEX student_invoice_period_uq
    ON "StudentInvoice" ("studentId","periodStart","periodEnd") WHERE status <> 'void';
CREATE INDEX ON "StudentInvoice" ("studentId","periodStart" DESC);
CREATE INDEX ON "StudentInvoice" (status);
CREATE INDEX ON "StudentInvoice" ("dueDate") WHERE status IN ('unpaid','partially_paid');

-- TuitionPayment
ADD CHECK (amount > 0)                                              -- INV-BILLING-10
ADD FK ("invoiceId") REFERENCES "StudentInvoice"(id)                -- confirm exists, ON DELETE RESTRICT
ADD FK ("recordedBy") REFERENCES "User"(id)
CREATE INDEX ON "TuitionPayment" ("invoiceId");
CREATE INDEX ON "TuitionPayment" ("paidAt" DESC);
CREATE INDEX ON "TuitionPayment" ("recordedBy");

-- StudentTuitionRate
ADD UNIQUE ("studentId","effectiveFrom")                            -- INV-BILLING-06
ADD CHECK ("rateAmount" > 0)                                        -- INV-BILLING-07
CREATE INDEX ON "StudentTuitionRate" ("studentId","effectiveFrom" DESC);
```

⚠ `ON DELETE RESTRICT` for `TuitionPayment.invoiceId` is mandatory, **not** `CASCADE`: cascade
means deleting an invoice wipes its payment vouchers. No invoice-deletion endpoint exists
(INV-BILLING-21), but the constraint is what remains when someone runs a manual `DELETE`.

**Proposed migration, awaiting decisions** (don't run before they're locked):

```sql
-- INV-BILLING-27 (Q-BILL-13): prevent re-recording one bank transaction
CREATE UNIQUE INDEX tuition_payment_txref_uq ON "TuitionPayment" ("paymentMethod","transactionReference")
  WHERE "transactionReference" IS NOT NULL;
-- Must clean existing duplicates FIRST, otherwise the migration fails.

-- INV-BILLING-30 (Q-BILL-14): prevent overlapping-period invoices
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "StudentInvoice" ADD CONSTRAINT student_invoice_no_overlap
  EXCLUDE USING gist ("studentId" WITH =,
                      daterange("periodStart","periodEnd",'[]') WITH &&)
  WHERE (status <> 'void');

-- INV-BILLING-15 (Q-BILL-1): force VND to be integer
ALTER TABLE "StudentInvoice"  ADD CHECK ("totalAmount" = trunc("totalAmount")
                                     AND "paidAmount"  = trunc("paidAmount"));
ALTER TABLE "TuitionPayment"  ADD CHECK (amount = trunc(amount));
ALTER TABLE "StudentTuitionRate" ADD CHECK ("rateAmount" = trunc("rateAmount"));

-- Q-BILL-11: audit columns for void (if no separate audit table)
ALTER TABLE "StudentInvoice" ADD COLUMN "voidedAt" timestamptz,
                             ADD COLUMN "voidedBy" uuid REFERENCES "User"(id),
                             ADD COLUMN "voidReason" text;
ALTER TABLE "StudentInvoice" ADD CHECK ((status = 'void') = ("voidedAt" IS NOT NULL));

-- Q-BILL-4: idempotency table (shared with spec 05)
CREATE TABLE "IdempotencyKey" (
  key text PRIMARY KEY, endpoint text NOT NULL, "actorId" uuid NOT NULL,
  "requestHash" text NOT NULL, "responseStatus" int, "responseBody" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now());
```

**C2-dependent migration** (don't run before C2 is locked): if resolved purely per ADR-008,
`StudentTuitionRate.effectiveTo` is a dead column → either DROP (breaking for the FE contract if
FE already reads it), or keep and add `CHECK ("effectiveTo" IS NULL)` to forbid writes. If
resolved per the ENTITY doc, an UPDATE mechanism must be added and **INV-BILLING-01, 02, 04, 05,
§6.2, §7 TX-BILL-D, §8.5 entirely rewritten**.

**Seed for testing money and conflicts** (direct DB INSERT; figures taken from the FE fixture
`admin-tuition-rates.spec.md` §6 so both lanes share one dataset):

1. **2 admins** `role=admin, status=active` (A1, A2) — to test two-admin conflicts.
2. **S1 "Nguyễn Minh Anh"** — 2 rates: `2200000.00` from `2026-01-01`, `2500000.00` from
   `2026-03-01`. **The centerpiece student of every C2 test and rate-selection test.**
3. **S2 "Hoàng Văn Nam"** — 2 rates: `2500000.00` from `2026-01-01`, `2800000.00` from
   `2026-06-01`.
4. **S3 "Mai Tuấn Kiệt"** — **no rate at all** (tests INV-BILLING-03 and preview's
   `outcome = no_rate`).
5. **S4** — first rate `2500000.00` from `2026-09-01` (i.e. **not yet in effect** at
   `periodStart = 2026-08-01` → tests INV-BILLING-03's "has a rate but not yet in effect"
   branch).
6. **S5** — a `role='teacher'` user mistakenly used as `studentId` (tests INV-BILLING-08).
7. Invoice **I1** of S1, period `2026-09-01..09-30`, `totalAmount=2500000.00`,
   `paidAmount=0.00`, `unpaid` — the main subject of payment tests.
8. Invoice **I2** of S1, period `2026-08-01..08-31`, `totalAmount=2500000.00`,
   `paidAmount=1000000.00`, `partially_paid`, with 1 payment `1000000.00` — tests the
   `1500000.00` balance.
9. Invoice **I3**, fully `paid` (`paidAmount = totalAmount = 2500000.00`, 2 payments) — tests
   INV-BILLING-20 (void rejected) and recording another payment being rejected.
10. Invoice **I4**, `void`, `paidAmount = 500000.00`, 1 payment — tests INV-BILLING-18/19 and the
    "void holding money" query.
11. Invoice **I5** of S1, period `2026-09-15..10-14` — **overlapping** with I1, used to test
    INV-BILLING-30 (currently creatable → proving the gap; must be blocked after EXCLUDE is on).
12. A payment with `transactionReference = 'FT26248TEST01'` — to test INV-BILLING-27 by
    re-recording that exact string against another invoice.

## 13. Security & rate limit

- **Never return**: `User.passwordHash`, `User.email`, `User.lastLoginAt`, `User.bio`,
  `User.hskLevelGoal`. Use explicit `select` on every `include`; **forbidden** bare
  `include: { student: true }` and `include: { recordedBy: true }` (INV-BILLING-34).
- **Tuition money is personal financial data**: `rateAmount`, `totalAmount`, `paidAmount`,
  `amount` must **not** go into `info`-level logs, APM trace attributes, or analytics events.
  Only in the access-controlled audit table and in `Notification.payload` (in the DB, sent to
  its owner).
- **`transactionReference` is bank data**: never log the full string; if logging is needed for
  reconciliation debugging, mask the middle (`FT26***01`). Never in URLs, never in query params
  (URLs land in every proxy layer's access log).
- **`recordedBy` always from the token** (INV-BILLING-24). No parameter records on someone's
  behalf — the signature on a financial voucher.
- **Audit mandatory, immutable, non-deletable** for: `record_payment`, `void`, `create_invoice`,
  `batch_create`, `set_rate`. Each row records `actorId`, `entityId`, `action`, the amount at
  that moment, `paidAmountAfter`/`statusAfter` (for payments), `reason` (for void), `at`, `ip`.
  **The payment and void audits are the only accounting vouchers** when confronting parents.
- **IDOR**: currently every endpoint is admin-only so no risk; but when the student route opens
  (SCOPE-BILL-01), `studentId` **must** come from the token and sit in the WHERE — **not** from a
  query param, **not** by reusing the admin handler.
- **Proposed rate limits** (`API_CONVENTIONS.md` has no rate-limit section → Q-BILL-17):
  `POST /admin/invoices/:id/payments` **20 req/min/admin**; `POST /admin/invoices` 30/min;
  `POST /admin/tuition-rates` 20/min; `PATCH /:id/void` 20/min; **`POST /admin/invoices/batch`
  2/min** (heavy transaction touching hundreds of rows, sending N notifications each run);
  `POST .../batch/preview` 10/min; the `GET`s 60/min. Over → 429 — ⛔ no 429 code in the
  registry.
- Validate uuid **before** querying to avoid Prisma errors leaking schema details into
  responses.
- **No four-eyes**: one admin can create an invoice → record it fully paid → void it. See
  Q-BILL-15.

## 14. Observability

**Logs** (structured; **without** money amounts — §13):

- `billing.invoice.create.attempt` / `.success` / `.duplicate` / `.no_rate` — `{ actorId, studentId, periodStart, periodEnd }`. `.no_rate` **level ERROR** (missing data blocks issuance).
- `billing.payment.record.attempt` / `.success` / `.rejected_overpay` / `.rejected_void` / `.rejected_paid` — `{ actorId, invoiceId, paymentMethod }`. The three `rejected_*` branches **level WARN**.
- `billing.payment.lock_wait` — `{ invoiceId, waitMs }` when waiting for `FOR UPDATE` > 200ms → sign of two admins operating on top of each other.
- `billing.invoice.void` — `{ actorId, invoiceId, statusBefore, hadPayments: boolean }` — **level WARN when `hadPayments = true`**.
- `billing.rate.create.success` / `.rejected_backdate` — `{ actorId, studentId, effectiveFrom }`.
- `billing.batch.*` — `{ actorId, periodStart, periodEnd, requested, created, failed, skipped }`.

**Metrics**:

- **`billing_paidamount_drift_gauge`** — rows returned by the L4 cross-check query (§11).
  **MUST ALWAYS = 0.** This is the **module's most important metric**: it's the only way to
  detect INV-BILLING-09 breaking, and it breaks silently — nobody complains until end-of-period
  reconciliation.
- `billing_integrity_violations_gauge{check}` — rows of the other 4 cross-check queries (§11):
  `status_mismatch`, `overpaid`, `decimal_residue`, `period_overlap`. Must = 0 (except
  `period_overlap` until Q-BILL-14 is locked).
- `billing_payment_rejected_total{reason}` — `reason ∈ {overpay, void, paid, not_found}`. A
  sudden `overpay` spike = FE letting users enter over-balance amounts (UX bug) **or** two admins
  contending (operations bug) — distinguished via `billing_payment_lock_wait_ms`.
- `billing_payment_lock_wait_ms` — histogram. Rising p99 = many admins operating on the same
  invoice.
- **`billing_void_with_payments_total`** — counter of invoices voided with `paidAmount > 0`.
  Every increment is **money the center holds with no refund process** (Q-BILL-5). Alert from the
  first increment, no threshold.
- `billing_invoice_overdue_gauge` — invoices `unpaid|partially_paid` with `dueDate < today`, plus
  `billing_overdue_amount_gauge`.
- `billing_invoice_unbilled_students_gauge` — `active` students **without an invoice** for the
  current period. Rising = students missed from the issuance cycle — the kind of error nobody
  reports until end of period.
- `billing_students_without_rate_gauge` — `active` students with no `StudentTuitionRate` at all.
  This number blocks batch (§7 TX-BILL-E).
- `billing_batch_duration_ms` / `billing_batch_partial_failure_total`.

**Alerts**: `billing_paidamount_drift_gauge > 0` (**highest severity, page a human**);
`billing_integrity_violations_gauge > 0`; `billing_void_with_payments_total` increasing;
`billing_invoice_unbilled_students_gauge > 0` after the issuance date; `billing_payment_rejected_total{reason="overpay"}`
p95 rising abnormally.

## 15. Test matrix

`svc` = unit service · `int` = integration via HTTP + **real DB** · `db` = direct on **real DB**
· `conc` = **concurrency on the real DB, multiple connections**.

> **EVERY money test and EVERY concurrency test runs on REAL PostgreSQL (testcontainer or a
> dedicated test DB). MOCKING Prisma IS FORBIDDEN.** Concrete reasons, not general principles:
> (1) `Decimal`/`numeric` behavior — rounding, scale overflow, comparisons — can't be reproduced
> on a mock; (2) `CHECK`/`UNIQUE`/partial indexes are the module's **last line of defense**
> (§8.1 L3); a mock always lets them through and tests go green on a broken system;
> (3) `FOR UPDATE`, lock ordering, and `READ COMMITTED`'s WHERE re-evaluation (§7) **are the only
> mechanisms** keeping INV-BILLING-09/10 correct — a mock has no lock concept. Those three things
> are exactly the three that make money wrong.
>
> **Mandatory global assertion**: the **entire** suite's `afterEach` runs the first 3 cross-check
> queries in §11 and asserts they are **empty**. A test that breaks INV-BILLING-09 fails at that
> test, not bleeding into later ones.

| INV | Type | Test description |
|---|---|---|
| INV-BILLING-01 | **int (real DB)** | S1 has rates `2200000` from `2026-01-01` and `2500000` from `2026-03-01`. Invoice period `2026-02-01..02-28` → `totalAmount = "2200000.00"`. Period `2026-03-01..03-31` → `"2500000.00"` (boundary: **exactly on `effectiveFrom` the new rate applies**). Period `2026-04-01..04-30` → `"2500000.00"`. **Decisive case**: today `2026-08-19`, create invoice for period `2026-01-01..01-31` → must be `"2200000.00"` (rate at `periodStart`), **NOT** `"2500000.00"` (current rate). **Future case**: S2 has `2500000` from `01-01` and `2800000` from `2026-06-01`; today `2026-05-20` create invoice for `2026-06-01..06-30` → must be `"2800000.00"`, **NOT** `"2500000.00"` — i.e. anchored on `periodStart`, not `now()`. |
| INV-BILLING-02 | **int (real DB)** | Create invoice for S1 period `2026-09-01..09-30` → `2500000.00`. Then INSERT rate `3000000.00` from `2026-09-01`… (blocked by INV-BILLING-05) → use `2026-10-01` instead. Re-read the invoice → `totalAmount` **unchanged**. Assert no job/endpoint can change it: compare `updatedAt` before/after. |
| INV-BILLING-03 | **int (real DB)** | S3 (no rate) → `POST /admin/invoices` returns 400 `INVOICE_NO_TUITION_RATE`; assert `COUNT("StudentInvoice")` **unchanged** and **no** notification created. S4 (rate from `2026-09-01`, period `2026-08-01..08-31`) → same result. **No fallback**: assert no invoice with `totalAmount = 0` is ever created. |
| INV-BILLING-04 | int | No `PATCH`/`DELETE /admin/tuition-rates/:id` route (route 404, not 403). After 5 POSTs, `COUNT("StudentTuitionRate")` grew exactly 5 and **no old record's `updatedAt` changed**. |
| INV-BILLING-05 | int (real DB) | S1 already has `effectiveFrom = 2026-03-01`: POST `2026-02-01` → 400 `RATE_EFFECTIVE_DATE_IN_PAST`; POST `2026-03-01` (equal) → 400; POST `2026-03-02` → 201. |
| INV-BILLING-06 | **conc** | Two connections INSERT rates for S1 with **the same `effectiveFrom`**, different `rateAmount` (`2600000` vs `2700000`) → exactly **1** success, 1 gets 409. Disable the UNIQUE → the test **must fail** (proving the constraint is necessary, not decorative). Repeat ≥ 50 rounds. |
| INV-BILLING-07 | int + db | `rateAmount` = `0`, `-1`, `"abc"`, `"100.999"`, `"100000000.00"` (overflow `Decimal(10,2)`) → 400. `billingCycle = "per_class"` → 400. DB: CHECK blocks `rateAmount <= 0`. |
| INV-BILLING-08 | int (real DB) | `studentId` pointing at S5 (`role='teacher'`) or an admin → 400 with `details.studentId`. Nonexistent `studentId` → 404 `USER_NOT_FOUND`. Applies to both `POST /admin/tuition-rates` and `POST /admin/invoices`. |
| **INV-BILLING-09** | **int + db + conc** | (a) New invoice → `paidAmount = "0.00"`. (b) Record 1, 2, 3 payments → after **each**, `paidAmount` = the exact sum of recorded `amount`s. (c) After **every** suite test, the L4 cross-check query (§11) is empty. (d) **conc**: 10 connections recording `100000.00` payments on a `2500000.00` invoice, 50 rounds → final `paidAmount` = `100000 × (number of successful requests)` **to the cent**, and `= SUM(payments)`. (e) Inject an error between the payment INSERT and the invoice UPDATE → after rollback: 0 new payments, `paidAmount` unchanged. |
| **INV-BILLING-10** | **int (real DB)** | Invoice `2500000.00`, `paidAmount = 0`: `amount = "2500000.00"` → 201, `status='paid'`. New invoice: `amount = "2500000.01"` → 400 `INVOICE_PAYMENT_EXCEEDS_TOTAL`; `amount = "0"` → 400; `amount = "-100000.00"` → 400; `amount = "0.00"` → 400. Invoice I2 (`paidAmount=1000000`, balance `1500000`): `"1500000.00"` → 201 `paid`; `"1500000.01"` → 400; `"1500001.00"` → 400. After each 400: assert **0 new `TuitionPayment` rows** and `paidAmount` unchanged. |
| INV-BILLING-11 | **db** | `UPDATE "StudentInvoice" SET "paidAmount" = "totalAmount" + 1` → CHECK blocks. `SET "paidAmount" = -1` → CHECK blocks. This tests **the DB constraint**, run as direct SQL bypassing the service — its exact purpose is proving the last line of defense exists. |
| **INV-BILLING-12** | **int + db** | Matrix: `paidAmount=0` → `unpaid`; `=1đ` → `partially_paid`; `= total − 1đ` → `partially_paid`; `= total` → `paid`. After void: further recordings blocked, `status` stays `void` regardless of `paidAmount`. **db**: `UPDATE ... SET status='paid' WHERE "paidAmount"=0` → CHECK blocks; `SET status='unpaid'` when `paidAmount>0` → CHECK blocks. The `status_mismatch` cross-check query (§11) is empty after the whole suite. |
| INV-BILLING-13 | int + db | `POST /admin/invoices` with `totalAmount = "0.00"` → 400. `"-100.00"` → 400. **db**: INSERT `totalAmount = 0` → CHECK blocks. State the reason in the test name: a 0-cent invoice would be `paid` at creation, contradicting ENTITY "status = unpaid on creation". |
| **INV-BILLING-14** | **int (real DB)** | (a) Every money field in **every** response is `string`, not `number` — checked via `typeof` over all 10 endpoints' payloads. (b) No field shaped `{"s":1,"e":6,"d":[...]}` (a `Prisma.Decimal` leaking raw into JSON). (c) Static test: grep + lint rule forbidding `Number(`, `parseFloat(`, `+`/`-`/`*` on Decimal-typed variables in the module directory. (d) Rate `"999999.99"` × recording 3 payments `"333333.33"` → `paidAmount = "999999.99"`, `status='paid'` — not a single cent lost. |
| INV-BILLING-15 | **db** *(PROPOSED)* | The `decimal_residue` query (§11) is empty. Once the CHECK `= trunc()` is enabled: INSERT `amount = "1000.50"` → blocked. **Before Q-BILL-1 is locked, this test runs in report mode (doesn't fail the build) but must still print the violating row count.** |
| INV-BILLING-16 | int | `outstandingAmount` in every response = `totalAmount − paidAmount` to the cent. No `outstandingAmount` column exists in the schema (check `information_schema.columns`). Sending `outstandingAmount` in a request body → stripped, no error. |
| INV-BILLING-17 | **int (real DB)** | 4-status × 2-action matrix (record payment, void): `unpaid`+payment(partial) → `partially_paid`; `unpaid`+payment(full) → `paid`; `partially_paid`+payment(full) → `paid`; `unpaid`+void → `void`; `partially_paid`+void → `void`; `paid`+void → **409**; `paid`+payment → **409**; `void`+void → **409**; `void`+payment → **409**. After each 409, the DB is unchanged (compare `updatedAt` and `COUNT(TuitionPayment)`). |
| **INV-BILLING-18** | **int + db + conc** | Invoice I4 (`void`): `POST .../payments` → 409 `INVOICE_ALREADY_VOID`, and **`COUNT("TuitionPayment" WHERE "invoiceId" = I4)` unchanged** (proving step 3's INSERT rolled back). **db**: run TX-BILL-A step 4's UPDATE directly on the voided invoice → `affectedRows = 0` (proving the condition lives in the WHERE, not just the service). **conc**: void and payment fired concurrently, 50 rounds → always exactly one side wins; a payment pointing at a `void` invoice created **after** the void instant never exists. |
| INV-BILLING-19 | int + db | Void I2 (`paidAmount = 1000000.00`, 1 payment) → after void: `paidAmount` still `"1000000.00"`, `COUNT(payments) = 1`, the payment has not changed a single field (compare the whole row before/after). The "void holding money" query (§11) returns **exactly 1 row** → assert the `billing_void_with_payments_total` metric increments by 1. |
| INV-BILLING-20 | int (real DB) | Void I3 (`paid`) → 409 `INVOICE_ALREADY_PAID`; `status` stays `paid`. **db**: `UPDATE ... SET status='void' WHERE id=I3 AND status IN ('unpaid','partially_paid')` → `affectedRows = 0`. |
| INV-BILLING-21 | int | No `PATCH /admin/invoices/:id` and `DELETE /admin/invoices/:id` routes (route 404). Sending `totalAmount`, `periodStart`, `dueDate`, `studentId` in `/void` and `/payments` bodies → stripped; re-reading the invoice shows the fields **unchanged**. |
| INV-BILLING-22 | int | Sending `paidAmount`, `status` in `POST /admin/invoices` and `POST .../payments` bodies → stripped (not 400). Created invoices always have `paidAmount = "0.00"`, `status = "unpaid"` regardless of body. |
| **INV-BILLING-23** | **int + db** | No `PATCH`/`DELETE /admin/invoices/:id/payments/:paymentId` routes (route 404). After recording a payment: re-read and assert `updatedAt === createdAt`. Record 2 more payments then re-read the first → **every field exactly as at creation**. **db**: `DELETE FROM "TuitionPayment"` is blocked only by operational convention (no constraint can block DELETE — state clearly in the test that this is a **known gap**, protected only by audit and backups). |
| INV-BILLING-24 | int (real DB) | Sending `recordedBy` = another admin's id in the body → stripped; the record has `recordedBy = actor.id`. A `status='suspended'` admin's token → 403, no payment created. |
| INV-BILLING-25 | int + db | No endpoint accepts `invoiceId` in `POST /admin/invoices/:id/payments`'s body (taken from the path). **db**: `UPDATE "TuitionPayment" SET "invoiceId" = <other>` has no API path; if run by hand, the L4 cross-check query (§11) must immediately catch it on **both** invoices — this test runs that exact query to prove the detection mechanism works. |
| INV-BILLING-26 | int | `paidAt` = `now() + 1 hour` → 400 `VALIDATION_ERROR`. `paidAt` = `now() + 2 minutes` → 201 (within tolerance). `paidAt` = `2026-01-01T00:00:00Z` (far past) → 201. |
| INV-BILLING-27 | **conc** *(PROPOSED)* | Record a payment with `transactionReference = 'FT26248TEST01'` against I1 → 201. Record **the same string** with the same `paymentMethod` against I2 → 409. `transactionReference = null` twice → **both 201** (the partial index only applies when NOT NULL). **conc**: two connections with the same string → exactly 1 succeeds. |
| **INV-BILLING-28** | **conc** | Two connections both `POST /admin/invoices` for S1 period `2026-09-01..09-30`: exactly **1** invoice in the DB, 1 response 201, 1 response 409 `INVOICE_PERIOD_DUPLICATE`, and **exactly 1** `new_invoice` notification. Repeat ≥ 50 rounds. Void that invoice then re-create the same period → **201** (the partial index allows re-issuance). Create a third time while the second is alive → 409. |
| INV-BILLING-29 | int + db | `periodEnd < periodStart` → 400. `dueDate < periodStart` → 400. **db**: CHECK blocks both. |
| INV-BILLING-30 | **db** *(PROPOSED)* | With seed I1 (`09-01..09-30`) and I5 (`09-15..10-14`) for the same S1: the `period_overlap` query (§11) returns **1 row** → proving the gap currently exists. After EXCLUDE is enabled: INSERT I5 blocked; adjacent `09-01..09-30` + `10-01..10-31` → **allowed**; same period but **different student** → allowed; an overlapping `void` invoice → allowed (the `WHERE status <> 'void'` clause). |
| INV-BILLING-31 | **int (real DB)** *(PROPOSED)* | Snapshot `COUNT` of `StudentInvoice`, `TuitionPayment`, `Notification`, `StudentTuitionRate` and each table's `MAX(updatedAt)` before/after calling `POST .../batch/preview` **10 times** with a 40-student list → **not a single number changes**. |
| INV-BILLING-32 | int | 10 endpoints × {teacher token, student token, admin `status='suspended'`, admin `status='pending'`, no token} → 403/403/403/403/401. Also test the case of an unexpired token whose admin was just suspended (checked at the service, not the guard). |
| INV-BILLING-33 | int | No student route for invoices exists (confirming SCOPE-BILL-01). When opened: student A calling `GET` with `?studentId=<B>` → only receives A's invoices (param ignored), not 403 — proving the filter lives in the WHERE. |
| INV-BILLING-34 | int | Match every key of **every** response against a whitelist; assert no `passwordHash`, `email`, `lastLoginAt`, `bio`, `hskLevelGoal` at any depth (including inside `payments[].recordedBy`). |

**Rounding cases — exact expected figures** (run on the real DB; these are the cases that break
if anyone touches the arithmetic):

| # | Scenario | Exact expectation |
|---|---|---|
| R1 | Invoice `2500000.00`; payments `1000000.00` then `1500000.00` | After P1: `paidAmount="1000000.00"`, `partially_paid`, `outstanding="1500000.00"`. After P2: `paidAmount="2500000.00"`, `paid`, `outstanding="0.00"` |
| R2 | Invoice `2500000.00` split into **3 equal parts** | `2500000 / 3 = 833333.3333…` → each payment `"833333.33"`. After 3 payments: `paidAmount = "2499999.99"`, `status = "partially_paid"` (**NOT** `paid`), `outstanding = "0.01"`. **The 4th payment must be `"0.01"` to close the invoice** — but `0.01 ₫` **doesn't exist in VND cash**. This case proves Q-BILL-1: the invoice is permanently stuck at `partially_paid` |
| R3 | Continue R2, 4th payment = `"0.02"` | 400 `INVOICE_PAYMENT_EXCEEDS_TOTAL` (exceeds by `0.01`). Payment `"0.01"` → 201, `paidAmount = "2500000.00"`, `paid` |
| R4 | If Q-BILL-1 locks "integer VND": split 3 | `833333 + 833333 + 833334 = 2500000` → `paid`, `outstanding = "0.00"`, **0 residue**. The division must give the remainder to the last payment, not spread evenly |
| R5 | Rate `"999999.99"`, 3 payments `"333333.33"` | `paidAmount = "999999.99"` to the cent, `paid`. If anyone used float: `333333.33 × 3 = 999999.9899999999` → test fails |
| R6 | Invoice `2500000.00`, payment `"2500000.001"` | 400 `VALIDATION_ERROR` (> 2 decimal places) — **must not** be rounded to `2500000.00` and accepted |
| R7 | Payment `"100000000.00"` (over `TuitionPayment.amount`'s `Decimal(10,2)` cap) | Must be **400 `VALIDATION_ERROR`**, **not** a 500 from PostgreSQL numeric overflow. This case exposes the schema asymmetry: `totalAmount` is `Decimal(12,2)` (cap ~10 billion) but `amount` is `Decimal(10,2)` (cap ~100 million) → **an invoice over 100 million can't be paid in one payment**, forced to split. Q-BILL-1 |
| R8 | **C2 — two SQL queries, two amounts** | Today `2026-08-19`. S1: rate `2200000` from `01-01`, `2500000` from `03-01`. Invoice for period `2026-01-01..01-31`: **ADR-008 query** (`effectiveFrom <= periodStart ORDER BY DESC LIMIT 1`) → `"2200000.00"`. **ENTITY query** (`effectiveTo IS NULL OR effectiveTo > today`) → `"2500000.00"`. **300,000 ₫/invoice drift**; with 40 students that's **12,000,000 ₫ per period**. This test must exist and must **fail** until C2 is locked — it's the alarm bell |
| R9 | **C2 — rate gap** | Rate A `2200000` from `01-01` with `effectiveTo = 2026-02-28`; rate B `2500000` from `2026-04-01`. Invoice for period `2026-03-01..03-31`: **ADR-008 query** → picks A → `"2200000.00"` (applies a rate that was closed). **ENTITY query** → no active rate → **400 `INVOICE_NO_TUITION_RATE`**, no invoice. Two outcomes differing in **kind**: one side issues an invoice, the other refuses |

**Additional non-INV tests** (still mandatory):

- **Idempotency (Q-BILL-4)**: same `Idempotency-Key` + same body sent twice to `POST
  .../payments` → **1** payment in the DB, the second response **identical** to the first. Same
  key + different body (`amount` differs) → 422. Same body + different keys → **2** payments
  (correct, those are two real payments).
- **TX-BILL-A atomic rollback**: inject errors at steps 4 and 5 → after rollback: 0 new payments,
  `paidAmount` unchanged, 0 audit rows.
- **TX-BILL-B atomic rollback**: inject an error at step 4 (notification) → **0 invoices**
  created. Proving the notification lives inside the transaction.
- **Deadlock (§8.7)**: two batches with overlapping student lists running in parallel with
  **reversed** lock orders → reproduce `40P01`; after forcing `ORDER BY studentId` → no deadlock
  in 100 rounds.
- **N+1 gate**: enable query logging — `POST .../batch/preview` with 40 students → **≤ 6 total
  queries**; `GET /admin/invoices` with 20 rows → ≤ 4 queries; `GET /admin/invoices/:id` with 5
  payments → ≤ 3 queries; `GET /admin/invoices/summary` → **1 query**. The thresholds are CI
  gates.
- **Envelope**: success responses match `{ data }` / `{ data, meta }`; errors match the **flat
  7-field** envelope; `details` **only** on `VALIDATION_ERROR` (and on
  `INVOICE_BATCH_PARTIAL_FAILURE` if Q-BILL-3 resolves that way — currently a **convention
  violation**, recorded in Q-BILL-3).
- **C5 envelope `data.rate`**: assert the response shape matches the FE page contract, not just
  API_CONVENTIONS.

## 16. Unresolved

| # | Question | What it blocks | Owner | Decide by |
|---|---|---|---|---|
| **Q-BILL-1** 🔴 | **Money representation — BLOCKS THE WHOLE MODULE.** Three separate issues in one: **(a) Unit.** Entities use `Decimal(10,2)`/`Decimal(12,2)`, i.e. allow 2 decimal places. **VND has no subunit** — no "cent". Measurable consequence in case R2 (§15): a `2,500,000 ₫` invoice split three ways becomes `833,333.33 × 3 = 2,499,999.99` → `0.01 ₫` residue **nobody can pay in cash** → the invoice is permanently stuck at `partially_paid`, and since payments are immutable there's **no way out**. Must lock: `Decimal(x,0)`? keep `(x,2)` + CHECK `= trunc()`? or switch everything to integer VND? Each choice is a different migration. **(b) Serialization.** `Prisma.Decimal` **must not leak straight into a JSON response** — it's a `Decimal.js` object whose JSON shape depends on version and config, and anyone accidentally `Number(x)`-ing it along the way loses precision. A global Decimal → string interceptor/serializer and a lint rule forbidding `Number`/`parseFloat` in the module are needed. Neither exists. **(c) Scale asymmetry.** `TuitionPayment.amount` is `Decimal(10,2)` (cap ~99,999,999.99) but `StudentInvoice.totalAmount` is `Decimal(12,2)` (cap ~9,999,999,999.99): **an invoice over 100 million can't be paid with a single payment**, and if a client sends such a number the error is a PostgreSQL numeric overflow (500), not a 400 (case R7). | **BLOCKS THE WHOLE MODULE** — every endpoint reads or writes money; §4.2, §12, §15 all depend | BE lead + PO + accounting | **before any line of this module's code** |
| **C2** 🔴 | **Append-only vs `effectiveTo` — two SQL queries, two amounts.** `ADR-008` (status **Accepted**, summarized in `_FACTS.md`) says: change a rate = **CREATE A NEW RECORD** with a new `effectiveFrom`, **no update endpoint, no delete**, and the rate-lookup query is `WHERE effectiveFrom <= <date> ORDER BY effectiveFrom DESC LIMIT 1` — **`effectiveTo` is never used**. But `ENTITY_STUDENT_TUITION_RATE.md` says: *"To update rate: **set `effectiveTo` on current**, create new with new `effectiveFrom`"* and *"Active rate = where `effectiveTo IS NULL` or `effectiveTo > today`"* — i.e. the old row **IS updated**, and anchored on **`today`**, not `periodStart`. **Both can't be true.** Measurable consequence: case **R8** (§15) — the same 01/2026-period invoice comes out `2,200,000 ₫` per ADR-008 and `2,500,000 ₫` per ENTITY; **300,000 ₫/invoice** drift, 40 students = **12 million/period**. Case **R9** — with a rate gap, ADR-008 **issues** the invoice while ENTITY **refuses** to. Two structural consequences: (a) if `effectiveTo` is written, `StudentTuitionRate` stops being append-only → §8.5 and §6.2 must be redesigned; (b) INV-BILLING-01/02/04/05, §7 TX-BILL-D must be rewritten. **This spec tentatively locks per ADR-008** — reasoning: the ADR is Accepted while the ENTITY doc isn't an ADR; `API_ADMIN.md` states outright "Both rate endpoints are read-only history views over **append-only tables** (see ADR 008) — no PATCH, no DELETE"; and the FE page contract describes the rate history **only via `effectiveFrom` + a `current` flag**, no `effectiveTo`. **This is a tentative lock, not a decision.** | **BLOCKS §4.1** — the rate-selection logic can't be coded; drags `POST /admin/invoices` and the whole batch with it | BE lead + PO + ADR-008 author | **before any line of this module's code** |
| **Q-BILL-2** 🔴 | **Tuition model.** `billingCycle` currently has **one** value `monthly`, and `ENTITY_STUDENT_TUITION_RATE` states outright: *"Tuition model (per-class / monthly flat / package) must be agreed before Sprint 7"*; `pages/_INDEX.md` ranks this **pending decision #1**, blocking `/admin/tuition-rates` and **all invoicing**. If **per-class** is locked: the amount depends on actual class attendance → the module must read `ClassEnrollment` + `ClassSession` + `SessionAttendance` (currently §1 says "not touched"), `totalAmount` can no longer derive from a single rate, and INV-BILLING-01 changes in kind. If **package** is locked: invoice periods stop being months → `periodStart`/`periodEnd` change meaning, `billingCycle` needs a new enum value (migration), and "package installments" spawns a payment-schedule model that doesn't exist. **Locking after coding means rewriting §3, §4.1, §7 and all of batch.** | Enum `billingCycle`; INV-BILLING-01/07; `GET /admin/tuition-rates` (PROPOSED); all 4 batch/summary endpoints | PO | **before Sprint 3** |
| **Q-BILL-3** 🔴 | **Batch partial failure: all-or-nothing or per-item?** Both options fully analyzed in §7 TX-BILL-E with gains/losses. The `INVOICE_BATCH_PARTIAL_FAILURE` (422) code already exists in the registry described as *"Batch generation **partly failed** — `details` lists the failed student IDs"* → the source doc **leans per-item**, but that code isn't approved and `details` on a non-`VALIDATION_ERROR` branch **violates `API_CONVENTIONS.md`** ("`details` is present only on `VALIDATION_ERROR`"). **The spec proposes option B + a mandatory pre-check phase**, not deciding itself. Sub-questions: response 201 or 207 or 200-with-classification? Does `Idempotency-Key` store the whole-batch or per-item result? | `POST /admin/invoices/batch` entirely; FE `/admin/invoices/generate` step 3; §9 (the `details` envelope) | BE lead + PO + FE lead | **before Sprint 3** |
| **Q-BILL-5** 🔴 | **Voiding an invoice that has payments — what then? How to refund?** Currently: void **doesn't** reset `paidAmount`, **doesn't** delete payments (INV-BILLING-19) → a `void` invoice exists while the center holds student money. The system has **no way at all** to represent returning it: `amount > 0` is invariant (INV-BILLING-10) so no negative payments; payments are immutable (INV-BILLING-23) so no deletion; no `Refund` table, no `status = 'refunded'`. Three options: (a) **hard block** — forbid void when `paidAmount > 0` (needs a new error code ⛔); (b) **allow void, record the debt off-system** — the status quo, i.e. the books live only in admins' heads; (c) **add a refund mechanism** — a new table or relax `amount` to allow negatives (breaks INV-BILLING-10 and every CHECK). Directly related: a `paid` invoice **can't be voided** (INV-BILLING-20) → a mistakenly created, fully collected invoice is an **absolute dead end**. | §4.3; §6.1; metric `billing_void_with_payments_total`; real operations process | PO + accounting | **before Sprint 3** |
| **Q-BILL-6** 🔴 | **Overpayment: hard-block or allow-with-credit?** Source docs mildly contradict themselves: `ENTITY_TUITION_PAYMENT` says `amount ≤ (totalAmount − paidAmount)` (**hard block**), but `ENTITY_STUDENT_INVOICE` defines `paid` as `paidAmount **>=** totalAmount` — the `>=` only means something if `>` can happen. The spec tentatively locks **hard block** (INV-BILLING-10 + CHECK constraint). But in reality: a student over-transfers 50,000 ₫, or pays two months in one transfer — today the admin **can't record it** and must ask for a re-transfer. Switching to "allow + credit" means: the CHECK `paidAmount <= totalAmount` must be **removed** (losing the last line of defense), a student balance/credit concept is needed (new table), and auto-application rules to next period's invoice are needed. **Changing after real data exists = a migration removing a constraint on a money table.** | INV-BILLING-10/11; CHECK constraint §12; §8.1 layer L3 | PO + accounting | **before Sprint 3** |
| **Q-BILL-4** | **`Idempotency-Key`**: `API_CONVENTIONS.md` has **no idempotency section at all**. Standardize a header + `IdempotencyKey` table system-wide (shared with spec 05), or billing-only? What error code for "key duplicate, body differs" (⛔ none)? For batch, store the whole-batch or per-item response (intersects Q-BILL-3)? | §8.2, §8.3; migration §12; `POST .../batch` | BE lead | before Sprint 3 |
| **Q-BILL-7** | **Can `totalAmount` be overridden?** ENTITY calls the rate the *"**default** totalAmount"* → implies editable. But `StudentInvoice` **has no `rateId` column** and no `rateAmountSnapshot` → an overridden invoice **can't be explained by any rate**, and even a non-overridden invoice can only be traced by re-running the SELECT (which yields a different result if C2 resolves the other way). Three options: forbid override (needs an error code ⛔); allow override + add `rateId` + `overrideReason` columns; allow override and accept untraceability. Directly impacts reconciliation when parents question amounts. | §3.3; INV-BILLING-01/02; reconciliation ability | PO + BE lead | before Sprint 3 |
| **Q-BILL-8** | **3 notification types missing** (§10): no `payment_recorded`, no `invoice_voided`, no `tuition_rate_changed`. Combined with **SCOPE-BILL-01** (students have no invoice-view route) and RBAC denying students rate reads, a student **has no way to know**: how much they've paid, that an invoice was voided, that tuition changed. Adding types = enum migration of `Notification.type` + ADR. Student routes must open simultaneously (`GET /student/invoices`, `GET /student/invoices/:id`) — otherwise `new_invoice` keeps deep-linking to a nonexistent page. | §10; SCOPE-BILL-01; INV-BILLING-33; student lane | PO + BE lead | before Sprint 4 |
| **Q-BILL-9** | **C5 — envelope shape.** The FE page contract says `data.rate` (and `data.invoice` the same way); `API_CONVENTIONS.md` says flat `{ "data": {...} }`. When they drift, FE receives `undefined` **with no HTTP error** — the hardest kind of bug to trace. **One** convention must be locked system-wide, not billing-only. | All of §3; FE contract of the 4 billing screens | BE lead + FE lead | **before locking the contract** |
| **Q-BILL-10** | Is `dueDate` client-required, or server-defaulted (`periodEnd + N days`)? If defaulted, what's N and who sets it? Directly affects `overdue` and `billing_invoice_overdue_gauge`. | §3.3; §14 | PO | before Sprint 3 |
| **Q-BILL-11** | **Void can't store its reason.** `StudentInvoice` has no `voidReason`/`voidedAt`/`voidedBy`. Add 3 columns (migration §12) or audit-only? **And the audit table has no ENTITY doc** even though §7, §13 and INV-BILLING-19/24 all depend on it — the payment audit is the only accounting voucher. Table name, owner? (overlaps spec 05's Q-PAY-13) | §3.6; §12; §13 | BE lead | before Sprint 3 |
| **Q-BILL-12** | **Timezone of `dueDate`/`overdue`.** `periodStart`/`periodEnd`/`dueDate`/`effectiveFrom` are `Date` (no timezone); `paidAt` is **UTC** `DateTime`. Classes and fee collection run on VN time (UTC+7). An invoice with `dueDate = 2026-09-30` is marked overdue when `now() > 2026-09-30T00:00Z`, i.e. **07:00 a.m. on the 30th VN time** — a student is considered late **on the due date itself**. The `overdue` comparison must anchor on the VN local date, not UTC. (Same issue cluster as spec 05's Q-PAY-1.) | §3.4 `overdue` filter; §14 overdue metrics | BE lead | before Sprint 3 |
| **Q-BILL-13** | `paymentMethod` is **free-form** `varchar(50)`, ENTITY only gives examples. Free-form means `bank_transfer`, `Bank Transfer`, `chuyển khoản` all coexist → per-method reports become meaningless, and INV-BILLING-27 (unique on `paymentMethod` + `transactionReference`) is **neutralized** because the same transaction recorded with two spellings slips through. Lock a whitelist (enum or CHECK) or keep free-form? | §3.7; INV-BILLING-27; reports | PO + BE lead | before Sprint 3 |
| **Q-BILL-14** | Prevent overlapping-period invoices: enable `EXCLUDE USING gist` (needs `btree_gist`, needs cleaning existing overlapping data first)? Without it, accept that a student can be billed twice for the overlapping part of two periods — INV-BILLING-28 **doesn't catch it**. Needs a new error code ⛔. | INV-BILLING-30; migration §12; §9 | BE lead + DBA | before Sprint 3 |
| **Q-BILL-15** | Split roles "invoice issuer" ≠ "payment recorder" ≠ "voider" (four-eyes for cash)? Today one admin can do all three, and `paymentMethod = 'cash'` is a money path leaving no bank trace. | §5; §13 | PO | before Sprint 4 |
| **Q-BILL-16** | Preview-to-batch drift (§8.3): require a `previewHash` to guarantee the amount approved on screen equals the amount written? Without it, `/admin/invoices/generate` step 2 is decorative. | §8.3; `POST .../batch` | BE lead + FE lead | before Sprint 3 |
| **Q-BILL-17** | `API_CONVENTIONS.md` has no rate-limit section; the registry has no 429 code. §13 is proposing both. | §13; §9 | BE lead | Sprint 4 |
| **C1** | `User.nickname` (ENTITY_USER) vs `fullName` (API_AUTH). Which field do `studentName` (§3.2–3.5) and `recordedBy.name` (§3.5, §3.7) read? | FE contract of the 4 billing screens | BE lead | before locking the contract |

**Reverse dependency**: the module can't run end-to-end without `role='student',
status='active'` users (spec 02) and rates for them. Batch only makes sense when **every** active
student has a rate — the `billing_students_without_rate_gauge` metric (§14) is exactly the
blocking number.
