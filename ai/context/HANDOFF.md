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

## [2026-08-19] — Backend module specs cho toàn bộ Admin — Claude (Cowork)

**Done**:
- **8 module spec** trong `docs/api/modules/` (~3.900 dòng), theo template 16 mục cố định:
  `01-auth` (accepted) · `02-users` · `03-classes-enrollment` (deferred) ·
  `04-sessions-attendance` · `05-payroll` · `06-billing` · `07-notifications` ·
  `08-dashboard` (deferred). Cộng `_INDEX.md` + `_TEMPLATE.md`.
- **168 invariant** đánh số (INV-<MODULE>-NN), mỗi cái có dòng tương ứng ở mục 15 test matrix
  của module đó. Đây là **invariant gate** — thay cho coverage %.
- `docs/BACKEND_PLAN.md` — kế hoạch backend tự đứng một mình, viết cho người chưa biết gì về
  project. Đã qua 3 vòng phản biện.
- `PR_BODY.md` ở root — nội dung PR cho `docs/BACKEND_PLAN.md`, **chưa tạo PR**.

**Temporary decisions to preserve**:
- **Chỉ `01-auth` ở trạng thái `accepted`.** 7 module còn lại `proposed`/`deferred`, chờ ADR.
- Spec **ghi lại mâu thuẫn** trong tài liệu nguồn thay vì tự chọn một bên. Chỗ nào entity và
  API bất đồng, mục 16 của module ghi nguyên trạng + cái nó chặn.
- Không module nào tự bịa mã lỗi. Nhánh lỗi thiếu mã đánh ⛔ ở mục 9.
- Ranh giới module đi theo **transaction boundary**, không theo bảng — nên
  rate+invoice+payment chung một module `06-billing`.

**Blocker / needs follow-up**:
- ⚠️ **Doc drift đã sửa**: 5 quyết định nghiệp vụ được duyệt ở entry 2026-08-16 nhưng
  `ai/PROGRESS.md` vẫn ghi "chưa chốt" suốt 3 ngày. Đã cập nhật PROGRESS.
  **Cả 5 vẫn chưa phải ADR** — một dòng trong HANDOFF không phải quyết định kiến trúc có
  hiệu lực. Cần ADR-011 → ADR-014 trước khi code đụng schema.
- **Biểu diễn tiền chưa từng được hỏi.** Không nằm trong 5 quyết định kia. Entity đang
  `Decimal(10,2)`/`(12,2)` mà VND không có đơn vị phụ. Chặn module 05 và 06.
- **SCOPE-01 chưa quyết** — Classes/Enrollment không có endpoint nào, mà Sessions và Payroll
  phụ thuộc. Hai phương án + đề xuất ở `03-classes-enrollment.md` §16.
- 5 issue mới ghi vào `KNOWN_ISSUES.md`: `API-002` (hai công thức đọc rate → hai số tiền),
  `API-003` (kỳ payroll draft không huỷ được), `API-004` (`/admin/sessions/pending` vĩnh viễn
  rỗng), `DOC-005` (thiếu state `rejected`), `DOC-006` (`nickname` vs `fullName`),
  `DOC-007` (mã lỗi không rõ cái nào dùng được).
- `device_bash` phía máy người dùng chết giữa session ("workspace failed to start") → **không
  chạy được git**. Nhánh, commit, push, PR đều phải làm tay. Lệnh nằm trong tin nhắn chat.

**Next steps**:
1. Viết **ADR-011 → ADR-014** từ 5 quyết định đã duyệt 16/08, để chúng có hiệu lực thật.
2. Trả lời **biểu diễn tiền** (ADR-010) và **SCOPE-01** — hai thứ chặn nhiều nhất.
3. Chốt `API-002` — không viết dòng code tính tiền nào trước khi xong.
4. `01-auth.md` đủ điều kiện code ngay: Phase 1 hạ tầng (`turbo.json`, envelope interceptor,
   error enum, Prisma + migration `User`, Swagger) rồi Phase 2 Auth.

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

