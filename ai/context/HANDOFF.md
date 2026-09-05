# HANDOFF.md — End-of-session notes

> Read the **most recent** entry (top of file) first when starting a new session.
> Unlike `docs/roadmap/SPRINT_PLAN.md` (sprint task checklist) and `docs/shared/decisions/` (long-lived ADRs) — this file only holds things that are **temporary and easy to forget**: what's in progress, why it's unfinished, which temporary decisions must be preserved.
>
> Keep a maximum of the 5 most recent entries — delete older ones (distant history already lives in git log + ADRs).
> 2+ agents running in parallel: each agent adds its own entry, clearly labeled by name in the heading.

---

## Template

```
## [YYYY-MM-DD] — <what's being worked on> — <Claude Code / Antigravity / manual>

**Done**:
-

**In progress**:
-

**Temporary decisions to preserve** (if any):
-

**Blocker / needs follow-up**:
-

**Next steps**:
-
```

---

## [2026-09-04] — Fix Admin BE & Auth Concurrency, State Machine, and Contract Alignment (Review on c4bfbdb) — Antigravity

**Context**:
Addressed all 10 review findings on commit `c4bfbdb` regarding account status lifecycle state machine, concurrency protection on user approval/suspension, atomic refresh token rotation with grace window, exception filter HTTP status preservation, and auth contract alignment.

**Done**:
1. **User Account Status Lifecycle & Concurrency (Criterion A1)**:
   - Enforced strict state machine: `pending` → `active` → `suspended` → `active`.
   - Replaced non-atomic queries with atomic conditional updates (`updateMany({ where: { id, status: sourceStatus } })`).
   - Added `USER_ALREADY_SUSPENDED` (409), `USER_ALREADY_ACTIVE` (409), `USER_INVALID_STATUS_TRANSITION` (400) error codes.
   - Guaranteed returned DTO reflects exact `targetStatus` of the atomic update, preventing interleaved update leakage.
   - Covered full 9-transition matrix (3 actions × 3 statuses), non-existent UUIDs (404), and malformed IDs (400) with DB immutability assertions.
2. **Refresh Token Atomic Rotation, Lost Response Recovery & Invariant Guards (Criterion A2)**:
   - Atomic rotation: parent `revokedAt`, `revokedReason = 'rotated'`, `replacedById` set in the exact same interactive transaction as child creation with conditional `where: { id, revokedAt: null }`.
   - Implemented `rotationCache` with 15-second TTL per `01-auth.md` §8 Proposal A: returns identical child raw refresh token cookie during grace period, allowing recovery if first rotation response was dropped.
   - Guarded grace window against expiry (`AUTH_TOKEN_EXPIRED`) and account suspension/pending (`AUTH_ACCOUNT_SUSPENDED`, `AUTH_ACCOUNT_PENDING`) on both parent and child tokens.
   - Re-presenting rotated token outside grace window revokes entire family with `401 AUTH_REFRESH_INVALID`.
   - Updated `POST /auth/logout` to return `204 No Content` per `01-auth.md`.
3. **Login Rate Limiting**:
   - Implemented in-memory sliding window rate limiter in `AuthService`: max 5 failed attempts per 15 minutes per `(ip, normalizedEmail)`.
   - Emits `429 AUTH_TOO_MANY_REQUESTS` on 6th attempt; resets counter upon successful authentication.
4. **RBAC Matrix Alignment**:
   - Updated `docs/shared/RBAC_MATRIX.md` and `docs/actors/admin/PERMISSIONS_ADMIN.md` to include Admin read-only audit permission for `Class` and `ClassEnrollment` (roster), closing the matrix contradiction.
5. **Exception Filter Fix**:
   - Removed status override `if (status !== 404) status = 500`. Preserves client HTTP statuses for bare `HttpException`.
   - Standardized error field to canonical HTTP reason phrase using `http.STATUS_CODES[status]`.
6. **Production Start Script Fix**:
   - Changed `apps/api/package.json` `start` and `start:prod` to `node dist/src/main.js`.
