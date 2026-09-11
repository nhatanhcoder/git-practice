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
- ✅ (claude · 2026-09-05) **Signup screen + marketing profile.** `/register` did not exist at
      all — the only way to create an account was to POST `/auth/register` by hand. Now a
      two-step wizard (step 2 skippable), `/login` rebuilt on the Hán Lộ tokens, and a separate
      `UserMarketingProfile` table carrying demographics, intent, attribution and its own consent
      record. Owner-approved 2026-09-05: separate table, two-step, Hán Lộ direction.
      Both steps submit together **because they must** — a new account is `pending`, so there is
      no session to save a profile with afterwards. UTM is read from the URL silently;
      `referralSource` is the asked version of the same question.
      Consent is separate, unticked by default, stamped with a version and timestamp, and a birth
      year under 16 refuses self-consent and marks the row.
      **Verified against the real API in a browser**: registered through the form with UTM on the
      URL and confirmed **in Postgres** that every field landed, phone normalised, diacritics
      intact, consent stamped. 164/164 API tests across 26 suites, web build clean, check-docs 8/8.
      ⚠️ Three gaps recorded in the session file: no Page Contract was written for either screen
      (the pipeline asks for one), no Admin surface exists to read the collected data, and the
      consent wording is placeholder text nobody with authority has approved.
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
- ✅ (claude · 2026-09-05) **`/student` is now behind a login.** `/admin` and `/teacher` were
      both wrapped in `RequireAuth`; `/student` was not, so the whole learner area was reachable
      with no account. It went unnoticed because those screens are mock-backed — nothing fetched,
      so nothing ever 401'd. The layout stays a server component and renders the guard around the
      shell, which keeps its `metadata` export (converting the whole layout to `"use client"` is
      how `/admin` lost its own — `WEB-005`).
      **Verified in a browser on a production build**, each step observed rather than assumed:
      anonymous `/student` → `/login?next=%2Fstudent`; a registered-but-unapproved student → **403
      `AUTH_ACCOUNT_PENDING`** with the pending message shown, *not* "sai mật khẩu"; after
      `PATCH /admin/users/:id/approve` the same credentials → **200** and land on `/student`;
      desktop + 375px captured.
      Two pre-existing defects became visible only because a real account was finally used:
      `WEB-015` (the shell greets a hardcoded "Mai Anh", not the signed-in user) and `WEB-016`
      (the DEMO state switcher ships in the production student build).
- **DoD**: Register → Admin approves → login lands on the correct dashboard per role

## Sprint 2 — Classes & Enrollment
- ✅ F2.1 Create class (unique 8-character enrollment code)
- ✅ F2.2 Edit class
- ✅ F2.3 Join class (`POST /student/classes/join`)
- ✅ F2.4 Leave class (`DELETE /student/classes/:id/leave` — sets `dropped`, keeps the row)
- ✅ F2.5 View student list in a class
- ✅ F2.6 View Student's class list (`GET /student/classes` + `GET /student/classes/:id`)
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
- 🔶 (Antigravity · 2026-09-05) **Wire Teacher FE + BE for 4 screens** (Dashboard `/teacher`, Sessions `/teacher/sessions`, Income `/teacher/income`, stale markers clean-up; assignments & grading kept blocked). Branch `feat/teacher-4-pages`.
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
- ✅ (claude · 2026-09-05) **Student enrollment API — the missing link in the cross-actor chain.**
  Admin approval, teacher class creation and the teacher roster were already live; nothing
  could put a student into a class, so `ClassEnrollment` could never hold real data and every
  downstream module (assignments, attempts, sessions, invoices) had no foundation. Four
  endpoints in `apps/api/src/classes/student-classes.controller.ts`, built against the
  **accepted** spec `03-classes-enrollment.md` — no endpoint, field or error code invented.
  Ownership is enforced in the service on every read (`@Roles('student')` only proves the
  caller is *a* student); student payloads omit the enrollment code and the peer roster.
  Both write paths use conditional updates instead of read-then-write, and the first-time
  join treats the unique constraint as the real defence per INV-CLASS-05.
  **Re-join after leaving reactivates the existing row** (owner decision 2026-09-05, closing
  the open question in that spec § 16; now written up as its § 8.1), keeping `joinedAt` and
  stamping a new nullable `rejoinedAt` — migration `20260905120000_add_enrollment_rejoined_at`.
  Verified: `pnpm --filter api build` clean · full API suite **112/112 across 17 suites**
  (19 new, including two concurrent joins against a real database asserting exactly one row
  survives) · `check-docs` 8/8.
  ⚠️ **API only — the Sprint 2 DoD is not fully met.** There is no `/student/classes` route in
  `apps/web` at all (the student app has only the 9 mocked self-study screens), so a real user
  still cannot join a class from a browser. The chain is proven end to end by an e2e test, not
  by a person. FE is the next slice.
  ⚠️ Built in a sibling worktree `../Real-claude-student` against an **isolated** local database
  `hsk_dev_student`, because another agent was mid-edit in the main checkout — see `BUILD-002`.
- ✅ (antigravity · 2026-09-06) **Student Classes Page Contracts (TASK A00)** — wrote missing
  Page Contracts `student-classes-list.md` (`/student/classes`) and `student-class-detail.md`
  (`/student/classes/[classId]`), aligned with accepted backend endpoints (`join`, `leave`,
  `detail`, `list`) in `StudentClassesController`. Closes contract gap `DOC-016` and prepares
  for wiring frontend to live endpoints.
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
- 🔶 F7.1–F7.4 SRS Flashcards contract aligned (antigravity · 2026-09-06, TASK A00) — `student-srs.md`
  and `student-srs.spec.md` updated from misplaced `/student/mistakes` to canonical `/student/flashcards`.
  Separated vocabulary flashcards from mistake notebook (`S-MSTK`).
