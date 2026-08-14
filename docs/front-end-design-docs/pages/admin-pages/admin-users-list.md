---
feature: A-USER-1, A-USER-2, A-USER-3
role: admin
route: /admin/users
status: built
last_updated: 2026-08-14
---

# Page Contract — Admin · Accounts

## Purpose
Find any account and move it between pending / active / suspended.

## Access
- Allowed roles: admin
- Ownership rule: none (all users, all roles)
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: sidebar "Accounts"; Dashboard KPI "Chờ duyệt"; notification
  `new_teacher_registration` / `new_student_registration`
- Deep link: yes — filters are URL params (`?status=pending&role=teacher&q=`)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| user list (paginated) | `GET /api/v1/admin/users` | `data[]`, `meta` |
| approve | `PATCH /api/v1/admin/users/:id/approve` | `data.user` |
| suspend | `PATCH /api/v1/admin/users/:id/suspend` | `data.user` |
| reactivate | `PATCH /api/v1/admin/users/:id/activate` | `data.user` |

Blocked on: `last_login_at` column does not exist on User yet
(FEATURES_ADMIN A-USER-1). Render the column as "—" until F1.2 adds it.

## Regions
1. Page title + filter toolbar (role, status, search by name/email)
2. Data table — name, email, role, status badge, registered, last login, row actions

## States
- [ ] Loading — table skeleton, toolbar interactive immediately
- [ ] Ready
- [ ] Empty — no users match → "Không có tài khoản nào khớp" + clear-filters CTA
- [ ] Partial — N/A (single query)
- [ ] Error — inline retry above the table, filters preserved
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Approve | row action "Duyệt" | confirm modal → optimistic badge → toast "Đã duyệt" | `USER_ALREADY_APPROVED`, `USER_NOT_FOUND` |
| Suspend | row action "Khóa" | modal **requires reason** (UC-A-004) → badge → toast "Đã khóa" | `USER_NOT_FOUND` |
| Reactivate | row action "Mở khóa" | confirm modal → badge → toast "Đã mở khóa" | `USER_NOT_FOUND` |
| Open detail | row click | `/admin/users/[userId]` | — |

## Out of scope
- Bulk approve — not in FEATURES_ADMIN; do not add
- Reject/delete account — UC-A-001 Alternative is undecided; needs a decision first
- Editing another user's name/email (Admin may read, not edit — PERMISSIONS_ADMIN)
