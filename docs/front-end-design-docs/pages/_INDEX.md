---
status: active
owner: Nhật
last_updated: 2026-08-14
---

# Page Contracts — Index

> Produced by `ai/skills/flow-mapper.md`. One row per screen.
> Contracts live in `<role>-pages/`; this index spans all roles and stays at `pages/` root.
> **Check here first** — if a route already has a contract, reuse it; do not regenerate.
> Page status: `contracted` → `designed` → `built`.
> This is the **page** axis. The matching `specs/**/*.spec.md` files carry their own
> `status: ready-for-design`, which tracks the *spec document*, not the screen.
> The two are deliberately independent — do not try to keep them in sync.

---

## Admin

**▶ [Admin UI Flow + API Map](./admin-pages/admin-flow.md)** — screen-to-screen traversal, every action mapped to its endpoint. Read this first; the table below is the per-screen detail.

> **Design column** = the design baseline the *shipped code* follows. Current baseline is in
> `root-design-fe.md` frontmatter (`design_baseline`). A version lower than that means the
> screen still looks like an older design — fine, update it later. `—` means not built yet,
> so there is nothing to be behind. Only `/design-promote <screen>` changes this column.

| Route | Feature | Contract | Status | Design | Blocked on |
|---|---|---|---|---|---|
| `/admin` | A-DASH-1,2,4 | [admin-dashboard](./admin-pages/admin-dashboard.md) | contracted | — | stats payload shape |
| `/admin/users` | A-USER-1,2,3 | [admin-users-list](./admin-pages/admin-users-list.md) | built | v1 | — |
| `/admin/users/[userId]` | A-USER-4 | [admin-user-detail](./admin-pages/admin-user-detail.md) | built | v1 | role-dependent history payload (mocked in `lib/user-detail-data.js`) |
| `/admin/invoices` | A-INV-4 | [admin-invoice-list](./admin-pages/admin-invoice-list.md) | built | v2 | collection-summary endpoint |
| `/admin/invoices/generate` | A-INV-2 | [admin-invoice-generate](./admin-pages/admin-invoice-generate.md) | built | v2 | preview + batch endpoints |
| `/admin/invoices/[invoiceId]` | A-INV-3,5 | [admin-invoice-detail](./admin-pages/admin-invoice-detail.md) | built | v2 | embedded `payments[]` |
| `/admin/tuition-rates` | A-INV-1 | [admin-tuition-rates](./admin-pages/admin-tuition-rates.md) | contracted | — | **billing model undecided** |
| `/admin/payroll/sessions` | A-PAY-2,3 | [admin-session-review](./admin-pages/admin-session-review.md) | built | v2 | attendance summary in payload |
| `/admin/payroll` | A-PAY-4,7 | [admin-payroll-list](./admin-pages/admin-payroll-list.md) | built | v2 | period boundary undecided |
| `/admin/payroll/[periodId]` | A-PAY-5,6,7 | [admin-payroll-detail](./admin-pages/admin-payroll-detail.md) | contracted | — | **no `GET /admin/payroll/:id`** |
| `/admin/pay-rates` | A-PAY-1 | [admin-pay-rates](./admin-pages/admin-pay-rates.md) | contracted | — | no list endpoint; unit basis undecided |
| `/admin/monitoring` | A-DASH-3 | [admin-monitoring](./admin-pages/admin-monitoring.md) | contracted | — | **all of it** — see contract |
| `/admin/profile` | A-AUTH-4,5,6 | [admin-profile](./admin-pages/admin-profile.md) | built | v1 | — (endpoints defined in [API_AUTH.md](../../api/API_AUTH.md)) |

## Teacher
_Not yet mapped._

## Student
_Not yet mapped._

---

## Admin function flow (summary — full traversal in [admin-flow.md](./admin-pages/admin-flow.md))

```
Login ──► /admin  (Dashboard)
            │  KPI tiles double as the work queue
            │
            ├─► ACCOUNTS
            │     /admin/users ──► /admin/users/[userId]
            │        approve · suspend · reactivate
            │
            ├─► BILLING
            │     /admin/tuition-rates          (prerequisite — set rate first)
            │            │
            │            ▼
            │     /admin/invoices/generate      (batch, one month)
            │            │
            │            ▼
            │     /admin/invoices ──► /admin/invoices/[invoiceId]
            │                            record payment · void
            │        unpaid ─► partially_paid ─► paid
            │
            ├─► PAYROLL
            │     /admin/pay-rates              (prerequisite — set rate first)
            │            │
            │            ▼
            │     /admin/payroll/sessions       (approve/reject teacher submissions)
            │            │  approved sessions only
            │            ▼
            │     /admin/payroll ──► /admin/payroll/[periodId]
            │        draft ─► finalized ─► paid
            │
            └─► MONITORING
                  /admin/monitoring             (read-only, blocked on T-GRADE-3)
```

**Two hard orderings.** Both financial branches have a prerequisite screen: no invoice
can be generated before a `StudentTuitionRate` exists, and no payroll period is
meaningful before a `TeacherPayRate` exists. Each branch's empty state links back to
its rate screen rather than dead-ending.

**Two one-way gates.** `session → approved` and `period → finalized` cannot be undone
in the UI. Both confirm modals must say so in words.

## Open decisions blocking build

| # | Decision | Blocks | Source |
|---|---|---|---|
| 1 | Tuition model — per class / package / month | `/admin/tuition-rates`, all invoicing | FEATURES_ADMIN A-INV-1 |
| 2 | Pay-rate unit basis | `/admin/pay-rates`, payroll totals | FEATURES_ADMIN A-PAY-1 |
| 3 | Payroll period boundary (calendar month?) | `/admin/payroll` create | FEATURES_ADMIN A-PAY-4 |
| 4 | Gemini key model — shared vs per teacher | `/admin/monitoring` entirely | UC-A-005 |
| 5 | Reject-registration behaviour — delete or hold pending | `/admin/users` | UC-A-001 Alternative |

## Missing API surface

Raise these under `## Needs from the other lane` in `ai/PROGRESS.md`:

All of these are now written down under
[`API_ADMIN.md` § Referenced by FE contracts, not yet defined](../../api/API_ADMIN.md)
with a proposed shape, so the two lanes agree on *what is missing*. **None are agreed
or implemented** — a BE owner still has to sign each one off:

- `GET /api/v1/admin/payroll/:id` — period detail + per-session breakdown
- `GET /api/v1/admin/pay-rates` — rate list + history
- `GET /api/v1/admin/tuition-rates` — rate list + history
- `POST /api/v1/admin/invoices/batch` — batch generation (partial-failure semantics undecided)
- `POST /api/v1/admin/invoices/batch/preview` — dry run for `/admin/invoices/generate` step 2
- `GET /api/v1/admin/monitoring/gemini`
- `INVOICE_*`, `RATE_*`, `SESSION_*`, `AI_*` error codes — drafted in
  [`API_ERROR_CODES.md`](../../api/API_ERROR_CODES.md), each marked *proposed, not agreed*