- 🔶 F7.1 Browse & view vocabulary cards — API + live UI built; production vocabulary catalog
      remains blocked by `DOC-011` · ✅ F7.2 First review creates the private review state
- ✅ F7.3 SRS review session — canonical SM-2 ratings 0/3/4/5, ownership locked to the
      signed-in Student, covered by targeted e2e tests
- 🔶 F7.4 Review stats — due/learned/retention/review count built; streak intentionally returns
      `null` until the calendar/timezone rule is approved
- ✅ (opencode · 2026-09-11) **SRS flow integration tests** — study → feedback → reload-state
      verification as new `apps/api/test/student-flashcards-flow.e2e.test.ts` with isolated
      fixtures (branch `test/srs-flow-integration`; independent of Assignments).
      New suite **9/9**, existing SRS suite regression **6/6** (empty page, concurrent-level
      consistency, review→reload match, due ordering, SM-2 advance, double-POST documented,
      A/B isolation, forged-token 401, absent-id 404). Fixtures cleaned (0 left).
      Pre-existing red `pnpm --filter api build` on `origin/main` → **BUILD-004**
      (not fixed, out of scope). Session:
      `ai/context/sessions/2026-09-11-opencode-srs-flow-tests.md`.
- ⛔ F6.1 Weekly skill heatmap · ⛔ F6.2 Progress chart — names exist in the actor document,
      but request/response contracts are not approved; no payload was invented
      *(if F9–F16 ever land, `SkillScore.skill` widens 3 → 7 values — `PROJECT_KNOWLEDGE.md` §8. Blocked, see Sprint 5b)*
- ⬜ F6.3 Class dashboard (Teacher) · ⬜ F6.4 API Quota Monitoring (Admin)
- **DoD**: Rating a card reschedules it correctly per SM-2. Teacher sees red alerts for weak students.

