# PROGRESS.md — Project Progress

> Sprint structure below follows `PROJECT_KNOWLEDGE.md` §6, which is an **8-sprint (S0–S7)**
> shape. ⚠️ `docs/roadmap/SPRINT_PLAN.md` — the authority — has **10 sprints (S0–S9)**, and
> "Sprint 7" here is really Sprint 9 there. Renumbering is tracked as **DOC-012**; until it is
> done, quote sprint numbers from `SPRINT_PLAN.md`, not from this file.
> ⚠️ `DECISIONS.md` #3 was cited as the authority for this structure. **That file does not exist**
> anywhere in the repo (verified 2026-09-01) — see **DOC-008**.
> **Initial state**: it has not been verified whether any real code exists in the repo yet — everything stays `⬜` until checked against reality. Don't trust this file's status more than actual code; if in doubt, run `pnpm build` / open the repo to check before reporting something as "done".
>
> Legend: `⬜ Not started` · `🔶 In progress` · `✅ Done` · `⛔ Blocked` · `⏸ Deferred/out of scope`
>
> **Running multiple agents in parallel (2+ Claude, or Claude + Antigravity at once)**: when picking up an item, mark `🔶` and add the agent/session name right after it, e.g. `🔶 (Claude-A)`. Before picking up new work, other agents only need to scan this file (cheap) to avoid items already claimed — **no need to read HANDOFF.md or the other agent's full context**. When done, remove the tag and switch to `✅`.
>
> Update this file immediately after completing or starting an item — don't batch updates at the end of a session and forget.

---

## Sprint 0 — Foundation
_(re-verified against the working tree 2026-09-01, after PR #12 — do not mark anything here
without checking disk. Previous verification 2026-08-14. See **DOC-010**.)_
- 🔶 pnpm workspace ✅ / eslint ✅ (`eslint.config.mjs`) / prettier ✅ (`.prettierrc`) /
      **`turbo.json` exists on disk but is UNTRACKED in git** — `git ls-files turbo.json` is
      empty, so `pnpm dev` / `pnpm build` still fail on a clean clone and in CI (`BUILD-001`;
      one-line fix: `git add turbo.json`) / husky ❌
