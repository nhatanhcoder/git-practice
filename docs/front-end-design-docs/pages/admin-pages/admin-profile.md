---
feature: A-AUTH-4, A-AUTH-5, A-AUTH-6
role: admin
route: /admin/profile
status: contracted
last_updated: 2026-08-11
---

# Page Contract — Admin · My Profile

## Purpose
Let the Admin change their own name, email, avatar and password.

## Access
- Allowed roles: admin
- Ownership rule: self only — this screen never edits another account
  (that is `/admin/users/[userId]`, which is read-only for profile fields)
- On denial: redirect to `/login`, toast `AUTH_INSUFFICIENT_ROLE`

## Entry points
- From: header avatar menu → "Hồ sơ"
- Deep link: yes

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| — | — | — |

Blocked on: profile and password endpoints are not in API_ADMIN.md. They are shared
across all roles and belong in `docs/api/API_AUTH.md` — confirm they exist there
(`GET/PATCH /api/v1/auth/me`, `PATCH /api/v1/auth/password`, avatar upload) and
reference them rather than adding admin-specific routes.

## Regions
1. Page title
2. Profile form — avatar upload, full name, email
3. Password form — current password, new password, confirm (separate card, separate submit)

## States
- [ ] Loading — form skeleton
- [ ] Ready
- [ ] Empty — N/A (a logged-in user always has a profile)
- [ ] Partial — N/A
- [ ] Error — field-level errors from `VALIDATION_ERROR.details` mapped into react-hook-form
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Save profile | form submit | toast "Đã lưu hồ sơ" | `VALIDATION_ERROR`, `AUTH_EMAIL_EXISTS` |
| Change password | form submit | toast "Đã đổi mật khẩu" | `VALIDATION_ERROR`, `AUTH_INVALID_CREDENTIALS` |
| Upload avatar | file picker | optimistic preview, revert on failure | `USER_AVATAR_UPLOAD_FAILED` |

Two forms, two submits. Never one "Lưu" button covering both — a password change
must not be a side effect of renaming yourself.

## Out of scope
- Changing own role or status
- Session/device management — not in FEATURES_ADMIN
