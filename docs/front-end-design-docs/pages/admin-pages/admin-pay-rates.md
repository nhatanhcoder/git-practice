---
feature: A-PAY-1
role: admin
route: /admin/pay-rates
status: contracted
last_updated: 2026-08-11
---

# Page Contract — Admin · Teacher Pay Rates

## Purpose
Set each teacher's per-session or per-hour rate, and keep the rate history intact.

## Access
- Allowed roles: admin
- Ownership rule: none
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Payroll" → "Mức lương"; payroll period detail when a teacher has no rate
- Deep link: yes — `?teacherId=`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| set rate | `POST /api/v1/admin/pay-rates` | `data.rate` |

Blocked on: **no list endpoint.** `GET /api/v1/admin/pay-rates` (by teacher, with
history) is absent from API_ADMIN.md. FEATURES_ADMIN A-PAY-1 also flags the unit
basis as undecided ("cần chốt cách tính đơn giá").

## Regions
1. Page title + primary action "Thiết lập mức lương"
2. Rate table — teacher, rateType (per_session / per_hour), amount, effectiveFrom
3. History drawer — on row click, past rates in date order

## States
- [ ] Loading — table skeleton
- [ ] Ready
- [ ] Empty — no rates set → "Chưa thiết lập mức lương cho giáo viên nào" + CTA
- [ ] Partial — N/A
- [ ] Error — inline retry
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Set rate | primary button / row "Đổi mức" | modal: teacher, rateType, amount (VND), effectiveFrom → appends new rate | `USER_NOT_FOUND`, `TODO(error-code)` |

The modal must show what `per_hour` actually means before it is picked: billed hours
round **up to the nearest 0.5h** (FLOW_PAYROLL_CYCLE §3). A teacher paid per hour for
a 50-minute session is paid for 1.0h — surface that at selection time, not in support.

## Out of scope
- Deleting a rate — finalized payroll periods depend on it
- Per-class rate overrides — not in FEATURES_ADMIN
