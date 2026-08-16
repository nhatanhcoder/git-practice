---
feature: A-PAY-5, A-PAY-6, A-PAY-7
role: admin
route: /admin/payroll/[periodId]
status: built
design_baseline: v2
last_updated: 2026-08-16
---

# Page Contract — Admin · Payroll Period Detail

## Purpose
Check the computed pay for a period line by line, then finalize and mark it paid.

## Access
- Allowed roles: admin
- Ownership rule: none
- On denial: redirect to `/admin/payroll`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: `/admin/payroll` row click; redirect after creating a draft
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| finalize | `PATCH /api/v1/admin/payroll/:id/finalize` | `data.period` |
| mark paid | `PATCH /api/v1/admin/payroll/:id/pay` | `data.period` |

Blocked on: **no `GET /api/v1/admin/payroll/:id`.** This screen needs the per-session
breakdown that `calculatePeriodAmount` already builds (FLOW_PAYROLL_CYCLE §3:
sessionDate, className, duration, amount, per teacher). Add the endpoint before build.

## Regions
1. Header — period range, status badge, grand total, action bar
2. Per-teacher summary — teacher, rate applied (type + amount), session count, subtotal
3. Breakdown table — expandable per teacher: session date, class, duration, amount

## States
- [ ] Loading — header + breakdown skeleton
- [ ] Ready
- [ ] Empty — draft with zero approved sessions → "Không có buổi học được duyệt trong kỳ này"; finalize must be disabled
- [ ] Partial — header totals shown, breakdown still expanding
- [ ] Error — 404 → full-page not-found with back link
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Finalize | action bar, draft only | confirm modal stating the total and that it locks → status `finalized` | `PAYROLL_PERIOD_FINALIZED`, `PAYROLL_PERIOD_NOT_FOUND` |
| Mark paid | action bar, finalized only | confirm modal → status `paid`; member sessions → `paid` | `PAYROLL_PERIOD_NOT_FOUND` |

Both actions are one-way. The confirm modal must say so in words, not just ask
"Xác nhận?" (root-design-fe §4.5 — buttons name the action).
Finalize is hidden, not merely disabled, once status is `finalized` or `paid`.

## Out of scope
- Editing amounts or overriding a session's pay — rates drive the maths; fix the rate
  or the session, then recreate the draft
- Payment execution — the platform records that pay happened, it does not disburse
