## [2026-09-03] — Admin FE (Users, User Detail, Profile) API Integration — Antigravity — branch `feat/s1-admin-fe-api`

**Context**:
User requested to continue Admin development ("làm tiếp cho admin đi").
Selected the recommended path to connect Admin frontend screens (`/admin/users`, `/admin/users/[userId]`, `/admin/profile`) to the real Backend API endpoints (`/api/v1/admin/users`, `/api/v1/admin/users/:id`, `/api/v1/auth/me`, `/api/v1/auth/change-password`).

**Done**:
1. **API Client & Services (`apps/web/src/lib/`)**:
   - Created `api-client.ts`: Universal fetch client supporting `{ data, meta }` flat envelope, cookie credentials for refresh tokens, `Authorization: Bearer <token>`, and `ApiError` mapping.
   - Created `admin-users-service.ts`: `fetchAdminUsers` with query parameters (`q`, `role`, `status`, `page`, `limit`, `sortBy`, `order`) and `fetchAdminUserDetail(id)`. Added resilient fallback for SSR / offline mode.
   - Created `auth-profile-service.ts`: `fetchMyProfile()`, `updateMyProfile()`, `changePassword()` with resilient fallback.
2. **Screen Integration**:
   - `apps/web/src/app/admin/users/page.tsx`: Wired `fetchAdminUsers` via `useEffect` hook, keeping all 7 review states and test assertions intact.
   - `apps/web/src/app/admin/users/[userId]/page.tsx`: Wired `fetchAdminUserDetail` via `useEffect` hook, updating user data dynamically from API.
   - `apps/web/src/app/admin/profile/page.tsx`: Wired `fetchMyProfile`, `updateMyProfile` (`PATCH /api/v1/auth/me`), and `changePassword` (`POST /api/v1/auth/change-password`) with real validation handling.
3. **Verification**:
   - `node --test apps/web/scripts/*.test.mjs`: 34/34 tests passed.
   - `pnpm --filter web build`: 31/31 static pages built cleanly with zero errors.
   - `pnpm --filter api test`: 40/40 tests passed.
   - `node scripts/check-docs.mjs`: 8/8 checks passed.
