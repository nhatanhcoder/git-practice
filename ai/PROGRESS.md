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
- ⬜ Turborepo + pnpm workspace, eslint, prettier, husky pre-commit
- ⬜ NestJS app (`apps/api`) + Prisma + Mongoose + Swagger + Global Pipes/Filters
- ⬜ Next.js app (`apps/web`) + Tailwind + shadcn/ui + Axios interceptors + Zustand skeleton
- ⬜ Supabase PostgreSQL + MongoDB Atlas init, first migration + seed script
- **DoD**: API runs on :3001 (Swagger `/api`), Web runs on :3000 and connects to API, CI passes lint+build

## Sprint 1 — Auth & Users
- ⬜ F1.1 Account registration (status `pending`, bcrypt cost 12)
- ⬜ F1.2 Login (JWT access 15min + refresh 7d, rate limit 5 attempts/15min)
- ⬜ F1.3 Account approval (Admin)
- ⬜ F1.4 Profile management
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

## Freeform notes (add as needed)
_(use this space for quick notes not yet clear enough to become their own checklist item)_
