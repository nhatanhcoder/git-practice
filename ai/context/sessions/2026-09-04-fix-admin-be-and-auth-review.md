## [2026-09-04] — Fix Admin BE & Auth Concurrency, State Machine, Lost Response Recovery, Rate Limit, and RBAC Alignment — Antigravity — branch `feat/s1-teacher-classes-api`

**Context**:
Addressed all initial 10 review findings on commit `c4bfbdb` and the 4 follow-up critical/warning issues regarding test scoping, grace window cookie recovery on lost response, invariant guards on grace branch, login rate limiting mechanism, and RBAC matrix documentation sync.

**Done**:
1. **User Account Status Lifecycle & Concurrency**:
   - Enforced strict state machine: `pending` → `active` → `suspended` → `active`.
   - Replaced non-atomic queries with atomic conditional updates (`updateMany({ where: { id, status: sourceStatus } })`).
   - Added `USER_ALREADY_SUSPENDED` (409), `USER_ALREADY_ACTIVE` (409), `USER_INVALID_STATUS_TRANSITION` (400) error codes.
2. **Refresh Token Atomic Rotation & Lost Response Recovery (01-auth.md §8 Proposal A)**:
   - Atomic rotation: parent `revokedAt`, `revokedReason = 'rotated'`, `replacedById` set in the exact same interactive transaction as child creation with conditional `where: { id, revokedAt: null }`.
   - In-memory `rotationCache` with 15s TTL returns exact same child raw refresh token cookie during grace period, recovering session if initial rotation response dropped.
   - Enforced invariant checks before and within grace window: `expiresAt` expiry can never be undone (`AUTH_TOKEN_EXPIRED`), and suspended/pending accounts are strictly rejected (`AUTH_ACCOUNT_SUSPENDED`, `AUTH_ACCOUNT_PENDING`).
   - Re-presenting rotated token outside grace window revokes entire family with `401 AUTH_REFRESH_INVALID`.
   - Updated `POST /auth/logout` to return `204 No Content`.
3. **Login Rate Limiting**:
   - Implemented in-memory sliding window rate limiter in `AuthService`: max 5 failed attempts per 15 minutes per `(ip, normalizedEmail)`.
   - Blocks on 6th attempt with `429 AUTH_TOO_MANY_REQUESTS`.
4. **RBAC Matrix Alignment**:
   - Updated `docs/shared/RBAC_MATRIX.md` and `docs/actors/admin/PERMISSIONS_ADMIN.md` to grant Admin read-only audit access (`👁️`) for `Class` and `ClassEnrollment` (roster), closing the contradiction with `03-classes-enrollment.md`.
5. **Exception Filter Fix**:
   - Removed status override `if (status !== 404) status = 500`. Preserves client HTTP statuses for bare `HttpException`.
   - Standardized error field to canonical HTTP reason phrase using `http.STATUS_CODES[status]`.
6. **Production Start Script Fix**:
   - Changed `apps/api/package.json` `start` and `start:prod` to `node dist/src/main.js`.
7. **E2E Test Suites & Targeted DB Scoping**:
   - Scoped `refresh-token-concurrency.e2e.test.ts` to specific `tokenHash`.
   - Scoped `admin-approval-concurrency.e2e.test.ts` cleanup to exact array of tracked `createdUserIds`.
   - Added assertions for: single active child token in family, usable cookie recovery, grace rejection on expired/suspended accounts, and login rate limiting (429).
8. **Verification**:
   - `pnpm --filter api test`: **75/75 tests pass** (14 suites).
   - `node --test apps/web/scripts/*.test.mjs`: **39/39 tests pass** (7 suites).
   - `pnpm --filter web build`: **31/31 static pages build cleanly**.
   - `node scripts/check-docs.mjs`: **8/8 checks pass**.
