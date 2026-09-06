## [2026-09-06] — Student Shell Identity (A01 / WEB-015) — Codex / Antigravity — branch `codex/a01-student-shell-identity`

**Context**:
`WEB-015` recorded that opening `/student` as any authenticated student account (e.g. `demo.student2@hsk.local`)
greeted the user with **"Chào buổi tối, Mai Anh"** and rendered *Mai Anh* in the sidebar userchip and profile sheet.
The name was hardcoded mock data in `src/lib/student/mock-user.ts` / `store.ts`.

**Done**:
1. **`src/lib/student/identity-rules.ts`**:
   - Zero-dependency pure derivation `resolveIdentity(nickname)` and `initialsOf(name)`.
   - Explicit fallback to neutral student name `NEUTRAL_STUDENT_NAME = "Học viên"` (initials `"HV"`)
     when `nickname` is null, undefined, or blank.
   - Separate pure module allows `node --test` to run without ESM module resolution collisions with Next.js aliases.

2. **`src/lib/student/identity.ts`**:
   - Client hook `useDisplayIdentity()` reading `status` and `user.nickname` from `useAuthStore`.
   - Emits `ready: false` while `status !== "authenticated"`, signaling to callers that session restoration
     is ongoing and placeholders should be rendered rather than flashing fixture names.

3. **Dashboard Greeting (`apps/web/src/app/student/(app)/page.tsx`)**:
   - Replaced `profile.name` greeting with `identity.name.split(" ").slice(-2).join(" ")`.
   - While `!identity.ready`, renders an inline skeleton placeholder with `sr-only` text.

4. **Shell Userchip & Profile Sheet (`apps/web/src/components/student/student-shell.tsx`)**:
   - Replaced `profile.name` and `profile.initials` with `identity.name` and `identity.initials`.
   - While `!identity.ready`, renders skeleton elements with accessible screen-reader notices.
   - Progress figures (rank, level, xp, streak) deliberately kept as-is until backend endpoints exist.

5. **Test Coverage**:
   - Unit tests: `apps/web/scripts/student-identity.test.mjs` (name extraction, whitespace trimming, single-word, neutral fallback).
   - Integration spec: `apps/web/tests/student-identity.spec.ts` (skeleton during restore, authenticated rendering, neutral fallback).

**Verification**:
- `node --test apps/web/scripts/*.test.mjs`: **40/40 tests pass across 7 suites**.
- `node scripts/check-docs.mjs`: **all 8 checks passed**.
- `pnpm --filter web build`: **Exit 0, 42/42 static/dynamic pages compiled cleanly**.

**Impact on DB / Auth / RBAC / Money**:
- None. No schema migrations, backend Auth controller changes, RBAC policy changes, or financial logic modifications.
- Reads client-side `AuthUser.nickname` returned by existing `GET /api/v1/auth/me`.
