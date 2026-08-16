---
feature: A-INV-1
role: admin
route: /admin/tuition-rates
status: built
design_baseline: v2
last_updated: 2026-08-16
---

# Page Contract — Admin · Student Tuition Rates

## Purpose
Set what each student pays per period, and keep the history of past rates readable.

## Access
- Allowed roles: admin
- Ownership rule: none
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Billing" → "Học phí"; empty state of `/admin/invoices/generate`
- Deep link: yes — `?studentId=`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| set rate | `POST /api/v1/admin/tuition-rates` | `data.rate` |

Blocked on: **no list endpoint.** `GET /api/v1/admin/tuition-rates`
(filterable by student, returning rate history) does not exist in API_ADMIN.md.
Also unresolved: FEATURES_ADMIN A-INV-1 says the billing model itself
("theo lớp / gói / tháng") is **not yet decided**. This screen cannot be built
correctly until it is — treat that as the real blocker, not the endpoint.

## Regions
1. Page title + primary action "Thiết lập học phí"
2. Rate table — student, current rate, effectiveFrom, set-by, set-at
3. History drawer — on row click, all past rates for that student in date order

## States
- [ ] Loading — table skeleton
- [ ] Ready
- [ ] Empty — no rates set → "Chưa thiết lập học phí cho học sinh nào" + CTA
- [ ] Partial — N/A
- [ ] Error — inline retry
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Set rate | primary button / row "Đổi mức" | modal: student, amount (VND), effectiveFrom → **appends** a new rate, never edits the old one | `USER_NOT_FOUND`, `TODO(error-code)` |

Rates are append-only history. The UI must present this as "set a new rate from a
date", never as "edit the rate" — a past invoice must stay explainable by the rate
that was in effect when it was issued.

## Out of scope
- Deleting a rate — would orphan the invoices computed from it
- Class-level or package pricing — blocked on the A-INV-1 model decision above
