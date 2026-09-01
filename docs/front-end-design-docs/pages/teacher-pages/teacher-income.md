---
feature: T-INC-1, T-INC-2, T-INC-3
role: teacher
route: /teacher/income
status: contracted
last_updated: 2026-09-01
---

# Page Contract — Teacher · Income

## Purpose
See what was earned from approved sessions, per payroll period — view only.

## Access
- Allowed roles: teacher
- Ownership rule: own PayrollPeriods only (RBAC: PayrollPeriod read = 🔒 teacher)
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Thu nhập"
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| payroll periods | `GET /api/v1/teacher/payroll` | `data[]` |
| period detail | `GET /api/v1/teacher/payroll/:id` | `data.period`, `data.sessions[]` |

Blocked on: none for this screen (both endpoints in API_TEACHER.md). Money values are
display-only — no arithmetic client-side beyond the mock.

## Regions
1. Page title ("Thu nhập") + month summary strip — 3 stats: kỳ hiện tại (status), buổi được
   duyệt, tổng đã nhận (year-to-date paid)
2. Data table — period (month), status pill (`draft`/`finalized`/`paid`), sessions in period,
   rate, total
3. Period drawer — header (month, status), per-session rows (date, class, topic, amount),
   footer total

## States
- [ ] Loading — table skeleton; drawer own skeleton
- [ ] Ready
- [ ] Empty — no periods yet → "Chưa có kỳ lương nào" (explain: appears after admin creates one)
- [ ] Partial — N/A
- [ ] Error — inline retry
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open period | row click | drawer with per-session breakdown | — |

## Out of scope
- Any mutation — create/finalize/pay are Admin-only (A-PAY-4,5); rate setting is Admin (A-PAY-1)
- Pay-rate editing or display of the rate-setting UI
- Withdrawal / transfer features — not in any doc
