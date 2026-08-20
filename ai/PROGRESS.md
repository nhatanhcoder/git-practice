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
- ✅ **Bước 7 (Record) giờ được enforce bằng máy** — 2026-08-19.
  `working-rules.md` § The flow thêm bảng **Hai loại task**: task docs/spec/rule cũng phải làm
  bước 7, không chỉ task build màn. DoD thêm mục 4 (session file) và mục 5 (index của bộ doc).
  `.github/workflows/docs-check.yml` thêm step **Record step was not skipped**: PR đổi ≥50 dòng
  trong `docs/ apps/ prisma/ packages/ .agents/skills/` mà không đụng `ai/PROGRESS.md` hoặc
  không có file dưới `ai/context/sessions/` → **fail, chặn merge**.
  Lý do: session 2026-08-19 viết 8 module spec (~3.900 dòng) và không ghi PROGRESS dòng nào.
- ✅ **Khôi phục rule fast-verify** — 2026-08-19. Bản "Verify — FAST by default" từng viết ở
  branch `chore/fast-verify-rule` rồi **mất khi chuyển branch vì chưa commit**. Đã viết lại,
  kèm ghi chú để lần sau nhận ra nếu nó biến mất nữa.
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

## Quyết định nghiệp vụ

> ⚠️ **Doc drift đã phát hiện 2026-08-19.** Năm quyết định dưới đây **đã được người dùng
> duyệt ngày 2026-08-16** (ghi trong `ai/context/HANDOFF.md` § 2026-08-16, mục *Temporary
> decisions to preserve*) nhưng file này vẫn ghi là chưa chốt suốt 3 ngày. Đã sửa.
>
> **Chúng vẫn chưa phải ADR.** Một dòng trong HANDOFF không phải quyết định kiến trúc có
> hiệu lực — HANDOFF là nơi ghi thứ *tạm thời và dễ quên*. Trước khi code backend đụng
> schema, cả năm phải thành ADR trong `docs/shared/decisions/`.

| # | Quyết định | Chốt ngày 16/08 là | ADR |
|---|---|---|---|
| 1 | Mô hình học phí (`A-INV-1`) | **flat theo tháng, mỗi học sinh một mức** — khớp `billingCycle: monthly` trong entity | ⬜ cần ADR-013 |
| 2 | Đơn vị tính lương (`A-PAY-1`) | **dual-mode**: `per_session` + `per_hour`. **Không** thêm `fixed_monthly` | ⬜ cần ADR-012 |
| 3 | Ranh giới kỳ lương (`A-PAY-4`) | **tháng dương lịch** | ⬜ cần ADR-012 — còn thiếu timezone, biên đóng/mở, chống chồng lấn |
| 4 | Gemini API key (`UC-A-005`) | **một key dùng chung của nền tảng**, không BYOK | ⬜ cần ADR-014 |
| 5 | Từ chối đăng ký (`UC-A-001`) | **soft rejection** — giữ bản ghi, không hard delete | ⬜ cần ADR-011 — `User.status` hiện **không có** state `rejected`, cần migration |

### Vẫn chưa chốt — chặn backend

- [ ] **Biểu diễn tiền** — chưa từng được hỏi. Entity đang `Decimal(10,2)`/`Decimal(12,2)`,
      mà VND không có đơn vị phụ. Cần chốt rounding, arithmetic, JSON serialization.
      Prisma `Decimal` **không được** lọt thẳng ra API response. → chặn module 05, 06
- [ ] **SCOPE-01 — phạm vi Classes/Enrollment**: làm đầy đủ hay tối thiểu đủ cho Sessions?
      `Class` + `ClassEnrollment` không có endpoint nào trong `API_ADMIN.md`, mà
      Sessions/Attendance và Payroll phụ thuộc chúng. → chặn module 03, 04, 05.
      Hai phương án + đề xuất: `docs/api/modules/03-classes-enrollment.md` §16
- [ ] **C2 — hai công thức đọc rate mâu thuẫn nhau** (xem `API-002` trong KNOWN_ISSUES).
      → chặn mọi phép tính tiền

---

## Backend — module spec

_(spec viết 2026-08-19, `docs/api/modules/`. Chưa có dòng code backend nào.
`apps/api` chưa tồn tại, `packages/` vẫn rỗng.)_

| # | Module | Spec | Status | INV | Chặn bởi |
|---|---|---|---|---|---|
| 1 | Auth | `01-auth.md` | ✅ accepted | 24 | — |
| 2 | Users | `02-users.md` | 🔶 proposed | 18 | C1 · C3 (cần migration `rejected`) |
| 3 | Classes+Enrollment | `03-classes-enrollment.md` | ⛔ deferred | 8 | **SCOPE-01** |
| 4 | Sessions+Attendance | `04-sessions-attendance.md` | 🔶 proposed | 16 | SCOPE-01 |
| 5 | Payroll+PayRates | `05-payroll.md` | 🔶 proposed | 33 | tiền · C2 · timezone kỳ lương |
| 6 | Billing | `06-billing.md` | 🔶 proposed | 34 | tiền · C2 |
| 7 | Notifications | `07-notifications.md` | 🔶 proposed | 21 | chưa có endpoint nào định nghĩa |
| 8 | Dashboard | `08-dashboard.md` | ⛔ deferred | 14 | làm cuối, theo thiết kế |

**168 invariant**, mỗi cái có dòng test tương ứng ở mục 15 của module — invariant gate thay
cho coverage %.

**Chỉ Auth đủ điều kiện code ngay.**

### Backend — chưa bắt đầu

- ⬜ ADR-009 risk-based testing · ADR-010 tiền · ADR-011 vòng đời tài khoản ·
  ADR-012 payroll · ADR-013 học phí · ADR-014 Gemini key
- ⬜ `packages/types` — transport contract (OpenAPI/Zod). Nest DTO implement nó,
  **không** sinh types từ Nest DTO
- ⬜ `turbo.json` (BUILD-001) — có 2 app rồi, không hoãn thêm được
- ⬜ Phase 1 hạ tầng: envelope interceptor · exception filter · error enum ·
  Prisma + migration `User` · Swagger `/api` · `/health` + `/ready` · CI + migration rehearsal
- ⬜ Phase 2: module Auth