7. **E2E Test Suites & Targeted DB Scoping**:
   - Scoped `refresh-token-concurrency.e2e.test.ts` to specific `tokenHash`.
   - Scoped `admin-approval-concurrency.e2e.test.ts` cleanup to exact array of tracked `createdUserIds`.
   - Verified:
     - `pnpm --filter api test`: **80/80 tests pass** (14 suites).
     - `node --test apps/web/scripts/*.test.mjs`: **39/39 tests pass** (7 suites).
     - `pnpm --filter web build`: **31/31 static pages build cleanly**.
     - `node scripts/check-docs.mjs`: **8/8 checks pass**.

**Blocker / needs follow-up**:
- None.

**Next steps**:
- Merge PR #28.
- Proceed to Sprint 2 Student Enrollment endpoints (`join`, `leave`, `list`).

---

## [2026-09-03] — Teacher Classes, Lessons & Admin Approval Backend APIs — Antigravity

**Context**:
Resolved SCOPE-01 Option A by implementing the complete Teacher & Admin backend foundation for Classes, Enrollments, and Lessons on branch `feat/s1-teacher-classes-api`.

**Done**:
- Added `Class`, `ClassEnrollment`, `Lesson` models to `schema.prisma`, ran migration `20260903154459_add_classes_and_lessons`.
- Implemented Admin User Approval (`PATCH /admin/users/:id/approve`, `suspend`, `activate`) in `apps/api/src/users/`.
- Implemented Teacher Classes (`POST /teacher/classes`, `GET /teacher/classes`, `GET /teacher/classes/:id`, `PATCH /teacher/classes/:id`, `PATCH /teacher/classes/:id/archive`, `POST /teacher/classes/:id/enrollment-code/regenerate`).
- Implemented Admin Classes (`GET /admin/classes`, `GET /admin/classes/:id`).
- Implemented Teacher Lessons (`POST /teacher/classes/:classId/lessons`, `GET /teacher/classes/:classId/lessons`, `GET /teacher/lessons/:id`, `PATCH /teacher/lessons/:id`, `DELETE /teacher/lessons/:id`, `PATCH /teacher/classes/:classId/lessons/reorder`).
- Updated `03-classes-enrollment.md` and `_INDEX.md` to `accepted`.
- Connected Teacher Frontend screens (`/teacher/classes`, `/teacher/classes/[classId]`, `/teacher/classes/[classId]/lessons`) to real API via `apps/web/src/lib/teacher-service.ts` with offline fallback.
- Created `docs/testing/TEACHER_TEST_PLAN_AND_REVIEW.md` (20-item test matrix).
- Verified:
  - `pnpm --filter api test`: **64/64 tests pass** (12 suites, covering access control, admin users, auth, user lifecycle, teacher classes, teacher lessons).
  - `node --test apps/web/scripts/*.test.mjs`: **39/39 tests pass** (7 suites).
  - `pnpm --filter web build`: **31/31 static pages build cleanly**.
  - `node scripts/check-docs.mjs`: **8/8 tests pass**.
- Updated `ai/PROGRESS.md` (F1.3, F2.1, F2.2, F2.5, Lessons marked Done, Teacher FE connected).

**Blocker / needs follow-up**:
- None.

**Next steps**:
- Merge PR #28.
- Proceed to Sprint 2 Student Enrollment (`/student/classes/join`, `/student/classes/:id/leave`, `/student/classes`).

---

## [2026-09-03] — Admin FE (Users, User Detail, Profile) API Integration — Antigravity

**Context**:
Connected Admin screens in `apps/web` (`/admin/users`, `/admin/users/[userId]`, `/admin/profile`) to the real Backend API (`/api/v1/admin/users`, `/api/v1/admin/users/:id`, `/api/v1/auth/me`, `/api/v1/auth/change-password`) on branch `feat/s1-admin-fe-api`.

