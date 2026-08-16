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

## [2026-07-27] — AI context cleanup & translation to English — manual (Claude.ai)

**Done**:
- Translated all active `ai/` files and root `AGENTS.md` / `CLAUDE.md` to English
- Fixed path mismatch: `HANDOFF.md` now lives at `ai/context/HANDOFF.md` (previously at `ai/HANDOFF.md`, which didn't match the path `AGENTS.md`/`CLAUDE.md` already pointed to)
- Removed the stale reference to `ai/DECISIONS.md` in `AGENTS.md` (that file does not exist anywhere in the repo)
- ~~**Found and fixed a data conflict**: this file and `project-brain.md` said HSK level = 1–9; corrected back to **HSK 1–6**.~~ ❌ **This revert was wrong — undone on 2026-08-11.** The premise ("matches all entity specs") was false: `docs/` says 1–9 in 13 places (all entity specs, `GLOSSARY.md`, `DATABASE_SCHEMA.md`, `CONVENTIONS.md`, `SPRINT_PLAN.md`), and 1–6 appeared *only* in the two `ai/context/` summary files. See the 2026-08-11 entry.
- Moved `feature.md`, `feature-root.md`, `PROJECT_SUMMARY.md` into `archive/` (previous entry claimed this was already done, but the files were still at repo root)
- Added a mandatory workflow rule to `ai/rules/working-rules.md`: Analyze → Create a plan → Wait for approval → Begin work

**In progress**:
- No code written yet — project is still at "docs done, code not started"

**Next steps**:
- Confirm the HSK 1–6 vs 1–9 conflict resolution above
- Start Sprint 0 per `docs/roadmap/SPRINT_PLAN.md`

---

## [2026-07-19] — Set up entry point for AI agents — manual

**Done**:
- Added `CLAUDE.md` + `AGENTS.md` at root, pointing to `ai/context/project-brain.md` (project-brain.md already existed but wasn't in the location Claude Code/Antigravity auto-discover)
- Archived 3 stale files (`feature.md`, `feature-root.md`, `PROJECT_SUMMARY.md`) into `archive/` *(note: this step was not actually completed — see 2026-07-27 entry above)*
- Confirmed HSK level = **1–6**, matching all of `docs/entities/`, `GLOSSARY.md`, `DATABASE_SCHEMA.md` — no changes needed
- Added missing links to `ai/rules/`, `ai/known-issues/` in the Key Docs table in `project-brain.md`

**In progress**:
- No code written yet — project is at "docs done, code not started" (matches project-brain.md)

**Next steps**:
- Start Sprint 0 per `docs/roadmap/SPRINT_PLAN.md`
