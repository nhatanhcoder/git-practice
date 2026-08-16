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
      (2026-08-14) — 7 doc invariants enforced in CI, each verified to fire against a
      deliberately broken fixture and to clear afterwards. `pnpm check:docs` runs it locally.
- ⬜ `git add --renormalize .` **not yet run** — until it is, CI's line-ending step fails
      and ~118 files still show as modified (KNOWN_ISSUES GIT-001)
- ⬜ husky pre-commit hook — deferred; CI covers the same ground and cannot be `--no-verify`'d

---

## Off-sprint / spike
_(work done outside sprint order. Recorded so another agent does not rebuild it, and so
nobody mistakes a mock for a finished feature. See `working-rules.md` § Definition of Done.)_

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


---

## Freeform notes (add as needed)
_(use this space for quick notes not yet clear enough to become their own checklist item)_

---

## Needs from the other lane
_(phát hiện khi map UI Admin — 2026-08-13)_

- [ ] (fe → be) **`GET /api/v1/admin/payroll/:id`** — không tồn tại. Chặn toàn bộ màn
      `/admin/payroll/[periodId]`. Dữ liệu đã được `calculatePeriodAmount` tính sẵn
      (`FLOW_PAYROLL_CYCLE` §3) nhưng không có endpoint để lấy
- [ ] (fe → be) `GET /api/v1/admin/pay-rates` + `GET /api/v1/admin/tuition-rates` — hiện chỉ có POST,
      không lấy được danh sách/lịch sử (ADR-008 yêu cầu hiển thị lịch sử)
- [ ] (fe → be) `POST /api/v1/admin/invoices/batch` + endpoint preview cho `/admin/invoices/generate`
- [ ] (fe → be) `GET /api/v1/admin/monitoring/gemini`
- [ ] (fe → be) `GET /admin/invoices` cần `meta.summary` (đã thu n/total, tổng thu, còn nợ)
- [ ] (fe → be) `GET /admin/users/:id` cần nhúng lịch sử theo role (student: enrollments+attempts,
      teacher: classes+sessions)
- [ ] (fe → be) `GET /admin/sessions/pending` cần nhúng giờ thực tế, chủ đề, ghi chú, **điểm danh**
- [ ] (fe → be) `GET /admin/dashboard/stats` — chốt shape payload trước khi build
- [x] (be) ~~Thiếu toàn bộ nhóm `INVOICE_*`~~ — 2026-08-14: đã thêm `INVOICE_*`, `RATE_*`,
      `SESSION_*`, `AI_*` vào `API_ERROR_CODES.md`, **đánh dấu *proposed, not agreed***.
      Chưa dùng được cho tới khi BE owner duyệt
- [x] (be) ~~Endpoint thiếu~~ — 2026-08-14: cả 7 endpoint đã được ghi vào `API_ADMIN.md`
      § *Referenced by FE contracts, not yet defined*. **Ghi ra không phải là chốt** — vẫn
      chặn, vẫn cần BE owner ký từng dòng
- [ ] (be) **`packages/types` chưa tồn tại** — không có contract chung nào giữa hai lane.
      Đây là việc mở khoá quan trọng nhất, phải là commit đầu tiên của session song song

## Quyết định nghiệp vụ chưa chốt (chặn build)

- [ ] Mô hình học phí: theo lớp / gói / tháng (`FEATURES_ADMIN` A-INV-1) → chặn `/admin/tuition-rates`
- [ ] Đơn vị tính lương (`A-PAY-1`) → chặn `/admin/pay-rates`
- [ ] Ranh giới kỳ lương — có phải tháng dương lịch? (`A-PAY-4`)
- [ ] Gemini API key: dùng chung hay mỗi teacher một key (`UC-A-005`) → chặn `/admin/monitoring`
- [ ] Từ chối đăng ký: xoá account hay giữ `pending` (`UC-A-001` Alternative) → chặn `/admin/users`
