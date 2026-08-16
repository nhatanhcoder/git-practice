---
feature: A-DASH-1, A-DASH-2, A-DASH-4
role: admin
route: /admin
status: built
design_baseline: v2
last_updated: 2026-08-16
---

# Page Contract — Admin · Dashboard

## Purpose
Land after login and see what needs Admin action today, then jump to it.

## Access
- Allowed roles: admin
- Ownership rule: none (global scope)
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: post-login redirect for role=admin; sidebar logo
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| all dashboard counters | `GET /api/v1/admin/dashboard/stats` | `data` |

Blocked on: none. NOTE — `stats` must return, at minimum:
`pendingUsers`, `suspendedUsers`, `totalUsers`, `activeClasses`,
`pendingSessions`, `revenueThisMonth`, `payrollThisMonth`.
Confirm this shape before build (contract-first, multi-agent-workflow §4).

## Regions
1. Page title "Tổng quan"
2. KPI row — 4 tiles: Chờ duyệt (users), Buổi chờ duyệt, Thu tháng này, Chi lương tháng này
3. Action queue — two compact lists side by side: pending users (5 newest), pending sessions (5 newest), each row links to its review screen
4. Revenue vs payroll — line chart, 6 months

## States
- [ ] Loading — skeleton per region; KPI tiles skeleton independently of the chart
- [ ] Ready
- [ ] Empty — nothing pending → "Không có việc cần xử lý" + link to Users
- [ ] Partial — KPI resolved, chart still loading (chart is the slow query)
- [ ] Error — per-region inline retry; one failing region must not blank the page
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A (no offline support in S0–S9)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Go to pending users | KPI tile / queue row click | `/admin/users?status=pending` | — |
| Go to pending sessions | KPI tile / queue row click | `/admin/payroll/sessions` | — |

## Out of scope
- Gemini quota (lives on `/admin/monitoring`)
- Audit log / A-DASH-5 (🟢 Could, not contracted)
- No approve/reject action inline — the queue links out, it does not act