- 🔶 NestJS app (`apps/api`) **now exists** (PR #12, 2026-08-20): `src/main.ts`,
      `app.module.ts`, `src/health/`, `src/prisma/`, `nest-cli.json`, `prisma/schema.prisma`,
      `prisma/seed.ts`, `scripts/check-db.ts`, migration `20260820000000_init_users`.
      **Mongoose ❌, Swagger ❌, global pipes/filters ❌** — not present in `app.module.ts`.
      Implements no features; only Auth (`01-auth.md`) is ready to code
- 🔶 Next.js app (`apps/web`) ✅ Next 14 + TS + Tailwind scaffolded and building.
      **Axios interceptors ❌, Zustand skeleton ❌, shadcn/ui ❌** — `axios`,
      `@tanstack/react-query` and `zustand` are in `package.json` but **not imported by a
      single file**
- ⬜ Supabase PostgreSQL + MongoDB Atlas init, first migration + seed script — the local
      migration exists; hosted instances unverified. PR #12 dropped the local Mongo container
      in favour of Atlas and renamed the Postgres service to `db` on `${POSTGRES_PORT:-5432}`,
      database `hsk_dev` (docs still say 5433/27018 — `DOC-009`)
- ⬜ `packages/types` — `pnpm-workspace.yaml` declares `packages/*`, but **`packages/` does not
      exist at all** (not an empty directory — absent). Blocks the whole contract-first
      mechanism (`multi-agent-workflow.md` §4). Naming settled: `packages/types`, not
      `packages/shared-types` (`PROJECT_KNOWLEDGE.md` §9 CR-19)
- ⬜ `.gitattributes` normalisation run (`git add --renormalize .`) — file added 2026-08-14,
      **not yet applied**; ~118 files still show as modified with no content change
- **DoD**: API runs on :3001 (Swagger `/api`), Web runs on :3000 and connects to API, CI passes lint+build

## Sprint 1 — Auth & Users
- ✅ F1.1 Account registration (status `pending`, bcrypt cost 12)
- ✅ F1.2 Login (JWT access 15min + refresh 7d, httpOnly cookie)
- ✅ F1.3 Account approval (Admin: PATCH /admin/users/:id/approve, suspend, activate)
- ✅ F1.4 Profile & Admin Users FE integration — **the wiring existed before 2026-09-04 but did
      not work**: every failure was swallowed and the hardcoded fixtures stayed on screen, so the
      screens looked healthy while disconnected (`WEB-011`). Now genuinely live against
      `/api/v1/admin/users` and `/api/v1/auth/me`, with honest loading / empty / forbidden /
      failed-to-load states and no fallback data anywhere
- ✅ Refresh Token Rotation + Replay Attack detection (PROJECT_KNOWLEDGE.md 4.1)
- ✅ Custom decorators `@CurrentUser`, `@Roles`, `@Public`
- ✅ **Login screen + session handling** (claude · 2026-09-04) — `/login` existed nowhere until
      now, so the FE was wired to a protected API with no way to get a token; every guarded call
      401'd and the screens quietly showed mock data instead (`WEB-011`, `WEB-012`). Access token
      moved out of `localStorage` into an in-memory Zustand store per `working-rules.md` § Auth
      Rules, with single-flight refresh-and-retry on 401 and `restoreSession()` on mount.
      **Verified against a real 401**, not assumed: the API was restarted with an 8-second access
      TTL and the network log showed `401 → /auth/refresh 200 → retry 200`.
- ✅ **DoD met end to end**: signed in through the browser as `admin@hsk.local`, landed on the
      admin area, approved `teacher.pending@hsk.local` from the UI, and confirmed the row changed
      to `active` **in Postgres** (`PATCH /admin/users/:id/approve → 200`). Not a mock.
- **DoD**: Register → Admin approves → login lands on the correct dashboard per role

## Sprint 2 — Classes & Enrollment
- ✅ F2.1 Create class (unique 8-character enrollment code)
- ✅ F2.2 Edit class
- ⬜ F2.3 Join class
- ⬜ F2.4 Leave class
- ✅ F2.5 View student list in a class
- ⬜ F2.6 View Student's class list
- ✅ Teacher Lessons API & Admin Classes API (SCOPE-01 Option A complete)
- 🔶 (claude · 2026-09-01) **Teacher Page Contracts for this sprint's slice** —
  `/teacher`, `/teacher/classes`, `/teacher/classes/[classId]`,
  `/teacher/classes/[classId]/lessons` contracted (not built). See
  `docs/front-end-design-docs/pages/teacher-pages/` and its `teacher-flow.md`.
  Note: these cite `T-CLASS-*`/`T-LESSON-*` (from `docs/actors/teacher/FEATURES_TEACHER.md`),
  a different ID scheme than this section's `F2.*` — same features, two numbering schemes
  never reconciled. Do not treat them as different scope.
  **`/teacher/classes/[classId]/lessons` is contracted but every action is `⛔` blocked** —
  `API_TEACHER.md` turns out to have no Lessons section at all (`KNOWN_ISSUES.md` `API-007`);
  do not build this screen until that API exists.
- 🔶 (opencode · 2026-09-01) **Built the 4 Teacher S2 screens** from the contracts above:
  `/teacher` (dashboard, class-card grid, no KPI row per contract), `/teacher/classes`
  (filter + table + create modal + archive), `/teacher/classes/[classId]` (header, code
  panel with copy/regenerate, roster with "—" for avg score & attendance),
  `/teacher/classes/[classId]/lessons` (drag + button reorder, create/edit/delete modals —
  every action MOCK(⛔) local-only, API-007). Pattern: Admin screens (CSS modules,
  `status.ts` badges, REVIEW-STATE switcher, mobile card lists); shared
  `components/teacher/teacher-shell` + `teacher-widgets`; mock data in
  `lib/teacher-data.ts`. **Fully mocked, no API calls.** `pnpm --filter web build` exit 0
  (28 routes), `check:docs` 8/8. Contracts → `built`, `_INDEX` Design = v1. Lane:
  `apps/web/**` = codex's lane; solo agent, flip recorded here per
  `multi-agent-workflow.md` §1. Does NOT satisfy S2 DoD (needs the real join-class flow).
- 🔶 (opencode · 2026-09-01) **Contracts + build for the remaining 5 Teacher areas**
  (completes the sidebar): `/teacher/questions` (T-QB), `/teacher/assignments` (T-ASGN),
  `/teacher/grading` (T-GRADE, AI-suggest mock), `/teacher/sessions` (T-SES, state machine
  per FLOW_SESSION_ATTENDANCE), `/teacher/income` (T-INC, view-only). Contracts + flow-map
  v2 section written this session; all error codes recorded as `TODO(error-code)` — none
  invented. Screens fully mocked, Admin pattern. Lane: same flip as above.
  **BUILT same session** — all 5 screens live in `apps/web/**` (build exit 0, 33 routes,
  check-docs 8/8): question bank with skill/sub-type/HSK filters + create/edit modal
  (delete gated by usageCount per F3.6), assignments 2-step create wizard + question picker
  + submission-stats drawer (edit/delete locked when submittedCount>0 per T-ASGN-5), grading
  queue + drawer with per-question score/feedback + writing-only AI-suggest mock + finish
  gating, sessions with scheduled→completed_pending machine (start/attendance/submit) +
  rejection-reason modal, income view-only with period drawer (money display-only, from
  envelope totals — no client arithmetic). Sidebar: 7 live items + Analytics disabled (S5).
- 🔶 (claude · 2026-09-02) **7 Teacher UI bugs fixed** (mock FE only; screens stay `🔶` because
  they are still fully mocked — no API). Detail in `KNOWN_ISSUES.md` `WEB-006`.
  **A1** session submit no longer writes the scheduled end into `actualEnd` — that laundered an
  expected time into a real one and neutered `INV-PAYROLL-17`, turning a hard payroll failure
  into a silently wrong payment. **A2** grading clamps scores to `[0, maxScore]` and keeps the
  AI's original suggestion instead of overwriting it with the teacher's edit. **B1** assignment
  enum `assignment` → `homework` per `ENTITY_ASSIGNMENT`, and `mock_test` now requires a time
  limit. **B2** Writing questions store `correctAnswer = null` + a real `rubric` per
  `ENTITY_QUESTION`, instead of stuffing rubric prose into `answer`. **C1** the question picker
  actually filters by the class's HSK level and prunes stale selections when the class changes.
  **C2** `CopyChip` calls the Clipboard API and reports failure honestly. **C3** new shared
  `src/hooks/use-overlay.ts` gives every menu/dialog outside-click, Escape, focus trap and focus
  restore.
  New: `src/lib/teacher/teacher-rules.ts` (pure rules) + `scripts/teacher-rules.test.mjs`
  (11 cases). Verified on a **production** build: build green, 31/31 tests, check-docs 8/8,
  9/9 Teacher routes HTTP 200, every acceptance criterion exercised in a browser, desktop + 375px.
  ⚠️ Requiring `actualEnd` before submit picks option (a) of the **still-open Q-SES-3** in
  `04-sessions-attendance.md` §16 — a UI choice, not a settled backend rule.
- 🔶 (claude · 2026-09-02) **Second pass — three of those seven were only partially fixed.**
  Caught by an independent review of `main@74a1e76`, not by the first pass's own verification.
  **C1**: pruning had been applied only to the class-change path, so `openEdit` trusted stored
  ids, `step2Valid` counted hidden ones and `submitDraft` wrote the raw draft — fixture `a4`
  showed "1 đã chọn" with no checkbox ticked and Save enabled. One shared rule
  (`questionIdsForClass`) now guards open / class-change / count / write, and **4 of 5 fixtures
  were themselves wrong** and were corrected. **C3**: the income drawer and lessons modal were
  missed by the first overlay pass and still had hand-rolled dialogs; both now use
  `Overlay`/`useOverlay`. **B2**: the Writing rubric was fixed but the model shape was not —
  options are now `{id,text}`, `correctAnswer` references those ids (array for multi, which `q5`
  had stored as the unmatchable string `"A + B"`), and `toQuestionDto()` maps the flat editor
  ViewModel onto the entity's nested shape. The model is **not** a valid API payload on its own.
  `teacher-rules` moved `.ts` → `.js` with JSDoc so the tests import it directly instead of
  regex-stripping TypeScript. 34/34 tests, build green, check-docs 8/8, 9/9 routes 200,
  all three findings re-verified in a **production** build, desktop + 375px.
- **DoD**: Teacher creates class → student joins via code → teacher sees the student in the list

## Sprint 3 — Question Bank & Assignments
- ⬜ F3.1 Create MCQ question · ⬜ F3.2 Listening · ⬜ F3.3 Reading · ⬜ F3.4 Writing
- ⬜ Support all 9 sub-types or just the 4 basic ones — *(cited `DECISIONS.md` #4, which does not exist — **DOC-008**)*
- ⬜ F3.5 Search & filter questions (Chinese full-text search)
- ⬜ F3.6 Edit/delete question (soft delete if already used)
- ⬜ F4.1 Create Assignment · ⬜ F4.2 Create Mock Test · ⬜ F4.3 Edit/delete Assignment
- 🔶 (claude · 2026-09-04) **F3.1–F3.5 question bank BUILT on MongoDB** — the first module that
      actually uses Mongo. The connection had existed since PR #12 but nothing used it: no
      `src/mongodb/schemas/`, no model, one `InjectConnection` so `/health` could ping it.
      `question.schema.ts` follows `ENTITY_QUESTION.md` (nine sub-types, options as `{id, text}`,
      `correctAnswer` typed `string | string[] | null`), and the five endpoints in
      `API_TEACHER.md` § Question Bank are live. Cross-field rules live in a pure
      `question-rules.ts`: a sub-type must belong to its skill, writing has no answer but needs a
      rubric, listening needs audio, an answer must reference option ids that exist, multi-answer
      sub-types take an array — and **PATCH validates the merged document**, because
      `{skill: "writing"}` is a legal patch that leaves a correctAnswer behind. Ownership is
      checked in the service on every read and write; `@Roles('teacher')` only proves the caller
      is *a* teacher. `/teacher/questions` is wired to it and its mock is gone.
      13 new e2e tests, 93/93 across the suite against the real Atlas cluster.
      **Stays 🔶, not ✅**: `F3.6` (no hard delete once a question is used) **is not enforced** —
      `usageCount` needs the Assignment table, which does not exist (`WEB-013`) — and **listening
      questions cannot be created from the UI at all** because there is no audio upload and `CR-3`
      has not decided a storage provider (`API-011`).
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
      *(if F9–F16 ever land, `SkillScore.skill` widens 3 → 7 values — `PROJECT_KNOWLEDGE.md` §8. Blocked, see Sprint 5b)*
- ⬜ F6.3 Class dashboard (Teacher) · ⬜ F6.4 API Quota Monitoring (Admin)
- **DoD**: Rating a card reschedules it correctly per SM-2. Teacher sees red alerts for weak students.

## Sprint 6 — Attendance, Payroll, Tuition ⚠️
> **Marked out of scope here, but this file is the outlier.** `PROJECT_KNOWLEDGE.md` §6 and
> `docs/roadmap/SPRINT_PLAN.md` both specify Sprint 6 in full with a DoD, and the authority cited
> for holding it (`DECISIONS.md` #5) **does not exist** (**DOC-008**). Two of three sources say
> in scope. Owner decides — `PROJECT_KNOWLEDGE.md` §9 **CR-13**.
- ⏸ ClassSession + SessionAttendance (attendance)
- ⏸ TeacherPayRate + PayrollPeriod (teacher payroll)
- ⏸ StudentTuitionRate + StudentInvoice + TuitionPayment (tuition, VietQR)
- ⏸ F8.1–F8.5 In-app notifications (partly tied to this module, the rest belongs to Sprint 4)

## Sprint 5b — Learning Content Modules (F9–F16) 🆕
> Added 2026-09-01 from `PROJECT_KNOWLEDGE.md` §8. **Position in the sprint order is a
> placeholder** — it has never been agreed, and it does not appear in `SPRINT_PLAN.md`.
- ⛔ **BLOCKED — DOC-011**: the 10 JSON source files (`backend/data/content/`) are **not in this
      repo**. Located outside the repo at `D:\PersonalProject\Chinese UI test\ui-claude\backend\data\content`;
      validate and choose an import/seed strategy before implementation
- ✅ **SCOPE-02 resolved 2026-09-03 — ADR-016**: one product with class-learning and self-study
      lanes. Teachers may assign catalog units as supplemental practice; official grades still
      require Assignment/Attempt
- ✅ **SRS decision — ADR-016**: production uses SM-2 (Again=0, Hard=3, Good=4, Easy=5), not
      the five-box Leitner behavior in the FE mockup
- ⬜ Content loader: read + validate the JSON files, schema guards
- ⬜ F9 Pronunciation foundation (pinyin table, tones, tone sandhi, 214 radicals, 4 PDFs)
- ⬜ F10 Grammar points (browse, auto-generate exercises from `tokens`, progress)
- ⬜ F11 Character writing (stroke-order animation, canvas practice, radical breakdown)
- ⬜ F12 Lego sentence builder (7 stations, drag-drop with S/T/P/A/V/O/C/Q roles, endless mode)
- ⬜ F13 HSK mock exams (11 exams / 161 questions, real timers, skill breakdown → `SkillScore`)
- ⬜ F14 Workplace roleplay (6 scenarios, multi-turn, keyword scoring)
- ⬜ F15 Learning path (2 curricula, topic map, side quests, 3 bosses)
- ⬜ F16 Gamification (XP, 9 named levels, 6 imperial-exam ranks, streaks, 20 badges, leaderboard)
- ⬜ Contract-first entity/module design for catalog, personal progress, supplemental practice
      and gamification; the 7 Postgres tables in `PROJECT_KNOWLEDGE.md` §8.9 remain proposals
- ⬜ Widen the `skill` / `skillType` enums 3 → 7 (`grammar`, `character`, `speaking`,
      `pronunciation`) — affects `Assignment.skillType`, `SkillScore.skill`, `Question.skill`
- ⬜ Answer the 4 remaining open questions in `PROJECT_KNOWLEDGE.md` §8.10; class relationship resolved
- **DoD**: a learner can go pronunciation → grammar → character → Lego → mock exam, with
      XP/streak/badges updating correctly

> ⚠️ **Do not confuse this with the built Student mockups.** `apps/web/src/app/student/**` already
> renders foundation, grammar and learning-path screens — all **fully mocked**, no API, built as a
> visual spike (see § Off-sprint). They are not F9–F16.

### Content data fixes needed first (DEBT-003 — blocked by DOC-011)
- ⬜ Grammar count mismatch: declared 60, per-level sum = 51
- ⬜ `与其…不如…` duplicated at both HSK 5 and HSK 8 — drop one
- ⬜ Character count mismatch: declared 60, per-level sum ≈ 65
- ⬜ XP curve broken: Cử nhân 24,000 → Cống sĩ 26,400 (2,400 gap) vs → Tiến sĩ 52,000 (25,600)
- ⬜ HSK 7–9 content thin (3–4 grammar points, ~2 characters per level)

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

- 🔶 **First four Student mockup pages BUILT** — 2026-08-28 (opencode, mockup mode per
      `docs/prompts/student-product/`). `apps/web/src/app/student/**`:
      `/student` (dashboard: continue-learning, XP/streak/daily-goal, HSK 1–9 strip + level
      drawer, review queue, activity, quick links), `/student/learning-path` (2 curricula,
      HSK 1–9 selector, Map/List toggle, RPG nodes: lesson/side-quest/boss with 4 states,
      node drawer, force-unlock demo costing 100 XP via zustand XP store; Han Yu 7–9 shows a
      designed empty state), `/student/grammar` (search + HSK + category filters, mastery ring,
      card grid, detail drawer with 5 exercise mini-demos incl. interactive reorder & match),
      `/student/foundation` (5 tabs: 21 initials + 36 finals with IPA, 4 tone-contour SVG cards
      + sandhi, **full 214 Kangxi radicals browser** with search/stroke filters + drawer,
      listening/speaking practice cards with play/record placeholder states, 4 PDF download
      cards). Plus student shell (sidebar + mobile bottom nav + menu sheet), 5 "coming soon"
      stub routes, `student.css` tokens + tailwind `sp-*` palette (Nunito/DM Sans, indigo
      #4F46E5 + orange #EA580C from ui-ux-pro-max "Educational App" palette — allowed in
      mockup mode). All 9 routes × 4 demo states (ready/loading/empty/error) via in-page
      switcher. **Fully mocked** — every data file in `src/lib/student/*` is `MOCK(student)`;
      no API, no auth. Also fixed pre-existing `pnpm check:docs` failures in uncommitted
      `STUDENT_UI_UX.md` (flashcard paths lacked `/student` prefix; dashboard-gap wording
      tripped the endpoint regex). Build verified: `pnpm --filter web build` exit 0, 24 routes.
      Next per mockup build order: Character Writing, Mistake Notebook/SRS, CBT Exam Room.
- ✅ **Student product coding prompts** — 2026-08-26. Added `docs/prompts/student-product/`
  with a master implementation prompt and page prompts for Student Dashboard, HSK Learning
  Path, Grammar, Foundation, Workplace, CBT Exams, Mistake Notebook/SRS, Lego Word Order,
  Character Writing, and Leaderboard/Streak/Badges. Scope is HSK 1–9. Music/Karaoke, PK Arena,
  and AI Mentor/Tiểu Long are explicitly removed. Prompts require real API persistence,
  RBAC, UI states, idempotency and tests; they do not represent implemented features.
- ✅ Added `00-build-first-four-pages-ui-ux-pro-max.md` — implementation prompt for the first
  four Student pages with verified `ui-ux-pro-max` search guidance and repository-token precedence.
- ✅ **Student prompts switched to new-design mockup mode** — 2026-08-26. Prompt folder now
  explicitly permits a fresh visual system, local mock data/state and frontend-only routes;
  production flow-mapper/Page Contract/backend requirements were removed from all Student prompts.
- ✅ **`hsk-learning-ia` project skill** — 2026-08-26. Adapted the supplied IELTS/TID learning
  IA into an HSK 1–9 Student-product skill covering routes, hub hierarchy, learning modes,
  progress loops and separate mockup/production behavior.
- ✅ Added cross-agent usage adapters for Claude Code, Antigravity, generic agents and
  Cursor/Windsurf/Cline/Roo Code in `docs/prompts/student-product/11-agent-adapters-hsk-learning-ia.md`.

- ✅ **Doc-check clean-clone parity** — 2026-08-18. `check-docs.mjs` now ignores locally
  installed, Git-ignored vendored skills consistently in local and CI runs. The project-owned
  `design-promote` skill is tracked. Added a regression test; no feature behavior changed.

- ✅ **`ai/` directory translated to English** (antigravity · 2026-08-24). Translated remaining
  Vietnamese prose in `ai/rules/working-rules.md`, `ai/known-issues/KNOWN_ISSUES.md`,
  `ai/PROGRESS.md`, and `ai/context/sessions/2026-08-19-claude-cowork.md`. Purely a language
  pass — no rules, steps, or technical content changed. Intentional Vietnamese remnants kept:
  OS paths (`Máy tính`), UI labels (`Tài khoản`), VND notation (`=1đ`).

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
- [x] **SCOPE-03 — Teacher role scope resolved 2026-09-01 (owner-confirmed): full management.**
      `docs/actors/teacher/client-demand.txt` says `Access level: Client Demand (Read Only)`,
      which reads like a role restriction but turned out to label the *document* (frozen
      client source text — Admin's `client-demand.txt` carries the identical header and Admin
      is definitely not read-only), not the *role*. Owner confirmed: Teacher keeps full
      management, matching `RBAC_MATRIX.md` / `API_TEACHER.md` / `FEATURES_TEACHER.md` /
      `PERMISSIONS_TEACHER.md`. See `KNOWN_ISSUES.md` `SCOPE-03`. Unblocks Teacher Page
      Contracts with create/edit/regenerate-code affordances.

---

## Backend — module spec

_(specs written 2026-08-19, `docs/api/modules/`. **Updated 2026-09-01**: `apps/api` now exists
(PR #12 scaffold + `User` migration) but implements no module; `packages/` does not exist at all.)_

> ⚠️ **These 8 modules are the Admin area only.** The Teacher backend has **no module spec at
> all** — the FE is 9 built (mocked) screens with every endpoint listed in `API_TEACHER.md`, but
> no invariants, transaction boundaries or test matrices behind them. Gap map:
> `docs/api/modules/_INDEX.md` § 11 (added 2026-09-01).

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

### Backend — Teacher module specs (none written)

- 🔶 (claude · 2026-09-01) **API surface gaps closed, module specs not started.**
  `API_TEACHER.md` § Lessons written (8 endpoints, `API-007` closed) + `LESSON_*` error family
  (*proposed, not agreed*); `API-006` route convention settled **role-prefixed** by the owner and
  applied to `docs/api/modules/03-classes-enrollment.md`. Full gap map in
  `docs/api/modules/_INDEX.md` § 11.
- ⬜ Teacher module specs — **5 modules, none exist**, suggested dependency order:
  Classes+Lessons → Question Bank → Assignments → Attempts+Grading → Sessions (teacher side) →
  Income. Two things to settle first: Classes+Lessons inherits **SCOPE-01** (module 03 is
  deferred on it), and **Question Bank is MongoDB** — the 16-section template's §7 transaction
  boundary and §12 migration assume SQL and need rethinking, plus `DEBT-001` (no cross-DB
  transactions) applies directly since Question lives in Mongo and Assignment in Postgres
- ⬜ Teacher-side Sessions transitions (`scheduled → in_progress → completed_pending`) — module 04
  specs only the Admin approve/reject half. This is the same hole `API-004` names: without the
  teacher side, `GET /admin/sessions/pending` is permanently empty
- ⬜ Lesson row in `RBAC_MATRIX.md` / `PERMISSIONS_TEACHER.md` — needs owner approval (RBAC)

### Backend — not started

- ⬜ ADR-009 risk-based testing · ADR-010 money · ADR-011 account lifecycle ·
  ADR-012 payroll · ADR-013 tuition · ADR-014 Gemini key
- ⬜ `packages/types` — transport contract (OpenAPI/Zod). Nest DTOs implement it,
  **not** generated from Nest DTOs
- ⬜ `turbo.json` (BUILD-001) — file exists on disk but is **untracked**; `git add turbo.json`
- ⬜ Phase 1 infra: envelope interceptor · exception filter · error enum ·
  Prisma + migration `User` · Swagger `/api` · `/health` + `/ready` · CI + migration rehearsal
- ⬜ Phase 2: Auth module
