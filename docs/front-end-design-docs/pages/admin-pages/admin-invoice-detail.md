---
feature: A-INV-3, A-INV-5
role: admin
route: /admin/invoices/[invoiceId]
status: built
design_baseline: v2
last_updated: 2026-08-16
---

# Page Contract — Admin · Invoice Detail

## Purpose
Reconcile one invoice — see what is owed, record a payment against it, or void it.

## Access
- Allowed roles: admin
- Ownership rule: none
- On denial: redirect to `/admin/invoices`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: `/admin/invoices` row click
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| invoice + payments | `GET /api/v1/admin/invoices/:id` | `data.invoice` |
| record payment | `POST /api/v1/admin/invoices/:id/payments` | `data.payment` |
| void invoice | `PATCH /api/v1/admin/invoices/:id/void` | `data.invoice` |

Blocked on: `GET /admin/invoices/:id` must embed `payments[]` — not stated in
API_ADMIN.md. Confirm before build.

## Regions
1. Header — student name, period, status badge, total / paid / outstanding
2. Payment history table — date, amount, method, transactionReference
3. Action bar — "Ghi nhận thanh toán", "Hủy hóa đơn"

## States
- [ ] Loading — header + history skeleton
- [ ] Ready
- [ ] Empty — no payments yet → "Chưa có thanh toán nào" inside the history table
- [ ] Partial — N/A (single query)
- [ ] Error — 404 → full-page not-found with back link
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Record payment | action bar | modal: amount, method, transactionReference → status recomputes unpaid→partially_paid→paid per FLOW_TUITION_VIETQR §1 | `TODO(error-code)` |
| Void invoice | action bar | confirm modal **requiring reason** → status=void | `TODO(error-code)` |

Status recompute is server-side. The UI must render whatever status the response
returns — it must never derive `paid` from `paid >= total` locally.

## Out of scope
- Editing `totalAmount` after issue — void and reissue instead
- VietQR generation (student-side screen, S-BILL-*)
