## [2026-09-01] — Build Teacher S2 screens from contracts — opencode

**Done**:
- Branched `feat/teacher-s2-classes` from `origin/main` (which had just received PR #17 —
  the Teacher Page Contracts + Flow Map, written by the Claude session the same day).
- Built all 4 contracted Teacher screens in `apps/web/**`, following the Admin-screen
  pattern (CSS modules, tokens from `root-design-fe.md`, `status.ts` badge colours,
  REVIEW-STATE switcher, mobile card lists below 768px):
  - `/teacher` — dashboard: greeting, class-card grid (max 6 + "Xem tất cả" + dashed
    create card), create-class modal shared with the list page. **No KPI row** — the
    contract's Out of scope explicitly forbids mocking grading/income numbers before
    endpoints exist.
  - `/teacher/classes` — search + status filter, table (name, HSK level, copyable
    enrollment-code chip, student count, status pill, created date), row menu with
    archive (confirm modal, one-way per flow map), create modal (name/HSK 1–9/description,
    auto-generates a mock 8-char code).
  - `/teacher/classes/[classId]` — header (level badge + status + edit modal), enrollment
    code panel (copy chip + regenerate confirm), stat strip, tab row to Lessons, roster
    table with avg-score and attendance rendered as "—" (contract: no field / S5 deferral,
    titles explain why). Not-found and forbidden (CLASS_ACCESS_DENIED) states.
  - `/teacher/classes/[classId]/lessons` — ordered list, HTML5 drag reorder **plus**
    up/down buttons (keyboard/a11y alternative), create/edit modal (title, description,
    document/video type picker), delete confirm with the contract's unconfirmed-business-
    rule warning. Every action is `MOCK(⛔)` local-only — `API_TEACHER.md` has no Lessons
    section (API-007); the modal states this in the UI.
- New shared components: `components/teacher/teacher-shell.tsx` (sidebar with 2 live nav
  items + 5 disabled "sắp có" items labelled S3–S6, header with breadcrumb, mobile drawer)
  and `teacher-widgets.tsx` (ReviewSwitcher, StatusPill, CopyChip, Toast, Create/Edit/Confirm
  modals). Mock data in `lib/teacher-data.ts` (4 classes incl. 1 archived + 1 with an
  empty roster so Empty state is reachable, per-class students and lessons).
- Verified: `pnpm --filter web build` exit 0 — 28 routes incl. the 4 teacher ones;
  `node scripts/check-docs.mjs` → all 8 checks passed (after flipping contract status).
- Recorded: 4 contracts `contracted → built`, `_INDEX.md` Teacher table updated
  (Status = built, Design = v1 stamped from the current `root-design-fe.md` baseline),
  PROGRESS claim updated.

**In progress** (and why it's unfinished):
- All 4 screens are fully mocked — no API wiring (none of the endpoints exist in a running
  backend; `apps/api` only has scaffold + User migration). Does NOT satisfy the S2 DoD
  (teacher creates class → student joins → teacher sees the student).

**Contract/temporary decisions to preserve**:
- Contract error codes were followed as written: `CLASS_NOT_FOUND`, `CLASS_ACCESS_DENIED`,
  `CLASS_ALREADY_ARCHIVED` on archive; `TODO(error-code)` on class create — nothing invented.
- Lessons ownership rule and delete-blocking behaviour are marked as *inferred* in the
  contract; the delete modal surfaces this to the user rather than hiding it.
- Profile button in the teacher header is inert (no `/teacher/profile` route contracted;
  T-AUTH-6 has no screen yet).

**Needs from the other lane**:
- (fe → be) Lessons API — whole section missing from `API_TEACHER.md` (API-007). Until it
  exists the lessons screen stays local-mock.
- (fe → be) Teacher dashboard aggregation endpoint if the KPI row is ever wanted.

**Blocker / needs follow-up**:
- Screenshots not captured (no browser tooling in this session) — verify visually with
  `pnpm --filter web dev` → `/teacher`.
- The 5 disabled sidebar items (S3–S6) will need enabling as those screens get contracted.

**Next steps**:
- Human review of the 4 screens.
- Wire real API once Sprint 2 backend lands; the MOCK() markers mark every seam.
