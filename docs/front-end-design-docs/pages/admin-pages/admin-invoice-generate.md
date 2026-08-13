---
feature: A-INV-2
role: admin
route: /admin/invoices/generate
status: contracted
last_updated: 2026-08-11
---

# Page Contract — Admin · Generate Monthly Invoices

## Purpose
Issue one month of tuition invoices for every eligible student in a single reviewed run.

## Access
- Allowed roles: admin
- Ownership rule: none
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: `/admin/invoices` primary action
- Deep link: yes — `?period=2026-08`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| create one invoice | `POST /api/v1/admin/invoices` | `data.invoice` |

Blocked on: **two missing endpoints.**
1. Preview — need students with an active `StudentTuitionRate` for the period,
   their resolved amount, and whether an invoice already exists. No endpoint exists.
2. Batch commit — `POST /admin/invoices` is single-student. Either add
   `POST /admin/invoices/batch` (preferred — one transaction, one result set) or
   loop client-side and accept partial failure. **Needs a decision; raise under
   `## Needs from the other lane` in ai/PROGRESS.md.**

## Regions
Multi-step page, not a modal (root-design-fe §4.5 — long operation).
1. Step 1 — period selector + eligibility summary
2. Step 2 — preview table: student, rate applied, effectiveFrom, amount, already-invoiced flag; rows deselectable
3. Step 3 — confirm totals (student count, grand total) → run
4. Result panel — created / skipped / failed, per student, with retry for failures

## States
- [ ] Loading — preview table skeleton
- [ ] Ready
- [ ] Empty — no student has an active tuition rate → "Chưa thiết lập học phí" + link to `/admin/tuition-rates`
- [ ] Partial — **first-class here**: batch partially succeeded. Show per-row outcome; never a single all-or-nothing toast
- [ ] Error — whole run failed → keep the preview selection intact so it can be retried without re-picking
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Run generation | Step 3 confirm | invoices created (status=unpaid), students notified | `TODO(error-code)` — no `INVOICE_*` codes exist in API_ERROR_CODES.md |

## Out of scope
- Mid-month joiners / prorating — batch-only was chosen deliberately; a student who
  joins mid-period is handled by a later manual decision, not by this screen. **Known gap.**
- Editing tuition rates here — that is `/admin/tuition-rates`
