---
feature: A-PAY-4, A-PAY-7
role: admin
route: /admin/payroll
status: contracted
last_updated: 2026-08-11
---

# Page Contract — Admin · Payroll Periods

## Purpose
See every pay period and its state, and open a new draft for the month just closed.

## Access
- Allowed roles: admin
- Ownership rule: none
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Payroll"; Dashboard "Chi lương tháng này" KPI
- Deep link: yes — `?teacherId=` for A-PAY-7 (history by teacher)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| period list | `GET /api/v1/admin/payroll` | `data[]`, `meta` |
| create draft | `POST /api/v1/admin/payroll` | `data.period` |

Blocked on: period boundaries are undecided — FEATURES_ADMIN A-PAY-4 says
"kỳ lương tính theo tháng (cần chốt)". Until that is settled the create modal must
ask for explicit start/end dates rather than assuming calendar months.

## Regions
1. Page title + primary action "Tạo kỳ lương"
2. Filter — teacher, year
3. Period table — period range, teacher count, session count, total amount, status badge, row click → detail

## States
- [ ] Loading — table skeleton
- [ ] Ready
- [ ] Empty — no periods yet → "Chưa có kỳ lương nào" + CTA to create the first
- [ ] Partial — N/A
- [ ] Error — inline retry
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Create draft | primary button | modal: date range → aggregates approved sessions → new period, status=draft → navigate to detail | `PAYROLL_PERIOD_NOT_FOUND` |
| Open period | row click | `/admin/payroll/[periodId]` | — |

Status badge colours come straight from root-design-fe §2.1:
`draft` → Info `#0284C7`, `finalized` → Warning `#D97706`, `paid` → Success `#16A34A`.

## Out of scope
- Finalize / mark-paid — detail page only, so the money-moving actions sit next to
  the numbers they act on
- Deleting a period — not in FEATURES_ADMIN
