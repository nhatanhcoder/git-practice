---
feature: A-DASH-3
role: admin
route: /admin/monitoring
status: built
design_baseline: v2
last_updated: 2026-08-16
---

# Page Contract — Admin · System Monitoring

## Purpose
Watch Gemini API consumption so grading does not silently fail on an exhausted quota.

## Access
- Allowed roles: admin
- Ownership rule: none
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Monitoring"
- Deep link: yes — `?range=week`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| — | — | — |

Blocked on: **everything.** No monitoring endpoint exists in API_ADMIN.md, and
UC-A-005 records an open decision — one shared Gemini key or one per teacher — that
changes what "quota remaining" even means. Do not build this screen until:
1. T-GRADE-3 (AI suggested score) is actually running, so the numbers are real
2. The key model is decided
3. `GET /api/v1/admin/monitoring/gemini` is specified

Contracted now only so the route and nav slot are reserved.

## Regions
1. Page title + range selector (day / week / month)
2. KPI row — 3 tiles: tổng lượt gọi, quota còn lại, cache hit ratio
3. Usage chart — calls over time, line
4. Breakdown table — by feature (AI suggested score, translation if added)

## States
- [ ] Loading — KPI + chart skeleton
- [ ] Ready
- [ ] Empty — **the expected state until T-GRADE-3 ships.** Render "Chưa có dữ liệu — tính năng chấm điểm AI chưa hoạt động", not zeroes. Zeroes read as a broken integration
- [ ] Partial — KPI resolved, chart pending
- [ ] Error — inline retry
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Change range | selector | refetch | — |

Quota below the warning threshold shows a red alert banner above the KPI row
(UC-A-005 step 3). Threshold value is undecided — do not hardcode one.

## Out of scope
- Supabase / MongoDB / R2 usage — not in A-DASH-3
- Audit trail (A-DASH-5, 🟢 Could)
- Any action that changes quota; this screen is read-only