**Done**:
- Created `apps/web/src/lib/api-client.ts` with flat envelope support (`{ data, meta }`), credentials for refresh cookie, and Bearer token support.
- Created `apps/web/src/lib/admin-users-service.ts` and `apps/web/src/lib/auth-profile-service.ts` with offline fallback for SSG.
- Connected `apps/web/src/app/admin/users/page.tsx` to `fetchAdminUsers`.
- Connected `apps/web/src/app/admin/users/[userId]/page.tsx` to `fetchAdminUserDetail`.
- Connected `apps/web/src/app/admin/profile/page.tsx` to `fetchMyProfile`, `updateMyProfile`, and `changePassword`.
- Verified:
  - `node --test apps/web/scripts/*.test.mjs`: 34/34 tests pass.
  - `pnpm --filter web build`: 31/31 static pages build cleanly.
  - `pnpm --filter api test`: 40/40 tests pass.
  - `node scripts/check-docs.mjs`: 8/8 tests pass.
- Updated `ai/PROGRESS.md` (F1.4 marked Done) and created session log `ai/context/sessions/2026-09-03-admin-fe-api.md`.

**Blocker / needs follow-up**:
- None.

**Next steps**:
- Review and merge PR #26 (Auth backend) and PR for `feat/s1-admin-fe-api`.
- Next task in Sprint 1: F1.3 Account Approval (Admin) or Teacher API specs.

---

## [2026-09-03] — Module 01 Auth Backend Implementation & Invariants Verification — Antigravity

**Context**:
Implemented Sprint 1 Module 01: Auth & Identity Backend (`apps/api`) on branch `feat/s1-auth-module`, fulfilling all 24 Invariants defined in `docs/api/modules/01-auth.md`.

**Done**:
- Added `RefreshToken` model to `apps/api/prisma/schema.prisma` with `tokenHash`, `familyId`, `replacedById`, `revokedAt`, `revokedReason`, `expiresAt`, indexed by `userId` and `familyId`.
- Applied migration `20260903151610_add_refresh_tokens`.
- Installed `cookie-parser` and registered it globally in `apps/api/src/main.ts`.
- Implemented `RegisterDto`, `LoginDto`, `ChangePasswordDto`, `UpdateProfileDto`, and response serializers in `apps/api/src/auth/dto/`.
- Implemented `AuthService` & `AuthController`:
  - `POST /api/v1/auth/register` (status=pending, bcrypt cost 12, admin self-registration forbidden, duplicate email 409).
  - `POST /api/v1/auth/login` (identical 401 on bad email/pass, status 403 checks, mints 15m access token, sets 7d httpOnly cookie).
  - `POST /api/v1/auth/refresh` (single-use token rotation, instant replay attack detection revoking entire family).
  - `POST /api/v1/auth/logout` (revokes active session, clears cookie).
  - `GET /api/v1/auth/me` & `PATCH /api/v1/auth/me` (reads and updates profile, never exposes passwordHash).
  - `POST /api/v1/auth/change-password` (verifies current password, re-hashes with cost 12, revokes all active sessions).
- Added `AuthModule` to `app.module.ts`.
- Added missing auth error codes (`AUTH_EMAIL_EXISTS`, `AUTH_INVALID_CREDENTIALS`, `AUTH_REFRESH_INVALID`) to `apps/api/src/common/errors/error-codes.ts`.
- Created comprehensive E2E test suite `apps/api/test/auth.e2e.test.ts`.
- Verified:
  - `pnpm --filter api test`: 40/40 tests pass (including 17 auth e2e tests).
  - `node --test apps/web/scripts/*.test.mjs`: 34/34 tests pass.
  - `node scripts/check-docs.mjs`: 8/8 tests pass.
  - `pnpm --filter api build`: clean.
  - `pnpm --filter web build`: 37/37 static pages pass.
- Updated `ai/PROGRESS.md` and created session log `ai/context/sessions/2026-09-03-antigravity-auth-module.md`.

**Blocker / needs follow-up**:
- None for Module 01 Auth. Ready to commit and open PR.

**Next steps**:
- Commit changes on `feat/s1-auth-module` and open PR.
- Next module in Sprint 1 is F1.3 Account Approval (Admin) or connecting frontend auth flows to `/api/v1/auth`.

---

## [2026-09-01] — Branch audit, PR #13 merged, PR #14 opened — Claude Code

