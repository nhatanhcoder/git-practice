---
feature: TODO(feature-id) — FEATURES_TEACHER.md has no Dashboard section (unlike Admin's A-DASH-*)
role: teacher
route: /teacher
status: built
last_updated: 2026-09-01
---

# Page Contract — Teacher · Dashboard

## Purpose
Land after login and jump straight into a class.

## Access
- Allowed roles: teacher
- Ownership rule: none (aggregates only the teacher's own classes, scoped server-side)
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: post-login redirect for role=teacher; sidebar logo
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| own class list (for the preview cards) | `GET /api/v1/teacher/classes` | `data[]` |

Blocked on: no dashboard-aggregation endpoint exists — `API_TEACHER.md` has no Dashboard
section at all. Grading queue, income and weak-student KPI tiles (the Admin-dashboard pattern)
all depend on features not built until S3/S5/S6 — see Out of scope. This contract only covers
what S2 can actually support.

## Regions
1. Page title + greeting ("Chào, {name}")
2. "My Classes" — card grid, one card per class (name, HSK level, student count, status badge),
   max 6 shown + "Xem tất cả" link to `/teacher/classes`
3. Primary action — "Tạo lớp mới" button, opens the create-class modal (see
   `teacher-classes-list.md` § Actions)

## States
- [ ] Loading — skeleton cards, 3 placeholders
- [ ] Ready
- [ ] Empty — no classes yet → "Chưa có lớp nào" + CTA "Tạo lớp đầu tiên"
- [ ] Partial — N/A (single query)
- [ ] Error — inline retry, page shell stays
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A (no offline support in S0–S9)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Open class | card click | `/teacher/classes/[classId]` | — |
| Create class | "Tạo lớp mới" | same modal as `/teacher/classes` | `TODO(error-code)` |

## Out of scope
- Grading queue tile, income tile, weak-student alerts — no backing endpoint yet (S3/S5/S6).
  Add a KPI row here once those exist; do not mock the numbers now.
- Notification bell content — covered by the shared shell, not this page
