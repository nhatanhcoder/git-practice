---
feature: S-BILL-2
role: student
route: /student/invoices/[invoiceId]
status: built
last_updated: 2026-09-12
---

# Page Contract — Student · Invoice Detail

## Purpose
See one invoice's full breakdown — period, due date, total/paid/outstanding, status — and the payment history the center recorded against it.

## Access
- Allowed roles: `student`
- Ownership rule: `WHERE id = :invoiceId AND studentId = :actorId AND status <> 'void'` in one query — not read-then-check (INV-BILLING-33). Another student's invoice id → `INVOICE_NOT_FOUND` (indistinguishable from nonexistent)
- On denial: Student shell `RequireAuth` redirects to login

## Entry points
- From: `/student/invoices` row click
- Deep link: yes — this is the `new_invoice` notification's target (06-billing.md §10, Q-BILL-8)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Invoice + payments | `GET /api/v1/student/invoices/:id` | `data.invoice.payments[]` (`paidAt ASC, id ASC`) |

Money is decimal strings from the envelope; the FE renders, never subtracts. `recordedBy` shows only the recording admin's display name (INV-BILLING-34).

## Regions
1. Back link → `/student/invoices`
2. Header: invoice code, status chip, period, due date
3. Amount summary: total / paid / outstanding as separate tiles (server values, no arithmetic)
4. Payment history table: paidAt, amount, method, transactionReference (`—` when null), recordedBy name
5. Notice when invoice has no payments yet

## States
- [x] Loading — skeleton header + rows
- [x] Ready — invoice with payment history
- [x] Empty — N/A as page state (no-payments case is region 5 within Ready)
- [x] Partial — N/A (single primary dataset)
- [x] Error — failed fetch, inline retry
- [x] Invalid id — non-UUID `invoiceId` → not-found state without a network call
- [x] Not found / forbidden — `INVOICE_NOT_FOUND` → honest not-found state (never distinguishes "not yours" from "doesn't exist")
- [x] Offline / stale — network error wording; no fallback

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Back | back link | navigate to `/student/invoices` | — |
| Retry | Error state button | refetch detail | — |

## Out of scope
Recording a payment (Admin, A-INV-5), voiding, editing anything, contacting the center about an invoice.