**Context**: user's first request pointed at a stray checkout
(`C:\Users\nhata\OneDrive\Máy tính\Real` — the "third source" flagged in the
2026-08-13 entry below; still not deleted). Redirected to the real repo here.
Full detail in `ai/context/sessions/2026-09-01-claude-code-branch-audit-pr.md`.

**Done**:
- Audited all 12 local branches vs `main`; committed the working tree the
  2026-08-31-merge Cowork session left staged (docs merge + Student mockup, 2 commits),
  opened and got **PR #13 merged** (`222f00d`).
- User-confirmed cleanup: deleted `_backup/`, `_to_delete/`, `finish-pull.ps1` (untracked
  scratch). Deleted `chore/fast-verify-rule` — its `/admin/dashboard` commit duplicated
  work already merged via PR #8 under a different route path.
- PR #13's merge landed one commit before a `BUILD-001` doc-status fix reached it, so
  `main` came out with `turbo.json` actually tracked but the docs still saying it wasn't.
  Re-verified on `main` (`check-docs.mjs` 8/8, `pnpm --filter web build` green), opened
  [PR #14](https://github.com/nhatanhcoder/git-practice/pull/14) with the correct fix.

**Blocker / needs follow-up**:
- [PR #14](https://github.com/nhatanhcoder/git-practice/pull/14) needs review/merge.
- The stray OneDrive checkout noted 2026-08-13 is still there.

**Next steps**:
- Review/merge PR #14.

---

## [2026-09-01] — Verify + merge the 2026-08-31 claude.ai doc review — Claude (Cowork, device mount) — branch `docs/merge-2026-08-31-claude-ai`

**Context**: a 2026-08-31 Claude.ai session produced 11 rewritten docs. It had **no repo access**
and worked from claude.ai Project copies last synced in July. Its versions of `KNOWN_ISSUES.md`
(192 vs 397 lines), `PROGRESS.md` (107 vs 295), `HANDOFF.md` (140 vs 259), `working-rules.md`
(68 vs 313) and `multi-agent-workflow.md` (259 vs 577) were all **shorter than the repo's**, and
it reissued `API-003`, `DOC-006`, `DOC-007` and `SCOPE-01` — all live IDs here — for unrelated
problems. **Copying them in would have deleted ~15 real issues and corrupted the ID namespace.**
Merged by hand instead; nothing was overwritten.

**Done**:
- **Added `PROJECT_KNOWLEDGE.md`** (root, 644 lines) — did not exist in the repo. Register IDs
  renamed `C##` → `CR-##` (PROGRESS already uses `C1`/`C2`/`C3` for module blockers) and
  `SCOPE-01` → `SCOPE-02` (taken). §9 rewritten against verified evidence, plus a new §9.1
  recording what the verification changed.
- **Added `COWORK_BOOTSTRAP.md`** (root) — rewritten, not copied; leads with "the repo is the
  source of truth" and the `DOC-011` finding.
- **`KNOWN_ISSUES.md` 397 → 599 lines, append only**: `SCOPE-02`, `DOC-011`, `DOC-008`, `DOC-009`,
  `DOC-010`, `DOC-012`, `API-005`, `GIT-003`, `DEBT-003`. Updated `BUILD-001` (turbo.json exists
  but untracked), closed `GIT-002`, added the append-only/no-reuse rule to the header.
- **`PROGRESS.md`**: Sprint 0 re-verified against the working tree; added Sprint 5b (F9–F16,
  blocked); flagged the `DECISIONS.md` citations; noted the sprint-count mismatch.
- **`working-rules.md`**: new § Conflict Rules — check §9 first, repo beats copy, KNOWN_ISSUES is
  append-only, sprint numbers come from `SPRINT_PLAN.md`.
- **`project-brain.md`**: links to §8/§9 and the bootstrap; `SCOPE-02` warning; storage evidence
  split recorded; Current Status corrected.
- **`AI_CHAT_LOG.md`**: logged both sessions; corrected the false claim that `DECISIONS.md` exists.

**Conflicts closed on repo evidence**:
- **CR-2 → 10 sprints (S0–S9)**. `SPRINT_PLAN.md` has ten sections; the 8-sprint shape in
  `PROGRESS.md` and `PROJECT_KNOWLEDGE.md` §6 is stale → `DOC-012`.
- **CR-6 → one backend, `apps/api/`**. No `backend/` directory exists.
- **CR-19 → `packages/types`**, per `pnpm-workspace.yaml` and `PROGRESS.md`. `packages/` does not
  exist yet, so this is a naming decision, not a rename. `packages/shared-types` was invented.
- **CR-7 partly false** — the claim that the repo root "already contains a `packages/` directory"
  is wrong; `packages/` is absent.
- **CR-1 (HSK 1–9)** was already settled here on **2026-08-11**, on stronger evidence than the
  2026-08-31 re-derivation. No change.

**Blocker / needs follow-up**:
- **`DOC-011` (critical)** — `backend/data/content/` and its 10 JSON files are **not in this
  repository**. `PROJECT_KNOWLEDGE.md` §8, `SCOPE-02` and `DEBT-003` all depend on content nobody
  here can read. Owner: where does it live?
- **`SCOPE-02`** — LMS vs self-study. Weaker than it looked; may dissolve once `DOC-011` is answered.
- **`CR-3`** storage — evidence favours Supabase Storage (incl. the only accepted module spec),
  Cloudinary survives in older shared docs. Needs a decision, then a sweep.
- **`API-005`** — auth block missing from `.env.example`. Do not touch auth until agreed.
- **`DOC-012`** — renumbering sprints across three files; deliberately left for its own commit.

**Temporary decisions to preserve**:
- Sprint 5b is a **placeholder position**, and it does not appear in `SPRINT_PLAN.md` at all.
- The register lives in `PROJECT_KNOWLEDGE.md` §9 under `CR-##`. Do not reintroduce bare `C##` —
  it collides with the module-blocker table in `PROGRESS.md`.

**Next steps**:
1. `git commit` **on Windows** — the sandbox has no git identity (`user.name`/`user.email` unset)
   and will not sign on the owner's behalf. Files are staged on `docs/merge-2026-08-31-claude-ai`.
   ⚠️ ADR-011/ADR-015 and the 2026-08-25 session file were **already staged from 2026-08-25** and
   carried onto this branch — commit them separately if you want a clean history.
2. Answer `DOC-011`, then `SCOPE-02`.
3. `git add turbo.json` in its own commit (`BUILD-001`).
4. `git add --renormalize .` — still not run (`GIT-001`, ~118 phantom-modified files).
5. Sweep `DOC-004` (HSK 1–6) and `DOC-009` (5433 / 27018 / local Mongo).

---

## [2026-08-20] — Full docs/api translation to English — Antigravity — branch `chore/record-enforcement`

**Done**:
- Translated the entire `docs/api/` corpus from Vietnamese to English (all 10 module specs
  incl. the 116 KB `06-billing`, plus `API_CONVENTIONS` / `API_ADMIN` / `API_TEACHER` /
  `API_STUDENT` / `API_ERROR_CODES`), preserving every code block, SQL, JSON, invariant ID
  (INV-*), error code, endpoint path, field name, entity reference, emoji status mark, date,
  and Vietnamese names inside quoted examples.
- `API_ERROR_CODES.md`: registered the two **Fallback Errors** (`DUPLICATE_ENTRY` /
  `INTERNAL_SERVER_ERROR`) the `GlobalExceptionFilter` emits and `TOO_MANY_REQUESTS` +
  `PAYROLL_PERIOD_DUPLICATE` under *proposed, not agreed*; runtime Vietnamese UI strings in
  code samples intentionally kept (product UI language is Vietnamese).
- `pnpm check:docs` → **all 8 checks passed**; final diacritic grep across `docs/api/` → only
  intentional remnants (`=1đ` in a billing test value; runtime UI strings in error-code samples).

**In progress**:
- Changes still uncommitted on `chore/record-enforcement` (branch is clean vs origin/main —
  PR #9 already merged).

**Temporary decisions to preserve**:
- This was purely a language pass — **no technical content changed** (same invariants, statuses,
  blockers, unresolved tables).
- Runtime Vietnamese strings inside code samples stay Vietnamese (UI copy policy); prose, table
  cells and headings are English.

**Blocker / needs follow-up**:
- Commit + push + create the PR for the translated docs (the old `PR_BODY.md` at root belongs to
  the already-merged BACKEND_PLAN PR — stale, do not reuse).

**Next steps**:
1. Commit all docs/api + PROGRESS + HANDOFF + session file changes.
2. Push `chore/record-enforcement` and open a new PR (session file under `ai/context/sessions/`
   satisfies the CI record gate).
3. `KNOWN_ISSUES.md` + `working-rules.md` remain Vietnamese by design (out of scope).

---

**Done**:
- **8 module specs** in `docs/api/modules/` (~3,900 lines), following the fixed 16-section template:
  `01-auth` (accepted) · `02-users` · `03-classes-enrollment` (deferred) ·
  `04-sessions-attendance` · `05-payroll` · `06-billing` · `07-notifications` ·
  `08-dashboard` (deferred). Plus `_INDEX.md` + `_TEMPLATE.md`.
- **168 numbered invariants** (INV-<MODULE>-NN), each with a matching line in module
  section 15 test matrix. This is the **invariant gate** — replacing coverage %.
- `docs/BACKEND_PLAN.md` — a standalone backend plan, written for someone who knows nothing
  about the project. Went through 3 rounds of critique.
- `PR_BODY.md` at root — PR content for `docs/BACKEND_PLAN.md`, **PR not created yet**.

**Temporary decisions to preserve**:
- **Only `01-auth` is in `accepted` status.** The other 7 modules are `proposed`/`deferred`, awaiting ADR.
- Specs **record contradictions** found in source docs instead of picking a side. Where the
  entity and the API disagree, module section 16 records the status quo + what it blocks.
- No module invents its own error codes. Error branches missing a code are marked ⛔ in section 9.
- Module boundaries follow the **transaction boundary**, not tables — so
  rate+invoice+payment share one module `06-billing`.

**Blocker / needs follow-up**:
- ⚠️ **Doc drift fixed**: 5 business decisions approved in the 2026-08-16 entry were still
  marked "unsettled" in `ai/PROGRESS.md` for 3 days. PROGRESS updated.
  **All 5 are still not ADRs** — a line in HANDOFF is not an effective architecture decision.
  Need ADR-011 → ADR-014 before any code touches the schema.
- **Money representation has never been asked.** Not part of those 5 decisions. Entities use
  `Decimal(10,2)`/`(12,2)` but VND has no minor unit. Blocks modules 05 and 06.
- **SCOPE-01 undecided** — Classes/Enrollment has no endpoints, yet Sessions and Payroll
  depend on it. Two options + recommendation in `03-classes-enrollment.md` §16.
- 5 new issues recorded in `KNOWN_ISSUES.md`: `API-002` (two rate-reading formulas → two
  amounts), `API-003` (draft payroll period cannot be cancelled), `API-004`
  (`/admin/sessions/pending` permanently empty), `DOC-005` (missing `rejected` state),
  `DOC-006` (`nickname` vs `fullName`), `DOC-007` (unclear which error code is usable).
- `device_bash` on the user's machine died mid-session ("workspace failed to start") → **git
  could not run**. Branch, commit, push, PR all had to be done by hand. Commands are in the chat.

**Next steps**:
1. Write **ADR-011 → ADR-014** from the 5 decisions approved on 16/08, so they take real effect.
2. Answer **money representation** (ADR-010) and **SCOPE-01** — the two biggest blockers.
3. Lock `API-002` — no money-calculation code before it's done.
4. `01-auth.md` is ready to code now: Phase 1 infra (`turbo.json`, envelope interceptor,
   error enum, Prisma + migration `User`, Swagger) then Phase 2 Auth.

---

## [2026-08-16] — /build-screen finish admin area (all 10 screens) — Antigravity

**Done**:
- **Phase 0 probe**: Explored 3 style variants for admin payroll in `scratch/payroll-variant-{a,b,c}.html`, captured screenshots, batched 5 foundational business decisions with user approval.
- **Phase 1 complete**: Built all 10 admin screens in sequence, verified each with `pnpm --filter web build` (exit code 0), updated contracts + specs to `status: built`, `design_baseline: v2`, and updated `docs/front-end-design-docs/pages/_INDEX.md`:
  1. `/admin/invoices` (`feat/s1-web-invoices`) — KPI tiles, filter toolbar, responsive table, mobile cards.
  2. `/admin/invoices/[invoiceId]` (`feat/s1-web-invoice-detail`) — Header card, action bar, payment history, payment record & void modals.
  3. `/admin/invoices/generate` (`feat/s1-web-invoice-generate`) — 3-step wizard with connected stepper, preview selection table, retry batch actions.
  4. `/admin/payroll/sessions` (`feat/s1-web-payroll-sessions`) — Pending sessions review table, 520px slide-over review drawer, reject modal with required reason, empty success state.
  5. `/admin/payroll` (`feat/s1-web-payroll`) — Payroll periods ledger, status filtering, create period modal with preview & warning link.
  6. `/admin/payroll/[periodId]` (`feat/s1-web-payroll-detail`) — Period header with metrics, finalize & mark paid modals, collapsible teacher breakdown tables.
  7. `/admin/pay-rates` (`feat/s1-web-pay-rates`) — Default rate card, per-teacher rates table, append-only history timeline, edit rate modal.
  8. `/admin/tuition-rates` (`feat/s1-web-tuition-rates`) — HSK 1–6 tuition rates table, append-only rate history timeline, rate adjust modal.
  9. `/admin/monitoring` (`feat/s1-web-monitoring`) — System resources strip, 4 services health cards (PostgreSQL, Redis, Gemini AI, R2), audit log stream with JSON inspector.
  10. `/admin` (`feat/s1-web-dashboard`) — Main command center dashboard, 4 KPI tiles, actionable attention required list, module overview cards, activity feed.
- **Interactivity & Cross-Navigation**: Wired all sidebar links, topbar breadcrumbs, profile shortcuts, KPI metric cards, module overview cards, activity table rows, and secondary action buttons across all admin screens so users can seamlessly navigate between any screen by clicking interactive elements.
- **Admin Users Cross-Page Interactivity (`/admin/users` & `/admin/users/[userId]`)**:
  - Added title-bar quick action buttons to `/admin/invoices` and `/admin/payroll`.
  - Added role-based dropdown action menu items in the user list for students (Học phí, Mức học phí) and teachers (Kỳ lương, Duyệt buổi học, Mức lương GV).
  - Wired student & teacher detail pages with contextual navigation buttons, clickable invoice history rows pointing to `/admin/invoices/[invoiceId]`, tuition rates linking to `/admin/tuition-rates`, and session links to `/admin/payroll/sessions`.
- **Verification**: Batch desktop screenshots captured across all 10 pages in Ready state at 1280x800. Logged `WEB-005` in `KNOWN_ISSUES.md` (page metadata static title).

**Temporary decisions to preserve**:
- Business decisions 1–5 (flat tuition per month, dual-mode pay rate basis, monthly payroll cycle, single shared Gemini key, soft rejection of registrations).
- All mock data markers `// MOCK(...)` and `// ASSUMPTION(...)` in page files.

**Next steps**:
- Human review of built admin screens.
- Run `/design-promote <screen>` if baseline tokens are promoted.

---

## [2026-08-14] — Doc consistency sweep + mechanical rule enforcement — Claude (Cowork)

**Done**:
- **Docs**: fixed the response-envelope contradiction (`API_ERROR_CODES.md` said
  `{success, error:{}}`, everything else said flat — flat wins, see below). Fixed 6 wrong
  `AUTH_*` code names in `API_AUTH.md`, added `PATCH /auth/me`. Wrote the 7 missing admin
  endpoints into `API_ADMIN.md` under *Referenced by FE contracts, not yet defined*, and
  added the `INVOICE_* / RATE_* / SESSION_* / AI_*` code families — **all marked *proposed,
  not agreed***. Fixed 6 broken links. `root-design-fe.md` draft → active.
- **Rules**: `multi-agent-workflow.md` gained §0.1 (reality gate — a table of mechanisms that
  point at files which do not exist), §1.1 (`antigravity` as a borrowed agent with no standing
  lane), §5.1 (full branch lifecycle **including deleting the branch**), §14 (line endings),
  §15 (enforcement layers), §16. `working-rules.md` gained `## The flow` (8 steps + which file
  owns which), a Definition of Done, the `MOCK()` marker convention, and a **cheap** verify
  rule — 3 machine commands + exactly 2 screenshots, one pass, no fix-and-re-screenshot loop.
- **Enforcement**: `.gitattributes` (LF), `scripts/check-docs.mjs` (8 checks), and
  `.github/workflows/docs-check.yml`. Every check was verified against a deliberately broken
  fixture and then cleared — they are known to fire, not just known to pass.
- **Skills**: `ai/skills/*.md` moved into `.agents/skills/<name>/SKILL.md` with real
  `description` frontmatter. `ai/skills/` is gone — check 7 fails if it comes back.
  Installed `design-taste-frontend` (Leonxlnx/taste-skill, commit `e988add`) verbatim.
- `/admin/profile` was built by an agent during this session — mocked, `MOCK(A-AUTH-4)`
  markers present, and it created `apps/web/src/lib/status.ts`.

**In progress**:
- Branch `chore/agent-flow-docs` — created, **changes not yet committed**.

**Temporary decisions to preserve**:
- **Error envelope is FLAT**: `{statusCode, error, code, message, details, timestamp, path}`.
  No `success` flag, no nested `error` object. `error` is the HTTP reason phrase, a string.
  `details` is `Record<field, string[]>` and only appears on `VALIDATION_ERROR`.
- **Password endpoint is `POST /api/v1/auth/change-password`** (API_AUTH won over the 3 FE
  specs, which were changed to match). Profile edit is `PATCH /api/v1/auth/me`.
- **`taste-skill` scope**: the real criterion is *"does this screen take tokens from
  `root-design-fe.md`?"* — if yes, never use it. "Authenticated" was the wrong proxy;
  `/login` is public and may use it.
- Everything added to `API_ADMIN.md` / `API_ERROR_CODES.md` this session is **proposed, not
  agreed**. Writing a gap down is not closing it.

**Blocker / needs follow-up**:
- `git add --renormalize .` **not yet run** — until it is, CI's line-ending step fails.
- `.git/index.lock` cannot be deleted by an agent through the device mount; the human must
  `del ".git\index.lock"` from Windows. Close the JetBrains IDE during bulk git work.
- Still missing, and rules depend on them: `packages/types/` (no shared FE/BE contract at
  all), `turbo.json` (root `pnpm build` fails — use `pnpm --filter web build`),
  eslint/prettier configs, `.env.example`, `apps/api/`.
- The same 5 business decisions still block invoicing, payroll and monitoring.

**Next steps**:
1. Commit + push `chore/agent-flow-docs`, open the first real PR, let CI run on it.
2. `WEB-003` — the two `/admin/users` screens disagree on date format; the detail screen
   will break on the real API. `WEB-002` — `status.ts` now exists but `users.module.css`
   still hardcodes badge colours.
3. **Fix the spec template from what 3 built screens taught**, then map Teacher + Student.
   Contract and spec currently duplicate purpose / access / two-forms / out-of-scope — 4
   places to drift. The contract's Data table is empty while the spec holds the API mapping.
   13 files to fix now, 39 if this waits.

---

_(older entries removed per the 5-entry cap — they remain in git history. The
2026-08-13 entry's still-open note — a stray OneDrive checkout at
`C:\Users\nhata\OneDrive\Máy tính\Real` should be deleted — is carried forward
in the 2026-09-01 "Branch audit" entry above until it's actually resolved.)_
