---
feature: A-INV-4
role: admin
route: /admin/invoices
status: contracted
last_updated: 2026-08-11
---

# Page Contract — Admin · Billing

## Purpose
See who has paid this period and who has not, and open any invoice to act on it.

## Access
- Allowed roles: admin
- Ownership rule: none (all students, system-wide)
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Billing"; Dashboard "Thu tháng này" KPI
- Deep link: yes — `?period=2026-08&status=unpaid`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| invoice list (paginated) | `GET /api/v1/admin/invoices` | `data[]`, `meta` |

Blocked on: the collection-summary numbers in FLOW_TUITION_VIETQR §4
("Đã thu 5/8 học sinh", tổng thu, còn nợ) have no endpoint. Either extend
`GET /admin/invoices` with a `meta.summary` block or add
`GET /admin/invoices/summary`. Decide before build.

## Regions
1. Page title + period selector (month) + primary action "Tạo hóa đơn tháng…"
2. KPI row — 3 tiles: Đã thu (n/total students), Tổng thu, Còn nợ
3. Invoice table — student, period, total, paid, outstanding, status badge, row click → detail

## States
- [ ] Loading — KPI + table skeleton
- [ ] Ready
- [ ] Empty — no invoices for the period → "Chưa tạo hóa đơn cho kỳ này" + CTA to generate
- [ ] Partial — table loaded, summary KPIs still resolving
- [ ] Error — inline retry, period selection preserved
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Generate month | primary button | `/admin/invoices/generate?period=` | — |
| Open invoice | row click | `/admin/invoices/[invoiceId]` | — |

## Out of scope
- Recording payment here — that is the detail page only, so every payment has one
  unambiguous screen and audit path
- Student-facing view (S-BILL-1) — different contract, different role
