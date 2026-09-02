# 2026-09-02 — Fix 7 verified Teacher UI bugs (batches A/B/C) — Claude Code

**Context**: a prior review had verified 7 bugs in the mocked Teacher screens but written no
code. This session fixed all seven. Mock frontend only — no endpoint, payroll or backend change.

**Premise correction before starting**: the task said the working tree held two uncommitted
changes in the dynamic class routes. It did not — those were already **PR #20**, still open. That
mattered twice: without #20 the two class-detail routes 500 at runtime (so C3 could not be
verified there), and C3 edits `lessons/page.tsx`, one of #20's three files. Raised it; the owner
merged #20 (and #21), and this branch was cut from the resulting `main`.

**Approved before coding**: route/scope decisions were put to the owner — all of A, B, C, branch
from fresh `main`.

**Done** — 4 commits, one per batch plus the claim:
- **A1** `sessions/page.tsx` — submit no longer writes `s.actualEnd ?? s.endTime`. Required time
  input, prefilled only from a real recorded value, gated on topic + `actualStart` +
  `actualEnd > actualStart`. The modal header also stopped printing the scheduled window under
  the word "thực tế".
- **A2** `grading/page.tsx` — score clamped to `[0, maxScore]`, re-checked at the write;
  `GradingDraft` split into the teacher's final values and the AI's untouched original.
- **B1** `assignment-data.ts` + page — enum `assignment` → `homework`, `mock_test` requires an
  integer 5–180 time limit, switching to homework clears it and stores null.
- **B2** `question-data.ts` + page — `correctAnswer: string | string[] | null` + separate
  `rubric`; Writing stores null and requires a rubric; 12 fixtures migrated; form/list/preview
  are skill-aware.
- **C1** `assignments/page.tsx` — picker filters by the class's `hskLevel`, prunes stale
  selections on class change, empty state, `hskLevel` syncs on edit.
- **C2** `teacher-widgets.tsx` — `CopyChip` awaits `navigator.clipboard.writeText`; success only
  on resolve; distinct error state announced via `role="status"`; no fake fallback.
- **C3** new `src/hooks/use-overlay.ts` + shared `<Overlay>`; applied to 4 action menus, 3 shared
  modals and 9 page-local overlays. Triggers gained `aria-haspopup`/`expanded`/`controls`.
- New `src/lib/teacher/teacher-rules.ts` (pure rules) + `scripts/teacher-rules.test.mjs` (11
  cases), because the FULL LANE rule requires tests for payroll-relevant and shared-component
  changes.

**Why A1 mattered more than the report said**: `INV-PAYROLL-06` bans using scheduled times to
price `per_hour` work, and `INV-PAYROLL-17` makes the payroll request fail when `actualEnd` is
NULL. The FE was laundering the scheduled end into the actual field one layer earlier, so
`actualEnd` was never NULL and that guard could never fire — a loud failure became a silent
wrong payment.

**Two C3 traps, found by testing rather than assumed** (commented at the code):
1. An inline `onClose` must not be an effect dependency — the effect tears down every render and
   loses the focus-restore target.
2. Restoring focus **only** in the effect cleanup does not work. This was measured against a
   **production** build, not just dev/StrictMode: the dialog closed but focus landed on `<body>`
   every time. It has to be synchronous in the Escape handler, the way the menu hook does it.
   Three earlier hypotheses (rAF timing, StrictMode double-capture, a document-level focus
   tracker) were each implemented and measured false before this one held; the tracker survives
   as a fallback because the hook module is code-split and misses the very first open.

**Verification** (production build, not just dev):
- `pnpm --filter web build` green · `node --test apps/web/scripts/*.test.mjs` **31/31** ·
  `node scripts/check-docs.mjs` **8/8**
- All 9 Teacher routes HTTP 200
- Browser-verified each acceptance criterion: A1 submit with a real `actualEnd` (entered 20:47 on
  a session scheduled to 20:30 — state stored 20:47, status → Chờ duyệt; `18:00` and empty both
  blocked with the button disabled); A2 clamp (`-1`→0, `99`→10); B1 enum values `homework` /
  `mock_test`; B2 Writing saved with a rubric and no answer; C1 HSK-3 class showed 6 of 12
  questions, switching to the HSK-5 class dropped the 2 picked ids and showed 2; C2 both success
  (correct value written) and rejection (no success claim); C3 menu outside-click + Escape +
  focus back to trigger, dialog Escape + focus trap both directions + focus restored to opener.
- Desktop and 375px both checked.

**Not verified / not done**:
- The **AI audit trail is not visible in the UI** for a graded attempt, so that acceptance
  criterion is covered by the unit test (`aiSuggestion.score` stays 7 when the teacher saves 8),
  not by a browser check.
- Focus restore on the **Cancel button / backdrop** close paths uses the best-effort cleanup;
  only the Escape path is synchronously guaranteed and browser-verified.
- **Batch D (Playwright) not started** — installing it needs its own approval, per the task.

**Blocker / needs follow-up**:
- **Q-SES-3 is still open.** Requiring `actualEnd` before submit picks option (a), "block early",
  which the backend has not agreed. Recorded in `WEB-006` and in `teacher-sessions.md`.
- Screens remain `🔶` — fully mocked, no API. This does not advance the S2 DoD.

**Next steps**:
- Owner review of the PR; then decide Batch D (Playwright) separately.
