## [2026-09-04] — Fix Admin BE & Auth Concurrency, State Machine, and Contract Alignment — Antigravity — branch `feat/s1-teacher-classes-api`

**Context**:
Addressed all 10 review findings on commit `c4bfbdb` across Admin Backend, Auth, Exception Handling, Scripts, and E2E Tests.

**Done**:
1. **User Account Status Lifecycle & Concurrency (Items 1 & 2)**:
   - Enforced strict state machine: `pending` → `active` → `suspended` → `active`.
   - Replaced non-atomic queries with atomic conditional updates (`updateMany({ where: { id, status: sourceStatus } })`).
   - Added `USER_ALREADY_SUSPENDED` (409), `USER_ALREADY_ACTIVE` (409), `USER_INVALID_STATUS_TRANSITION` (400) error codes.
2. **Refresh Token Atomic Rotation & Grace Window (Item 3 & Item 8)**:
   - Atomic rotation: parent `revokedAt`, `revokedReason = 'rotated'`, `replacedById` set in the exact same interactive transaction as child creation with conditional `where: { id, revokedAt: null }`.
   - Implemented 15-second grace window handling benign multi-tab burst refresh requests without false-positive replay lockouts.
   - Re-presenting rotated token outside grace window revokes entire family with `401 AUTH_REFRESH_INVALID`.
   - Updated `POST /auth/logout` to return `204 No Content` per `01-auth.md`.
3. **Exception Filter Fix (Item 7)**:
   - Removed status override `if (status !== 404) status = 500`. Preserves client HTTP statuses for bare `HttpException`.
   - Standardized error field to canonical HTTP reason phrase using `http.STATUS_CODES[status]`.
4. **Production Start Script Fix (Item 9)**:
   - Changed `apps/api/package.json` `start` and `start:prod` to `node dist/src/main.js`.
5. **Spec Alignment (Items 4 & 6)**:
   - Added `AUTH_TOO_MANY_REQUESTS` (429) to `API_ERROR_CODES.md` for login rate limiting proposal.
   - Formalized Admin read-only audit endpoints (`GET /admin/classes`, `GET /admin/classes/:id`) in `03-classes-enrollment.md`.
6. **E2E Test Suites (Item 10)**:
   - Added `apps/api/test/admin-approval-concurrency.e2e.test.ts` (race condition tests for concurrent approve/suspend).
   - Added `apps/api/test/refresh-token-concurrency.e2e.test.ts` (race condition tests for concurrent refresh & grace window).
   - Added invalid status transition tests in `admin-user-lifecycle.e2e.test.ts`.
7. **Verification**:
   - `pnpm --filter api test`: **72/72 tests pass** (14 suites).
   - `node --test apps/web/scripts/*.test.mjs`: **39/39 tests pass** (7 suites).
   - `pnpm --filter web build`: **31/31 static pages build cleanly**.
   - `node scripts/check-docs.mjs`: **8/8 checks pass**.
