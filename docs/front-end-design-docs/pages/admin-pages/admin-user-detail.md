---
feature: A-USER-4
role: admin
route: /admin/users/[userId]
status: contracted
last_updated: 2026-08-11
---

# Page Contract — Admin · User Detail

## Purpose
Inspect one account's history before approving, suspending, or answering a query.

## Access
- Allowed roles: admin
- Ownership rule: none
- On denial: redirect to `/admin/users`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: `/admin/users` row click
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| profile + status | `GET /api/v1/admin/users/:id` | `data.user` |
| status transitions | same three PATCH routes as `/admin/users` | `data.user` |

Blocked on: `GET /admin/users/:id` must embed role-dependent history —
Student: `enrollments[]` + `attempts[]`; Teacher: `classes[]` + `sessions[]`.
Not specified in API_ADMIN.md. Confirm shape before build.

## Regions
1. Header — avatar, name, email, role, status badge, primary status action
2. Identity card — registered date, last login, account status
3. History panel — **role-dependent**:
   - Student → enrollments table + attempts table
   - Teacher → classes taught + session history
   - Admin → none, hide the panel entirely

## States
- [ ] Loading — header skeleton, history skeleton
- [ ] Ready
- [ ] Empty — user exists but no history → "Chưa có hoạt động nào" per sub-table
- [ ] Partial — profile shown, history still resolving (history is the slower join)
- [ ] Error — 404 → full-page not-found with back link, not an inline error
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Approve / Suspend / Reactivate | header button | same modals as list page | `USER_NOT_FOUND`, `USER_ALREADY_APPROVED` |

## Out of scope
- Session history placeholder stays empty until Sprint 5 (FEATURES_ADMIN A-USER-4) —
  render an explicit "Chưa khả dụng" panel, not a blank space
- Admin cannot edit another user's profile fields