## [2026-08-13] — FE design pipeline + scaffold Next.js — Claude Code

**Done**:
- `ai/skills/flow-mapper.md` + `ai/skills/page-designer.md` viết xong (trước đó là file rỗng 0 byte)
- Admin: 13 Page Contract + `admin-flow.md` (UI flow + API map) + `pages/_INDEX.md`
- Admin: 13 Design Spec + `specs/_DESIGN-SYSTEM.md` (phần dùng chung, paste 1 lần)
- `AGENTS.md` / `CLAUDE.md` trỏ tới 2 skill; tạo lại `.gitignore` (trước đó không có)
- ADR-007 (chart palette), ADR-008 (append-only rates)
- Scaffold `apps/web`: Next 14 + TS + Tailwind + pnpm workspace, `pnpm install` chạy được

**In progress**:
- Chưa code màn nào. `apps/web` mới là scaffold mặc định của create-next-app
- File token (`tailwind.config.ts`, `globals.css`, `lib/status.ts`, `components/`,
  `app/admin/layout.tsx`) **chưa ghi** — phải ghi trước khi code `/admin/users`

**Temporary decisions to preserve**:
- Spec = mô tả page + API mapping. Token/component chuẩn nằm ở `specs/_DESIGN-SYSTEM.md`,
  page spec **không lặp lại**. Lý do: Claude Design không đọc được repo, chỉ thấy file được paste
- `ui-ux-pro-max`: chỉ lấy layout/interaction, **không chạy `--design-system`**, không lấy
  palette/font của nó
- `taste-skill`: chỉ dùng cho trang public, không dùng cho dashboard đã đăng nhập

**Blocker / needs follow-up**:
- `.git/index.lock` còn kẹt; worktree nằm **trong** repo tại `.claude/worktrees/` làm 88 file
  .md bị nhân đôi (bản sao đã cũ). Phải `git worktree remove` rồi tạo lại **ngoài** repo
- OneDrive đã sync lại một bản copy ở `C:\Users\nhata\OneDrive\Máy tính\Real` — nguồn trùng
  thứ ba, nên xoá
- API thiếu + 5 quyết định nghiệp vụ chưa chốt → xem `## Needs from the other lane` trong `ai/PROGRESS.md`

**Next steps**:
1. Dọn git lock + worktree
2. Ghi file token vào `apps/web`
3. Code `/admin/users` cho chạy được, rồi **sửa lại template spec** theo cái học được
4. Sau đó mới map Teacher + Student (sai template lúc 13 file thì sửa 13, để tới 39 thì sửa 39)

---

## [2026-08-11] — Resolve HSK 1–6 vs 1–9 conflict — Claude Code

**Done**:
- **HSK level range confirmed = 1–9** (user-confirmed 2026-08-11). Reverted the incorrect 2026-07-27 change: `project-brain.md` and this file now say 1–9, matching all of `docs/`. No `docs/` files needed changing — they were already correct.
- Fixed broken path references to `ai/rules/coding-rules.md` → the file is actually `ai/rules/working-rules.md` (fixed in `CLAUDE.md`, `AGENTS.md`, `project-brain.md`, and the 07-27 entry below).

**Temporary decisions to preserve**:
- None.

**Blocker / needs follow-up**:
- 3 untracked docs are still uncommitted: `docs/entities/postgres/ENTITY_AI_USAGE_LOG.md`, `docs/shared/decisions/005-server-authoritative-exam.md`, `006-external-cron-scheduler.md`. Neither is referenced from `docs/entities/_INDEX.md` / the ADR list yet — check before Sprint 3/4.

**Next steps**:
- Sprint 0 per `docs/roadmap/SPRINT_PLAN.md` — plan presented, awaiting approval. Still no code in the repo.

---