## Sprint 6 — Attendance, Payroll, Tuition ⚠️
> **Marked out of scope here, but this file is the outlier.** `PROJECT_KNOWLEDGE.md` §6 and
> `docs/roadmap/SPRINT_PLAN.md` both specify Sprint 6 in full with a DoD, and the authority cited
> for holding it (`DECISIONS.md` #5) **does not exist** (**DOC-008**). Two of three sources say
> in scope. Owner decides — `PROJECT_KNOWLEDGE.md` §9 **CR-13**.
- ✅ ClassSession + SessionAttendance (attendance & review, Module 04 + teacher-side lifecycle, ADR-010, ADR-012)
- ✅ TeacherPayRate + PayrollPeriod (teacher payroll & rates, Module 05, ADR-008, ADR-010, ADR-012)
- ✅ StudentTuitionRate + StudentInvoice + TuitionPayment (tuition, invoices & payments, Module 06, ADR-010, ADR-013)
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
- ⛔ Content loader: read + validate the JSON files, schema guards — import/seed strategy not approved
- ⛔ F9 Pronunciation foundation (pinyin table, tones, tone sandhi, 214 radicals, 4 PDFs)
- ⛔ F10 Grammar points (browse, auto-generate exercises from `tokens`, progress)
- ⛔ F11 Character writing (stroke-order animation, canvas practice, radical breakdown)
- ⛔ F12 Lego sentence builder (7 stations, drag-drop with S/T/P/A/V/O/C/Q roles, endless mode)
- ⛔ F13 HSK mock exams (11 exams / 161 questions, real timers, skill breakdown → `SkillScore`)
- ⛔ F14 Workplace roleplay (6 scenarios, multi-turn, keyword scoring)
- ⛔ F15 Learning path (2 curricula, topic map, side quests, 3 bosses)
- ⛔ F16 Gamification (XP, 9 named levels, 6 imperial-exam ranks, streaks, 20 badges, leaderboard)
- ⛔ Contract-first entity/module design for catalog, personal progress, supplemental practice
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

- ✅ (codex · 2026-09-08) **CI quality gates** — implemented: lint, type checks, web/API builds,
  frontend regression tests and API tests against disposable CI PostgreSQL/MongoDB services.
  No application behavior or schema changes; PR #50 web-quality, api-quality and check-docs passed.

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

- ✅ (claude · 2026-09-09) **Docs batch — sync module-status records with the implemented
  backend + record two QC findings.** Verified an external Modules 01→08 audit first, then:
  `_INDEX.md` — removed the obsolete "Only Auth is ready to code" line (7/8 implemented);
  **recorded the 02-users status conflict** (table says `accepted` since `41f3ff1`, spec
  frontmatter says `proposed` — marked ⚠️, no side chosen, owner decides); added an
  implementation-status paragraph (module 07 is the only uncoded module). This file's own
  § Backend table synced to the same reality (02 implemented + conflict, 03 accepted, 07 not
  coded). KNOWN_ISSUES gained **API-017** (`/admin/monitoring` shows fiction: Redis probe is
  a hardcoded literal, Gemini latency/quota are constants — only the SQL probe is real) and
  **DEBT-006** (A09 test suite asserts file strings, not behavior — live QC covered it this
  time; not repeatable). A08+A09 branch pushed with PR opened (QC 7/7 pass, report in session
  file). Branch `docs/module-status-sync`.

- ✅ (claude · 2026-09-06) **A05 — SRS về đúng route chính.** Màn SRS nối API thật đang nằm ở
  `/student/mistakes`, còn `/student/flashcards` phục vụ một bản Leitner mock — nên mục sidebar
  tên "Flashcard" mở đúng bản giả, và màn duy nhất gọi endpoint thật thì không ai tìm ra. A00 đã
  chốt route từ trước; code chưa bao giờ theo. Nay `git mv` màn thật sang `/student/flashcards`;
  `/student/mistakes` thành sổ tay lỗi sai đúng nghĩa (nguồn từ bài tập/bài thi, endpoint thuộc
  Sprint 4, **không** render hàng thẻ nào — dựng thẻ demo ở đó là lặp lại `WEB-011`);
  `/student/mistakes/review` chỉ còn ở dev, chặn ngay trên chính route đó vì deep link vào thẳng.
  **Không redirect** giữa hai route — A00 cấm, và đó là hai chức năng khác nhau.
  Ba route thành hằng số trong `lib/student/srs-routes.ts` (shell nav, bảng tiêu đề và link
  dashboard cùng import), vì lỗi cần sửa chính là literal link trôi khỏi màn nó đặt tên.
  Cổng production đặt **dưới** mọi hook, có test giữ đúng thứ tự đó.
  Verify trên production build với API thật: 8/8 mục TEST A05; chấm một thẻ thật →
  `POST .../review` → thống kê lên "ĐÃ HỌC 1 · GHI NHỚ 100% · LƯỢT ÔN 1" và **giữ nguyên sau
  reload**; 375px không tràn ngang. Web tests **69/69** (9 mới) · check-docs 8/8 · build sạch.
  Fixture (2 thẻ + 1 review state) đã xoá sạch, kiểm lại còn 0.
  ⚠️ Ghi mới `WEB-018`: landing công khai vẫn quảng cáo sổ tay lỗi sai là "5 hộp SRS".
  ⚠️ `vocabBox` / `rateVocab` / `vocabTopics` giờ không còn consumer — để **A12** dọn, không xoá
  ở đây theo đúng quy tắc 7.

- ✅ (claude · 2026-09-06) **A04 — Cứng hoá tải/chấm SRS.** Backend không đổi; đây là phía client
  từ chối hiển thị thứ server chưa xác nhận. **Bốn lỗi thật, mỗi lỗi đều tái hiện được trước khi
  sửa**: (1) response về sai thứ tự repaint danh sách — ép trễ `hskLevel=9` 2.5s, thứ tự thật là
  `start:9, start:1, done:1, done:9` và màn hiện 斟酌 (HSK 9) trong khi bộ chọn là HSK 1; giờ mỗi
  request mang số thứ tự và response cũ bị bỏ. (2) double-click gửi 2 POST — `submitting` không
  đóng được khe đó vì state React bất đồng bộ; ref lock thì được, ba click cùng tick giờ ra đúng
  1 POST. (3) chấm lỗi làm **mất luôn thẻ** vì rơi vào màn lỗi toàn trang; giờ thẻ giữ nguyên,
  4 nút chấm còn sống, báo lỗi tại chỗ và không nói đã lưu. (4) hết phiên lại báo "nguồn từ vựng
  production chưa được nhập" — giờ tách thành 3 trạng thái riêng.
  Thống kê đi qua `formatStat` nên giá trị thiếu là "—" chứ không phải 0 (`streak` API cố tình
  trả null tới khi chốt quy tắc lịch).
  **Không tự replay** review lỗi: endpoint chưa có idempotency key trong contract đã duyệt, replay
  có thể đẩy SM-2 hai lần cho một câu trả lời — ghi nhận là giới hạn backend, không lách.
  Logic nằm ở `lib/student/srs-session.ts` thuần + **20 regression test**.
  Verify: web tests **60/60** · check-docs 8/8 · build sạch · 4 kịch bản runtime chạy thật trên
  production build; fixture đã xoá sạch.


- ✅ (claude · 2026-09-06) **A03 — SRS screen restyled in the Hán Lộ design.** `/student/mistakes`
  was the last learner screen written in the old visual language; it kept `ui.tsx` because it is
  the one screen backed by a real endpoint. Presentation now uses `PageHead`, `Tabs`, `Metric`,
  `LevelSelector`, `Panel`, `EmptyState`, `ErrorState`, `SkeletonPanel` + a new
  `styles/hanlu/srs.css`.
  The substance was the palette: the four rating buttons carried literal Tailwind values
  (`border-red-200`, `text-amber-700`, `bg-white`) — a third colour system that ignored the
  light/dark switch and was near-unreadable on the dark ground. Each rating now passes a semantic
  token in as `--srs-rating`.
  Class names were verified against their definitions (**17 used, 17 defined**) rather than
  assumed — `grid-3`/`grid-4`/`panel--warn` do not exist in the Hán Lộ sheets and would have
  rendered silently unstyled.
  **Unchanged and verified, not asserted**: SM-2, ratings 0/3/4/5, browse/due, HSK 1–9, payloads,
  schema. Self-test against the live API: `?hskLevel=1` then `?hskLevel=9`, due tab hits
  `/flashcards/due`, 0 rating buttons before flip and exactly 4 after, `POST .../review` → 201
  with stats reloading, a card without an example renders nothing rather than inventing one,
  light + dark both above AA (17.39 / 5.12), 375px no overflow, `:focus-visible` and
  `prefers-reduced-motion` present in the served CSS. check-docs 8/8 · web tests 40/40.
  ⚠️ `ui.tsx` is now unused by any real screen but **deleting it is A12**, and `coming-soon.tsx`
  still imports it. Production vocabulary catalog still absent (A10/A11); tested on seeded
  fixtures that were deleted afterwards.


- ✅ (claude · 2026-09-06) **The learner area is now the Hán Lộ UI.** After every PR merged,
  signing in still landed on the old "Hành trình HSK" mock layout — PR #38 had only repainted it
  dark, which was a misreading of the owner's intent. Ported the real design from `16be0b1`:
  38 route files, 6 components, 12 data modules, the six-stylesheet stack, and **17 routes main
  did not have** (`classes`, `assignments`, `attempts`, `exams`, `badges`, `flashcards`, `lego`,
  `placement`, `progress` + detail routes).
  Three things were deliberately **not** taken from the source branch, each of which would have
  been a regression: the login guard is kept (that branch predates PR #32, so routes went inside
  `(app)` rather than flat), `/student/landing` keeps main's public copy, and `/student/mistakes`
  keeps main's SRS file — the source branch's is 271 lines with zero API calls, main's is wired
  and has 6 e2e tests.
  `check-docs.mjs` fixed in the same commit: its status-drift check did not know route groups
  exist and reported every moved route as missing. Proven to still fire against a deliberately
  removed page.
  **Verified in a browser**: sign-in lands on Hán Lộ ("Hành trình HSK" gone from the page);
  anonymous `/student` **and** the new `/student/classes` both redirect to `/login?next=<path>`;
  landing still public. Web build clean · API **170/170 across 27 suites** · web tests 36/36 ·
  check-docs 8/8.
  ⚠️ **17 new routes, most with no backend.** `classes` has a real API; `assignments`, `attempts`,
  `exams`, `placement`, `progress` do not — those screens run on the source branch's mock data and
  need auditing against `WEB-011` before anyone trusts them.


- ✅ (claude · 2026-09-05) **`/student/landing` restored and made public.** The route 404'd: it
  existed only on `feat/student-hanlu-ui`, whose PR #24 was closed without merging. Ported the
  page plus `SiteShell`, `landing-data`, the three.js teacher stage and the student `Modal`,
  and added the `three` dependency, which `main` lacked.
  The real work was the guard interaction: PR #32 had just put **every** `/student` route behind
  `RequireAuth`, so restoring the files alone gave a landing page that rendered and then
  redirected to `/login?next=%2Fstudent%2Flanding` — and it sat inside `StudentShell`, which put
  a learner sidebar around a page that brings its own `SiteShell`. Guarded routes moved into a
  `(app)` route group; route groups add nothing to the URL, so `/student` and the eight learner
  routes keep their paths (confirmed in the build output).
  **Verified in a browser on a production build**: anonymous `/student/landing` stays put and
  renders fully (teacher carousel, 3D canvas, stats) with no sidebar; anonymous `/student` still
  redirects to `/login?next=%2Fstudent`; 375px has no horizontal overflow.
  ⚠️ Recorded as `WEB-017`: the page is prototype content — invented teachers and student results
  — and it is now the one page a stranger can read without logging in.

_(work done outside sprint order. Recorded so another agent does not rebuild it, and so
nobody mistakes a mock for a finished feature. See `working-rules.md` § Definition of Done.)_

- ✅ (opencode · 2026-09-03) **Admin API review + test plan + independent verification** —
      cross-reviewed the admin-area backend on `feat/student-hanlu-ui` @ `5e70873`
      (foundation + auth + admin users + lifecycle, written by antigravity) against
      `01-auth.md` (accepted) and `02-users.md` (proposed). Output:
      `docs/testing/TEST_PLAN_ADMIN_API.md` (findings, 24+18 invariant coverage matrices,
      prioritized backlog, run log) + `docs/testing/_INDEX.md`. **3 consecutive runs 63/63,
      0 fail** from a cold worktree (HANDOFF said 64 — actual 63). Filed: **API-011**
      (lifecycle accepts invalid source states — High), **API-012** (replay error code),
      **API-013** (no account notifications), **API-014** (unspecced admin class-read
      endpoints), **DOC-015** (TEST_STRATEGY.md stale). Claim-before-code was skipped (work
      was read-only review + docs; noted in the session file). Branch
      `docs/admin-api-test-plan`.

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

- 🔶 **`/admin/invoices`** (Antigravity · 2026-09-05) — Wire live backend API (GET /admin/invoices, meta.summary)
- 🔶 **`/admin/invoices/[invoiceId]`** (Antigravity · 2026-09-05) — Wire live backend API (GET /admin/invoices/:id, void, payments)
- 🔶 **`/admin/invoices/generate`** (Antigravity · 2026-09-05) — Wire live backend API (preview, batch generate)
- 🔶 **`/admin/payroll/sessions`** (Antigravity · 2026-09-05) — Wire live backend API (GET /admin/sessions/pending, approve, reject)
- 🔶 **`/admin/payroll`** (Antigravity · 2026-09-05) — Wire live backend API (GET /admin/payroll, POST /admin/payroll, DELETE draft)
- 🔶 **`/admin/payroll/[periodId]`** (Antigravity · 2026-09-05) — Wire live backend API (GET /admin/payroll/:id, finalize, pay)
- 🔶 **`/admin/pay-rates`** (Antigravity · 2026-09-05) — Wire live backend API (GET/POST /admin/pay-rates append-only)
- 🔶 **`/admin/tuition-rates`** (Antigravity · 2026-09-05) — Wire live backend API (GET/POST /admin/tuition-rates append-only)
- 🔶 **`/admin/monitoring`** (Antigravity · 2026-09-05) — Wire live backend API (GET /admin/monitoring/gemini, health probes)
- 🔶 **`/admin`** (Antigravity · 2026-09-05) — Wire live backend API (GET /admin/dashboard/stats)


---

## Freeform notes (add as needed)
_(use this space for quick notes not yet clear enough to become their own checklist item)_

---

## Needs from the other lane
_(discovered while mapping the Admin UI — 2026-08-13)_

- [x] (fe → be) **`GET /api/v1/admin/payroll/:id`** — implemented & verified (Module 05, PR #14).
- [x] (fe → be) `GET /api/v1/admin/pay-rates` + `GET /api/v1/admin/tuition-rates` — implemented append-only history (ADR-008, Modules 05 & 06).
- [x] (fe → be) `POST /api/v1/admin/invoices/batch` + preview endpoint for `/admin/invoices/generate` — implemented & verified (Module 06).
- [x] (fe → be) `GET /api/v1/admin/monitoring/gemini` + `/admin/monitoring/health` (ADR-014, Module 08).
- [x] (fe → be) `GET /admin/invoices` meta.summary + `/admin/invoices/summary` endpoint (Module 06).
- [ ] (fe → be) `GET /admin/users/:id` needs role-scoped history embedded (student:
      enrollments+attempts, teacher: classes+sessions)
- [x] (fe → be) `GET /admin/sessions/pending` with actual time, topic, notes, attendance embedded (Module 04).
- [x] (fe → be) `GET /admin/dashboard/stats` — implemented & verified (Module 08).
- [x] (be) ~~Entire `INVOICE_*` family missing~~ — 2026-08-14: added `INVOICE_*`, `RATE_*`,
      `SESSION_*`, `AI_*` to `API_ERROR_CODES.md`, agreed & coded.
- [x] (be) ~~Missing endpoints~~ — 2026-09-05: all endpoints implemented in live NestJS modules.
- [ ] (be) **`packages/types` does not exist** — no shared contract between the two lanes.
      This is the most important unlock; it must be the first commit of a parallel session

## Business decisions

| # | Decision | Locked on 16/08 as | ADR |
|---|---|---|---|
| 1 | Tuition model (`A-INV-1`) | **flat per month, one rate per student** — matches `billingCycle: monthly` in the entity | ✅ ADR-013 Accepted |
| 2 | Pay rate unit (`A-PAY-1`) | **dual-mode**: `per_session` + `per_hour`. **No** `fixed_monthly` | ✅ ADR-012 Accepted |
| 3 | Payroll period boundary (`A-PAY-4`) | **calendar month** | ✅ ADR-012 Accepted |
| 4 | Gemini API key (`UC-A-005`) | **one shared platform key**, no BYOK | ✅ ADR-014 Accepted |
| 5 | Registration rejection (`UC-A-001`) | **soft rejection** — keep the record, no hard delete | ⬜ needs ADR-011 — `User.status` currently has **no** `rejected` state, needs a migration |

### Still unsettled — blocks backend

- [x] **Money representation** — resolved in ADR-010: `Decimal(12,2)` in DB with 0-cent constraints, string serialization over HTTP.
- [ ] **SCOPE-01 — Classes/Enrollment scope**: full implementation or just enough for Sessions?
      `Class` + `ClassEnrollment` have no endpoints in `API_ADMIN.md`, yet
      Sessions/Attendance and Payroll depend on them. → blocks modules 03, 04, 05.
      Two options + recommendation: `docs/api/modules/03-classes-enrollment.md` §16
- [x] **C2 — two rate-reading formulas contradict each other** — resolved in ADR-008 & ADR-010 (append-only strictly wins, no `effectiveTo`).
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

_(specs written 2026-08-19, `docs/api/modules/`. **Re-verified 2026-09-09**: `apps/api` now
implements modules 01–06 + 08 plus Teacher lessons/questions/sessions and Student
flashcards/SRS — 13 e2e suites against live databases, last recorded full run 170/170.
`packages/` still does not exist at all.)_

> ⚠️ **These 8 modules are the Admin area only.** The Teacher backend has **no module spec at
> all** — the FE is 9 built (mocked) screens with every endpoint listed in `API_TEACHER.md`, but
> no invariants, transaction boundaries or test matrices behind them. Gap map:
> `docs/api/modules/_INDEX.md` § 11 (added 2026-09-01).

| # | Module | Spec | Status | INV | Blocked by |
|---|---|---|---|---|---|
| 1 | Auth | `01-auth.md` | ✅ accepted · implemented | 24 | — |
| 2 | Users | `02-users.md` | ⚠️ conflict: `_INDEX` table says accepted (since `41f3ff1`), spec frontmatter says `proposed` — owner decides · implemented | 18 | DOC-005 (`rejected` state, ADR-011 Proposed) |
| 3 | Classes+Enrollment | `03-classes-enrollment.md` | ✅ accepted · implemented | 8 | — |
| 4 | Sessions+Attendance | `04-sessions-attendance.md` | ✅ accepted · implemented | 16 | — |
| 5 | Payroll+PayRates | `05-payroll.md` | ✅ accepted · implemented | 33 | — |
| 6 | Billing | `06-billing.md` | ✅ accepted · implemented | 34 | — |
| 7 | Notifications | `07-notifications.md` | 🔶 proposed · **not implemented** | 21 | no endpoint defined yet (Sprint 6 scope, `DEBT-002`) |
| 8 | Dashboard | `08-dashboard.md` | ✅ accepted · implemented (⚠️ monitoring probes are stubs — see KNOWN_ISSUES) | 14 | — |

**168 invariants**, each with a matching test line in module section 15. Modules 01, 03–06, 08
are accepted and implemented; 02 is implemented but its spec status is in conflict (see
`_INDEX.md` §1 note); 07 is the only module with no code.

### Backend — Teacher module specs

- 🔶 (claude · 2026-09-01) **API surface gaps closed, module specs not started.**
  `API_TEACHER.md` § Lessons written (8 endpoints, `API-007` closed) + `LESSON_*` error family
  (*proposed, not agreed*); `API-006` route convention settled **role-prefixed** by the owner and
  applied to `docs/api/modules/03-classes-enrollment.md`. Full gap map in
  `docs/api/modules/_INDEX.md` § 11.
- 🔶 (opencode · 2026-09-03) **Teacher module specs WRITTEN — 6 files, 36 endpoints, 46 new
  invariants** in `docs/api/modules/teacher/` (`_INDEX.md` + `01-classes-lessons` ·
  `02-question-bank` (Mongo, §7/§12 rethought) · `03-assignments` · `04-attempts-grading`
  (AI-suggest specced but **parked** per owner) · `05-sessions` (teacher-side transitions +
  `session_submitted_for_review` producer — closes the `API-004` producer hole) ·
  `06-income` (read-only, no rate math — closes Q-PAY-7)). All `proposed`, awaiting BE-owner
  sign-off. Owner settled 2026-09-03: SCOPE-01 teacher slice = teacher-side full management;
  Income = read-only stored data. **Error codes settled same day (API-010 resolved)**:
  `SESSION_INVALID_TRANSITION` / `QUESTION_IN_USE` / `ATTEMPT_NOT_SUBMITTED` added as agreed +
  `LESSON_*` (6 codes) signed off → the code phase is unblocked on codes.
  **Code not started** — only gate left: auth PR (Antigravity, in flight) landing on main.
  Branch `feat/api-teacher-specs`.
- 🔶 (opencode · 2026-09-03) Teacher-side Sessions transitions (`scheduled → in_progress → completed_pending`) — **specced** in
  `docs/api/modules/teacher/05-sessions.md` (producer of `session_submitted_for_review`;
  re-submit after reject stays open as Q-SES-2). **Code not started** — the endpoints still do
  not exist anywhere; `API-004` stays open until they do.
- ✅ (opencode · 2026-09-03) Lesson row in `RBAC_MATRIX.md` / `PERMISSIONS_TEACHER.md` — added with the spec set (owner-approved
  via the 2026-09-03 plan); ownership inherited from the parent class per `ENTITY_LESSON.md`

### Backend — not started

- ⬜ ADR-009 risk-based testing · ADR-010 money · ADR-011 account lifecycle ·
  ADR-012 payroll · ADR-013 tuition · ADR-014 Gemini key
- ⬜ `packages/types` — transport contract (OpenAPI/Zod). Nest DTOs implement it,
  **not** generated from Nest DTOs
- ⬜ `turbo.json` (BUILD-001) — file exists on disk but is **untracked**; `git add turbo.json`
- ⬜ Phase 1 infra: envelope interceptor · exception filter · error enum ·
  Prisma + migration `User` · Swagger `/api` · `/health` + `/ready` · CI + migration rehearsal
- ⬜ Phase 2: Auth module

---

## Active work — student identity slice

- ✅ (opencode · 2026-09-08) **A11 — Importer từ vựng** (branch `feat/a11-vocab-importer`,
      stack trên `docs/a10-vocab-audit`; 3 commits: claim → source copy + decisions → importer).
      Owner đã duyệt 3 điều kiện mở khóa A10 (provenance, `words[]`, copy nguồn vào repo) —
      nguồn giờ ở `apps/api/content/writing.json`, quyết định import trong
      `docs/content/VOCAB_SOURCE_AUDIT.md` §6.
      Importer theo đủ 8 rule của prompt A11: **dry-run mặc định** (CLI không có `--apply`
      thì không ghi gì), báo cáo valid/invalid/duplicate/conflict từng record (29 conflict
      hiện ra đầy đủ, winner = level thấp nhất + source order, loser được liệt kê không bỏ
      âm thầm), apply tường minh in rõ DB+collection đích, **idempotent** — upsert theo
      `hanzi` (bất kể level) giữ nguyên `_id` nên rerun không trùng lặp và level-change không
      tạo row thứ hai, **không đụng `user_flashcard_states`** (test riêng chứng minh state
      sống sót qua import), không drop collection/reset DB, failure giữa chừng → 1 retry/op
      + rerun là recovery (đã gặp thật: 1 monitor-timeout Atlas, retry chữa, exit 0).
      Không đổi schema/index.
      Verification: pure tests **11/11** (counts khớp audit độc lập: 1.228 → 1.119, per-level
      922/50/40/32/25/16/12/11/11) · e2e sandbox trên Atlas thật **7/7** (dry-run không ghi,
      apply-idempotent, `_id` ổn định, state-guard, partial-failure recovery) · CLI dry-run
      thật trên `hsk_dev.flashcards`: **errors 0, would create 1.118 + update 1** ·
      `nest build` + `tsc --noEmit` sạch · `check-docs` 8/8.
      ⚠️ Full API suite NOT RUN (Docker tắt, không Postgres) — chỉ 2 file test mới chạy
      standalone.
      **APPLY THẬT đã chạy (owner "làm luôn", 2026-09-08) vào `hsk_dev.flashcards`:**
      lần 1 created 1.118 + updated 1 · lần 2 (chứng minh idempotent) created 0, updated
      1.119 · **errors 0 cả hai lần**. Verify DB trực tiếp sau import: tổng 1.120 thẻ
      (1.119 `hanlo` + 1 thẻ `学习` HSK3 fixture seed cũ `hsk3-core` đã có sẵn trong dev) ·
      per-level 922/50/41/32/25/16/12/11/11 (level-3 có 41 vì fixture cũ đếm thêm) · thẻ
      `学习` tồn tại 2 row (HSK1 hanlo + HSK3 fixture) — importer đã báo đúng "1
      pre-existing same-hanzi duplicate", theo thiết kế không tự gộp ·
      `user_flashcard_states` = 0 docs trong dev, không state nào bị ảnh hưởng. **Lưu ý
      deploy:** seed `prisma/seed.ts` hiện có thể vẫn chèn fixture `学习` — cần rà trước khi
      đưa lên môi trường khác để tránh trùng lặp tương tự; DB production chưa được import
      (việc này thuộc deploy pipeline, chạy `vocab:import` tường minh).

- ✅ (opencode · 2026-09-08) **A10 — Kiểm kê nguồn từ vựng** (branch `docs/a10-vocab-audit`).
      READ-ONLY audit xong, docs đã duyệt. **Kết quả chính: corpus ngoài KHÔNG có file
      vocabulary riêng** (11 file, không file nào là danh sách từ HSK). `writing.json` là bộ
      dữ liệu CHỮ (587 entries: 500/27/17/12/10/6/5/5/5 theo level 1–9); ứng viên từ vựng tốt
      nhất là 1.228 `words[]` nhúng (không có level/id riêng). `levels.json` khai báo 10.110
      `newWords` chỉ là con số trang trí — không có word list tương ứng. 3 lỗi dữ liệu:
      `喜欢` (2 chữ) lẫn trong list chữ, `strokes.json` phủ 59/586 chữ, level-1=500 chữ trùng
      số TỪ HSK 3.0 (file dựng từ word list). Mapping vào `Flashcard` đủ 4 field bắt buộc
      (level→hskLevel, char/word→hanzi, pinyin, vi→meaning) nhưng map thẳng sẽ mất 8 field
      chữ-specific. **Import BLOCKED**: provenance/license không rõ + owner chưa quyết
      words-vs-characters + nguồn chưa repo-owned. Audit + unlock conditions +
      review-state protection: `docs/content/VOCAB_SOURCE_AUDIT.md`. Không copy data, không
      ghi DB, không đổi schema. A11 chỉ bắt đầu khi 3 điều kiện mở khóa được duyệt.

- 🔶 (opencode · 2026-09-07) **A07 — Form tham gia lớp thật** (commit `abf6def`, branch
      `codex/a07-student-join-class`, base `codex/a06-student-classes-list` @ `2f12310`
      — A06 chưa có PR/merge, stack có báo theo tiền lệ A05).
- ✅ (opencode · 2026-09-08) **A09 — Rời lớp Student theo server thật**
  Reused the existing A08 `DELETE /student/classes/:id/leave` wiring and completed the A09
  acceptance surface: cancel sends zero DELETE requests, confirm is ref-locked and disabled while
  pending, server failures stay inline without removing the class or redirecting, and success
  redirects only after the server confirms `status=dropped`. Leave errors map the documented
  registry codes (`CLASS_NOT_ENROLLED`, `CLASS_ACCESS_DENIED`, `CLASS_NOT_FOUND`,
  `VALIDATION_ERROR`) without guessing causes. The class list no longer contains the stale A07
  unavailable placeholder. Rejoin remains server-owned and uses the accepted existing-row
  reactivation rule; no backend/schema/RBAC change was made.
  Verification: 35/35 A08/A09 detail tests · full web script suite **145/145** (serial) ·
  `pnpm --filter web build` clean 42/42 routes, zero warnings · `check-docs` 8/8. Live leave →
  reload → deep-link denial → rejoin was **NOT RUN** because Docker's Postgres/API engine was
  unavailable.

- ✅ (opencode · 2026-09-07) **A07 — Form tham gia lớp thật** (PR #48, commit `abf6def`).
      Join modal trên `/student/classes` nối `POST /student/classes/join`, payload đúng
      `{ enrollmentCode }` qua `apiRequest`. Shape check client mirror JoinClassDto
      (trim+uppercase+8 ký tự, message tiếng Việt của DTO); tồn tại mã là việc server —
      lỗi map theo **registry code** (`CLASS_ENROLL_CODE_INVALID`/`CLASS_ALREADY_ARCHIVED`/
      `CLASS_ALREADY_ENROLLED`/`VALIDATION_ERROR`), không đoán HTTP. Success chỉ sau khi
      server xác nhận (toast + đóng + refetch); fail giữ input + lỗi inline; double-submit
      chặn bằng ref-lock (pattern A04). Rejoin = việc server (§8.1) — FE coi là success
      thường. Kèm fix 2 finding của TEST A06 trên đúng trang: bỏ CSS literal token
      không tồn tại (`--surface-muted`/`--fg-muted`) và sub-line error không còn copy
      empty-state.
      Verification: 101/101 `node --test apps/web/scripts/*.test.mjs` (17 test mới
      `student-join.test.mjs`), `check-docs` 8/8, `pnpm --filter web build` sạch.
       ⚠️ **Live self-test was BLOCKED** (Docker engine unavailable → no Postgres/API):
       enrollment-tồn-tại-sau-reload và teacher-roster thấy fixture student CHƯA chạy —
       không tính PASS; cần chạy lại khi có API.

- ✅ (antigravity · 2026-09-07) **A08 — Chi tiết lớp Student từ API thật**
  Nối /student/classes/[classId] và /student/classes/[classId]/lessons/[lessonId] vào endpoint thật GET /student/classes/:id qua classes-service.ts và rules classes-rules.ts.
  Loại bỏ hoàn toàn fixtures lms-data.ts và DemoStateSwitcher.
  Xử lý đủ 7 trạng thái UI theo contract: loading (SkeletonPanel), invalid_id (UUID validation), not_found (404), forbidden (403), error (ErrorState kèm thử lại), empty (0 lessons), ready (chi tiết lớp và danh sách bài học thật).
  Bảo mật & RBAC: không để lộ enrollmentCode (INV-CLASS-07), không lộ danh sách học viên cùng lớp, không tự chế số bài tập.
  Hiển thị thông báo "Chưa khả dụng" cho chi tiết bài học / bài tập chưa có endpoint approved theo API_STUDENT.md.
  Leave class now calls DELETE /student/classes/:id/leave, uses a submit lock, keeps the modal open on
  server failure, and redirects only after the server confirms status=dropped.
  Verification: 31/31 tests trong student-class-detail.test.mjs, full web script suite passed serially,
  check-docs 8/8 passed, production build web 42/42 pages passed sạch sẽ.
  ⚠️ Live API/browser self-test NOT RUN: Docker Desktop engine unavailable in this environment.

- ✅ (antigravity · 2026-09-07) **A06 — Danh sách lớp Student từ API thật**
  Nối màn hình /student/classes vào endpoint thật GET /student/classes qua service
  classes-service.ts và rules classes-rules.ts.
  Loại bỏ hoàn toàn mock fixture studentClasses và DemoStateSwitcher.
  Xử lý đủ 7 trạng thái: loading (SkeletonPanel), empty (chưa tham gia lớp nào),
  error (ErrorState kèm nút thử lại), ready (thẻ lớp học với ID và tên giáo viên thật).
  Bảo mật dữ liệu: không để lộ enrollmentCode, không tự chế số bài tập chưa làm (openCount).
  Nút/Modal tham gia lớp (Join) được đánh dấu đang kết nối ở TASK A07, không giữ fake-success cục bộ.
  Verification: 84/84 tests `node` --test apps/web/scripts/*.test.mjs (14 test mới thuộc student-classes.test.mjs),
  check-docs 8/8, production web build 42/42 static/dynamic pages sạch.

- ✅ (codex · 2026-09-06) **A01 — Student shell/dashboard shows the correct account**
  (commit `cea59de`, branch `codex/a01-student-shell-identity`, base `cada414`).
  Resolved `WEB-015`: replaces hardcoded mock fixture ("Mai Anh") with authenticated
  `AuthUser.nickname` via `useDisplayIdentity()` across `/student` dashboard greeting,
  sidebar userchip, and student profile dialog/sheet.
  Enforces neutral fallback ("Học viên" / "HV") and skeleton loading state during session
  restore (`status !== 'authenticated'`). Mock progress figures (XP, streak, rank, level)
  remain untouched until real endpoints arrive.
  Verification: 40/40 tests in `node --test apps/web/scripts/*.test.mjs`, `node scripts/check-docs.mjs`
  all 8 passed, `pnpm --filter web build` exit 0 (42/42 pages).
  Playwright follow-up: `tests/student-identity.spec.ts` 8/8 + `tests/student-identity-null.spec.ts`
  2/2 (two real accounts incl. real-form login, delayed-restore, long-name 375px, NULL fallback),
  production build, desktop + mobile, screenshots read, zero console errors. Test fixtures cleaned.
- ✅ (codex · 2026-09-06) **A02 — Tách demo khỏi dữ liệu Student production**
  (branch `codex/a02-isolate-demo`, base `b3c5c02`, impl commit `a4f440f`).
  Isolate demo/local progress from real accounts per A00 matrix: gate DemoStateSwitcher
  strictly behind dev (`process.env.NODE_ENV !== 'production'`, resolving `WEB-016`), separate
  UI preferences from demo progress (`hanlu-preferences`, legacy `hanlu-student` read
  non-destructively, never wiped), prevent ?demo=1 or storage flags from enabling demo in
  production, XP unlock + progress writes demo-only, and all 20 backend-less routes render
  `UnavailableState` in production (dev/demo keeps the full mock experience). The production
  dashboard shows only the three live features (flashcards, mistakes, classes) instead of
  mock progress widgets. No DB schema/Auth/RBAC/money change.
  Verified: 50/50 `node --test apps/web/scripts/*.test.mjs` (10 new), `pnpm --filter web build`
  green, A02 Playwright spec 9/9 pass + 1 deliberate skip (desktop + 375px, production build,
  real login `student@hsk.local`, console clean), generic student screen check 36/36 after
  adding the missing student account to `screens.spec.ts`.
  ⚠️ **Remaining demo-isolation gaps, owned by A03/A05, not counted here**: `/student/flashcards`
  still rates through the Leitner local store and `/student/mistakes/review` still reviews the
  local mistakes store in production — both are the recorded A00/DOC-016 presentation-rewire
  scope (Sprint 4 backend for mistake collection does not exist yet); gating them would remove
  the only live learning feature, rewiring them is A03/A05's task.

## Foundation / Grammar design work — 2026-09-10

- ✅ (codex) DOCS deliverables only, `codex/foundation-grammar-contracts`: source audit and proposed
  Foundation/Grammar contracts prepared after explicit approval of step 1.
  No application, schema, Auth, RBAC, money or production-content changes are authorized.
  Production remains NOT IMPLEMENTED; source rights/media and transport approval are blockers.

- ⛔ Foundation/Grammar production: content/progress/assessment/media operation contracts remain
  missing; see docs/api/modules/student/02-foundation-grammar.md decisions D1–D5. The proposal
  adds no endpoint, physical schema, permission or runtime behavior.

- Foundation/Grammar docs publication: **BLOCKED by automatic approval review**. Local audit/design
  commits are ready, but publishing this payload to public `nhatanhcoder/git-practice` requires
  explicit owner confirmation. No push/PR/merge/deploy occurred for this documentation task.

- Foundation/Grammar documentation publication approved by the owner; branch pushed and
  PR #54 opened: https://github.com/nhatanhcoder/git-practice/pull/54. The publication blocker
  above is cleared. D1–D5 still block implementation; no merge or deployment.
