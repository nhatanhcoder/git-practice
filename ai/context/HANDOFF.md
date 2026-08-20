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

## [2026-08-13] — FE design pipeline + scaffold Next.js — Claude Code

**Done**:
- `ai/skills/flow-mapper.md` + `ai/skills/page-designer.md` written (previously empty 0-byte files)
- Admin: 13 Page Contracts + `admin-flow.md` (UI flow + API map) + `pages/_INDEX.md`
- Admin: 13 Design Specs + `specs/_DESIGN-SYSTEM.md` (shared section, pasted once)
- `AGENTS.md` / `CLAUDE.md` point to the 2 skills; `.gitignore` recreated (did not exist before)
- ADR-007 (chart palette), ADR-008 (append-only rates)
- Scaffold `apps/web`: Next 14 + TS + Tailwind + pnpm workspace, `pnpm install` runs

**In progress**:
- No screen coded yet. `apps/web` is still the default create-next-app scaffold
- Token files (`tailwind.config.ts`, `globals.css`, `lib/status.ts`, `components/`,
  `app/admin/layout.tsx`) **not written** — must be written before coding `/admin/users`

**Temporary decisions to preserve**:
- Spec = page description + API mapping. Standard tokens/components live in `specs/_DESIGN-SYSTEM.md`;
  the page spec **does not repeat them**. Reason: Claude Design cannot read the repo, it only sees pasted files
- `ui-ux-pro-max`: take layout/interaction only, **do not run `--design-system`**, do not take
  its palette/fonts
- `taste-skill`: public pages only, not for authenticated dashboards

**Blocker / needs follow-up**:
- `.git/index.lock` still stuck; worktree lives **inside** the repo at `.claude/worktrees/`
  duplicating 88 .md files (copies are stale). Must `git worktree remove` then recreate **outside** the repo
- OneDrive synced a duplicate copy at `C:\Users\nhata\OneDrive\Máy tính\Real` — a third
  source, should be deleted
- Missing APIs + 5 unsettled business decisions → see `## Needs from the other lane` in `ai/PROGRESS.md`

**Next steps**:
1. Clean up git lock + worktree
2. Write token files into `apps/web`
3. Code `/admin/users` so it runs, then **fix the spec template** from what was learned
4. Only then map Teacher + Student (fixing the template at 13 files means fixing 13; waiting means fixing 39)

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
