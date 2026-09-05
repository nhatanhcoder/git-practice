## [2026-09-03] — Module 01 Auth & Identity Implementation & Full E2E Verification — Antigravity — branch `feat/s1-auth-module`

**Context**:
User requested to work on the prioritized clean foundation after auditing Teacher API readiness.
`01-auth.md` is the only accepted backend module spec.
Previous scaffold in `apps/api` lacked RefreshToken DB model, Auth endpoints, and had uncommitted Foundation access control.

**Done**:
1. **Database & Schema Migration**:
   - Added `RefreshToken` model to `apps/api/prisma/schema.prisma` with `tokenHash`, `familyId`, `replacedById`, `revokedAt`, `revokedReason`, `expiresAt`.
   - Linked `RefreshToken` to `User` via cascade delete.
   - Applied migration `20260903151610_add_refresh_tokens` via `pnpm --filter api db:migrate`.
2. **Auth Service & Endpoints**:
   - `POST /api/v1/auth/register`: registration with `pending` status, bcrypt cost 12, admin self-registration forbidden (`INV-AUTH-01`, `INV-AUTH-03`).
   - `POST /api/v1/auth/login`: verifies password and account status (403 for `pending`/`suspended`), updates `lastLoginAt`, mints 15m access token and 7d httpOnly refresh cookie (`INV-AUTH-04`, `INV-AUTH-05`, `INV-AUTH-06`).
   - `POST /api/v1/auth/refresh`: single-use token rotation, detects replay attacks and revokes the entire token family (`INV-AUTH-06`, `INV-AUTH-07`).
   - `POST /api/v1/auth/logout`: revokes current refresh token and clears cookie.
   - `GET /api/v1/auth/me`: returns authenticated profile without leaking `passwordHash`.
   - `PATCH /api/v1/auth/me`: updates `nickname`, `avatarUrl`, `bio`.
   - `POST /api/v1/auth/change-password`: validates current password, hashes new password with cost 12, revokes all active sessions (`INV-AUTH-08`).
3. **Foundation Fixes**:
   - Solved decorator metadata stripping in test execution by compiling via `nest build` before `node --test`.
   - Handled query defaults safely in `users.service.ts` to prevent Prisma validation errors.
   - Registered `cookie-parser` globally in `main.ts`.
4. **Verification**:
   - `pnpm --filter api test`: **40/40 tests passed** (including 23 access control/admin users tests + 17 auth e2e tests).
   - `node --test apps/web/scripts/*.test.mjs`: **34/34 tests passed**.
   - `node scripts/check-docs.mjs`: **all 8 checks passed**.
   - `pnpm --filter api build`: **Passed cleanly**.
   - `pnpm --filter web build`: **Passed cleanly** (37/37 static pages generated).
