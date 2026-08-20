# PROGRESS.md — Project Progress

> Sprint structure follows PROJECT_KNOWLEDGE.md (see DECISIONS.md #3 — not yet officially finalized).
> **Initial state**: it has not been verified whether any real code exists in the repo yet — everything stays `⬜` until checked against reality. Don't trust this file's status more than actual code; if in doubt, run `pnpm build` / open the repo to check before reporting something as "done".
>
> Legend: `⬜ Not started` · `🔶 In progress` · `✅ Done` · `⛔ Blocked` · `⏸ Deferred/out of scope`
>
> **Running multiple agents in parallel (2+ Claude, or Claude + Antigravity at once)**: when picking up an item, mark `🔶` and add the agent/session name right after it, e.g. `🔶 (Claude-A)`. Before picking up new work, other agents only need to scan this file (cheap) to avoid items already claimed — **no need to read HANDOFF.md or the other agent's full context**. When done, remove the tag and switch to `✅`.
>
> Update this file immediately after completing or starting an item — don't batch updates at the end of a session and forget.

---

## Sprint 0 — Foundation
_(verified against the repo 2026-08-14 — do not mark anything here without checking disk)_
- 🔶 pnpm workspace ✅ / **`turbo.json` MISSING** — root `package.json` runs `turbo run dev`,
      so `pnpm dev` and `pnpm build` fail at the repo root today / eslint ❌ / prettier ❌ /
      husky ❌
- ⬜ NestJS app (`apps/api`) + Prisma + Mongoose + Swagger + Global Pipes/Filters — `apps/api/` does not exist
- 🔶 Next.js app (`apps/web`) ✅ Next 14 + TS + Tailwind scaffolded and building.
      **Axios interceptors ❌, Zustand skeleton ❌, shadcn/ui ❌** — `axios`,
      `@tanstack/react-query` and `zustand` are in `package.json` but **not imported by a
      single file**
- ⬜ Supabase PostgreSQL + MongoDB Atlas init, first migration + seed script
- ⬜ `packages/types` — declared in `pnpm-workspace.yaml`, directory missing. Blocks the whole
      contract-first mechanism (`multi-agent-workflow.md` §4)
- ⬜ `.gitattributes` normalisation run (`git add --renormalize .`) — file added 2026-08-14,
      **not yet applied**; ~118 files still show as modified with no content change
- **DoD**: API runs on :3001 (Swagger `/api`), Web runs on :3000 and connects to API, CI passes lint+build

## Sprint 1 — Auth & Users
- ⬜ F1.1 Account registration (status `pending`, bcrypt cost 12)
- ⬜ F1.2 Login (JWT access 15min + refresh 7d, rate limit 5 attempts/15min)
- ⬜ F1.3 Account approval (Admin)
- 🔶 F1.4 Profile management (built in apps/web/src/app/admin/profile; mocked in-memory until API auth endpoints are live)
- ⬜ Refresh Token Rotation + Replay Attack detection (PROJECT_KNOWLEDGE.md 4.1)
- ⬜ Custom decorators `@CurrentUser`, `@Roles`, `@Public`
- **DoD**: Register → Admin approves → login lands on the correct dashboard per role

## Sprint 2 — Classes & Enrollment
- ⬜ F2.1 Create class (unique 8-character enrollment code)
- ⬜ F2.2 Edit class
- ⬜ F2.3 Join class
- ⬜ F2.4 Leave class
- ⬜ F2.5 View student list in a class
- ⬜ F2.6 View Student's class list
- **DoD**: Teacher creates class → student joins via code → teacher sees the student in the list

## Sprint 3 — Question Bank & Assignments
- ⬜ F3.1 Create MCQ question · ⬜ F3.2 Listening · ⬜ F3.3 Reading · ⬜ F3.4 Writing
- ⬜ (see DECISIONS.md #4) Support all 9 sub-types or just the 4 basic ones
- ⬜ F3.5 Search & filter questions (Chinese full-text search)
- ⬜ F3.6 Edit/delete question (soft delete if already used)
- ⬜ F4.1 Create Assignment · ⬜ F4.2 Create Mock Test · ⬜ F4.3 Edit/delete Assignment
- **DoD**: Create a question set → group into an Assignment assigned to a class

## Sprint 4 — Taking Tests & Grading (+ AI Suggest)
- ⬜ F5.1 Start attempt · ⬜ F5.2 Auto-save answers (2s debounce)
- ⬜ F5.3 Submit + auto-grade MCQ
- ⬜ F5.4 Manual grading for Writing
- ⬜ Gemini AI Suggest for Writing (`AiRateLimiterGuard`, store `aiSuggestedScore`/`aiFeedback`)
- ⬜ F5.5 View submitted attempt results
- **DoD**: Student runs out of time and attempt auto-submits → Teacher uses AI Suggest to grade Writing → enters final score → Student views the result

## Sprint 5 — SRS Flashcards & Analytics
- ⬜ F7.1 Browse & view vocabulary cards · ⬜ F7.2 Add card to review deck
- ⬜ F7.3 SRS review session (SM-2 algorithm — full formula in PROJECT_KNOWLEDGE.md 4.3)
- ⬜ F7.4 Review stats (streak, cards learned)
- ⬜ F6.1 Weekly skill heatmap · ⬜ F6.2 Progress chart
- ⬜ F6.3 Class dashboard (Teacher) · ⬜ F6.4 API Quota Monitoring (Admin)
- **DoD**: Rating a card reschedules it correctly per SM-2. Teacher sees red alerts for weak students.

## Sprint 6 — Attendance, Payroll, Tuition ⚠️
> **Not yet confirmed in scope — see DECISIONS.md #5**
- ⏸ ClassSession + SessionAttendance (attendance)
- ⏸ TeacherPayRate + PayrollPeriod (teacher payroll)
- ⏸ StudentTuitionRate + StudentInvoice + TuitionPayment (tuition, VietQR)
- ⏸ F8.1–F8.5 In-app notifications (partly tied to this module, the rest belongs to Sprint 4)

## Sprint 7 — Testing & Deploy
- ⬜ Unit tests: Auth, Class, Question, Attempt, SRS
- ⬜ E2E tests (Playwright) — attempt-taking & submission flow
- ⬜ CI: GitHub Actions running tests on every PR
- ⬜ Deploy: FE → Vercel, BE → Railway/Render, real Supabase + Atlas
- **DoD**: Stable production run, all tests green

---

## Tooling / guardrails

- ✅ `.gitattributes` + `scripts/check-docs.mjs` + `.github/workflows/docs-check.yml`
      (2026-08-14) — 8 doc invariants enforced in CI, each verified to fire against a
      deliberately broken fixture and to clear afterwards. `pnpm check:docs` runs it locally.
- ⬜ `git add --renormalize .` **not yet run** — until it is, CI's line-ending step fails
      and ~118 files still show as modified (KNOWN_ISSUES GIT-001)
- ✅ **Record step (Step 7) is now machine-enforced** — 2026-08-19.
  `working-rules.md` § The flow adds a **Two task types** table: docs/spec/rule tasks must also
  do step 7, not just screen-build tasks. DoD adds item 4 (session file) and item 5 (docs index).
  `.github/workflows/docs-check.yml` adds the **Record step was not skipped** step: a PR changing
  ≥50 lines in `docs/ apps/ prisma/ packages/ .agents/skills/` without touching `ai/PROGRESS.md`
  or without a file under `ai/context/sessions/` → **fails, blocks merge**.
  Reason: the 2026-08-19 session wrote 8 module specs (~3,900 lines) and recorded zero lines in
  PROGRESS.
- ✅ **fast-verify rule restored** — 2026-08-19. The "Verify — FAST by default" version was
  written on branch `chore/fast-verify-rule` then **lost on branch switch because it was never
  committed**. Rewritten, with a note to recognize it if it disappears again.
- ⬜ husky pre-commit hook — deferred; CI covers the same ground and cannot be `--no-verify`'d

---

## Off-sprint / spike
_(work done outside sprint order. Recorded so another agent does not rebuild it, and so
nobody mistakes a mock for a finished feature. See `working-rules.md` § Definition of Done.)_

- ✅ **Doc-check clean-clone parity** — 2026-08-18. `check-docs.mjs` now ignores locally
  installed, Git-ignored vendored skills consistently in local and CI runs. The project-owned
  `design-promote` skill is tracked. Added a regression test; no feature behavior changed.

- 🔶 **`/admin/users` + `/admin/users/[userId]`** — built 2026-08-13 by `claude` from
  `docs/front-end-design-docs/specs/admin-pages/admin-users-list.spec.md` and
  `admin-user-detail.spec.md`.

  **Purpose: a spike to test whether the spec template survives contact with code.** Not an
  attempt at F1.3. The template has never been validated, and finding a flaw now costs 13
  spec rewrites instead of 39 after Teacher and Student are mapped.

  Lane note: this is `apps/web/**`, the `codex` lane. The flip was not recorded at the time —
  logged here retroactively (`multi-agent-workflow.md` §1).

  **Fully mocked.** No API call anywhere: user rows are hardcoded in `page.tsx`,
  detail data comes from `src/lib/user-detail-data.js`. Approve/suspend mutate React state
  and are lost on refresh.

  Known gaps against spec:
  - no `src/lib/status.ts` — badge colours are hardcoded in `users.module.css`, violating
    "one source decides badge colour" (`WEB-002`)
  - the two screens disagree on date format: list stores ISO and formats for display, detail
    stores pre-formatted strings. Detail breaks on the real API (`WEB-003`)
  - `getUserDetailDataset()` only answers for ids `1` and `4`; the other 6 rows in the list
    navigate to the not-found state
  - the REVIEW-STATE switcher widget is dev scaffolding still shipped in the page

  **Does NOT satisfy** Sprint 1 `F1.3 Account approval` or `F1.4 Profile management` — both
  stay `⬜`. Next step is to fix the spec template from what this spike taught, *then* wire
  the real API.

- 🔶 **`/admin/invoices`** (antigravity · 2026-08-16) — Building tuition billing list screen (A-INV-4). Fully mocked, baseline v2.
- 🔶 **`/admin/invoices/[invoiceId]`** (antigravity · 2026-08-16) — Building invoice detail & reconciliation screen (A-INV-3,5). Fully mocked, baseline v2.
- 🔶 **`/admin/invoices/generate`** (antigravity · 2026-08-16) — Building batch invoice generation wizard (A-INV-2). Fully mocked, baseline v2.
- 🔶 **`/admin/payroll/sessions`** (antigravity · 2026-08-16) — Building session review queue screen (A-PAY-2,3). Fully mocked, baseline v2.
- 🔶 **`/admin/payroll`** (antigravity · 2026-08-16) — Building payroll periods ledger screen (A-PAY-4,7). Fully mocked, baseline v2.
- 🔶 **`/admin/payroll/[periodId]`** (antigravity · 2026-08-16) — Building payroll period detail screen (A-PAY-5,6,7). Fully mocked, baseline v2.
- 🔶 **`/admin/pay-rates`** (antigravity · 2026-08-16) — Building teacher pay rates management screen (A-PAY-1). Fully mocked, baseline v2.
- 🔶 **`/admin/tuition-rates`** (antigravity · 2026-08-16) — Building tuition rates by HSK level screen (A-INV-1). Fully mocked, baseline v2.
- 🔶 **`/admin/monitoring`** (antigravity · 2026-08-16) — Building system monitoring & logs dashboard (A-DASH-3). Fully mocked, baseline v2.
- 🔶 **`/admin`** (antigravity · 2026-08-16) — Building admin dashboard command center (A-DASH-1,2,4). Fully mocked, baseline v2.


---

## Freeform notes (add as needed)
_(use this space for quick notes not yet clear enough to become their own checklist item)_

---

## Needs from the other lane
_(discovered while mapping the Admin UI — 2026-08-13)_

- [ ] (fe → be) **`GET /api/v1/admin/payroll/:id`** — does not exist. Blocks the whole
      `/admin/payroll/[periodId]` screen. `calculatePeriodAmount` already computes the data
      (`FLOW_PAYROLL_CYCLE` §3) but there is no endpoint to fetch it
- [ ] (fe → be) `GET /api/v1/admin/pay-rates` + `GET /api/v1/admin/tuition-rates` — only POST
      exists today; the list/history cannot be fetched (ADR-008 requires showing history)
- [ ] (fe → be) `POST /api/v1/admin/invoices/batch` + preview endpoint for `/admin/invoices/generate`
- [ ] (fe → be) `GET /api/v1/admin/monitoring/gemini`
- [ ] (fe → be) `GET /admin/invoices` needs `meta.summary` (paid n/total, total collected, outstanding)
- [ ] (fe → be) `GET /admin/users/:id` needs role-scoped history embedded (student:
      enrollments+attempts, teacher: classes+sessions)
- [ ] (fe → be) `GET /admin/sessions/pending` needs actual time, topic, notes, **attendance** embedded
- [ ] (fe → be) `GET /admin/dashboard/stats` — lock the payload shape before building
- [x] (be) ~~Entire `INVOICE_*` family missing~~ — 2026-08-14: added `INVOICE_*`, `RATE_*`,
      `SESSION_*`, `AI_*` to `API_ERROR_CODES.md`, **marked *proposed, not agreed***.
      Not usable until the BE owner approves
- [x] (be) ~~Missing endpoints~~ — 2026-08-14: all 7 endpoints written into `API_ADMIN.md`
      § *Referenced by FE contracts, not yet defined*. **Writing them down is not closing them**
      — still blocking, still needs BE owner sign-off line by line
- [ ] (be) **`packages/types` does not exist** — no shared contract between the two lanes.
      This is the most important unlock; it must be the first commit of a parallel session

## Business decisions

> ⚠️ **Doc drift detected 2026-08-19.** The five decisions below **were approved by the user
> on 2026-08-16** (recorded in `ai/context/HANDOFF.md` § 2026-08-16, *Temporary decisions to
> preserve*) but this file kept marking them as unsettled for 3 days. Fixed.
>
> **They are still not ADRs.** A line in HANDOFF is not an effective architecture decision —
> HANDOFF holds things that are *temporary and easy to forget*. Before backend code touches the
> schema, all five must become ADRs in `docs/shared/decisions/`.

| # | Decision | Locked on 16/08 as | ADR |
|---|---|---|---|
| 1 | Tuition model (`A-INV-1`) | **flat per month, one rate per student** — matches `billingCycle: monthly` in the entity | ⬜ needs ADR-013 |
| 2 | Pay rate unit (`A-PAY-1`) | **dual-mode**: `per_session` + `per_hour`. **No** `fixed_monthly` | ⬜ needs ADR-012 |
| 3 | Payroll period boundary (`A-PAY-4`) | **calendar month** | ⬜ needs ADR-012 — still missing timezone, open/close boundaries, overlap prevention |
| 4 | Gemini API key (`UC-A-005`) | **one shared platform key**, no BYOK | ⬜ needs ADR-014 |
| 5 | Registration rejection (`UC-A-001`) | **soft rejection** — keep the record, no hard delete | ⬜ needs ADR-011 — `User.status` currently has **no** `rejected` state, needs a migration |

### Still unsettled — blocks backend

- [ ] **Money representation** — never been asked. Entities use `Decimal(10,2)`/`Decimal(12,2)`,
      but VND has no minor unit. Need to lock rounding, arithmetic, JSON serialization.
      Prisma `Decimal` must **not** leak straight into API responses. → blocks modules 05, 06
- [ ] **SCOPE-01 — Classes/Enrollment scope**: full implementation or just enough for Sessions?
      `Class` + `ClassEnrollment` have no endpoints in `API_ADMIN.md`, yet
      Sessions/Attendance and Payroll depend on them. → blocks modules 03, 04, 05.
      Two options + recommendation: `docs/api/modules/03-classes-enrollment.md` §16
- [ ] **C2 — two rate-reading formulas contradict each other** (see `API-002` in KNOWN_ISSUES).
      → blocks every money calculation

---

## Backend — module spec

_(specs written 2026-08-19, `docs/api/modules/`. No backend code exists yet.
`apps/api` does not exist, `packages/` is still empty.)_

| # | Module | Spec | Status | INV | Blocked by |
|---|---|---|---|---|---|
| 1 | Auth | `01-auth.md` | ✅ accepted | 24 | — |
| 2 | Users | `02-users.md` | 🔶 proposed | 18 | C1 · C3 (needs `rejected` migration) |
| 3 | Classes+Enrollment | `03-classes-enrollment.md` | ⛔ deferred | 8 | **SCOPE-01** |
| 4 | Sessions+Attendance | `04-sessions-attendance.md` | 🔶 proposed | 16 | SCOPE-01 |
| 5 | Payroll+PayRates | `05-payroll.md` | 🔶 proposed | 33 | money · C2 · payroll-period timezone |
| 6 | Billing | `06-billing.md` | 🔶 proposed | 34 | money · C2 |
| 7 | Notifications | `07-notifications.md` | 🔶 proposed | 21 | no endpoint defined yet |
| 8 | Dashboard | `08-dashboard.md` | ⛔ deferred | 14 | last, per design |

**168 invariants**, each with a matching test line in module section 15 — the invariant gate
replaces coverage %.

**Only Auth is ready to code right now.**

### Backend — not started

- ⬜ ADR-009 risk-based testing · ADR-010 money · ADR-011 account lifecycle ·
  ADR-012 payroll · ADR-013 tuition · ADR-014 Gemini key
- ⬜ `packages/types` — transport contract (OpenAPI/Zod). Nest DTOs implement it,
  **not** generated from Nest DTOs
- ⬜ `turbo.json` (BUILD-001) — có 2 app rồi, không hoãn thêm được
- ⬜ Phase 1 hạ tầng: envelope interceptor · exception filter · error enum ·
  Prisma + migration `User` · Swagger `/api` · `/health` + `/ready` · CI + migration rehearsal
- ⬜ Phase 2: module Auth
