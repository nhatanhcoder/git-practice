---
feature: S-BILL-1, S-BILL-2
role: student
route: /student/invoices
status: contracted
last_updated: 2026-09-12
---

# Page Contract — Student · Invoice List

## Purpose
View the learner's own tuition invoices (period, total, paid, outstanding, status) and open one to see its payment history — read-only; creation and recording are Admin-side (A-INV-2, A-INV-5).

## Access
- Allowed roles: `student`
- Ownership rule: `studentId` comes **only** from the token and sits in the query WHERE (INV-BILLING-33); `?studentId=` is not a parameter of this route. `status <> 'void'` — voided invoices are hidden from students (06-billing.md §5)
- On denial: Student shell `RequireAuth` redirects to login

## Entry points
- From: Student sidebar → "Học phí"; Student Dashboard → "Học phí" quick link
- Deep link: yes (`/student/invoices`)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| My invoices | `GET /api/v1/student/invoices` | `data[]` + `meta` |
| Invoice detail + payments | `GET /api/v1/student/invoices/:id` | `data.invoice` (embedded `payments[]`) |

Note: money fields (`totalAmount`, `paidAmount`, `outstandingAmount`) are decimal strings from the envelope — FE renders them, never computes. `outstandingAmount` is server-derived (INV-BILLING-16). Response must not carry the student's own email or any other user's data (INV-BILLING-34).

## Regions
1. Page Header: eyebrow "Học phí", title "Hóa đơn học phí", invoice count
2. Invoice table/cards: code, period (`periodStart`–`periodEnd`), due date, total, paid, outstanding, status chip; row links to `/student/invoices/[invoiceId]`
3. Pagination: `meta.totalPages` > 1

## States
- [x] Loading — skeleton rows while invoices are fetched
- [x] Ready — invoice list from the live endpoint
- [x] Empty — no non-void invoices yet; explains that the center issues invoices monthly
- [x] Partial — N/A (single primary dataset)
- [x] Error — failed fetch, inline retry, page shell stays
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open invoice | row click | navigate to `/student/invoices/[invoiceId]` | — |
| Retry | Error state button | refetch list | — |

## Out of scope
Paying, downloading, printing, disputing an invoice; viewing voided invoices (hidden by design); filtering by another student; any amount entry (Admin records payments).
