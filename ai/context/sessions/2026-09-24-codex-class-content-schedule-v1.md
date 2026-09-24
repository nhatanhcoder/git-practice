---
status: active
owner: codex
last_updated: 2026-09-24
---

## [2026-09-24] — Class content and Teacher schedule v1 — codex — branch `codex/class-content-schedule-v1`

**Previous session**: the Student Writing/Lego/Workplace slice was complete; the separate
teacher-authored Learning Catalog backend lane still needed real-DB verification, record
and PR. This branch was created from fresh `origin/main` in an isolated worktree because
the main checkout contained unrelated uncommitted work.

**Classification / authority**: CODE. The approved v1 scope included a class-lesson
supplemental relation and active-enrollment visibility (DB/RBAC), plus Teacher read/create
session scheduling, but excluded teacher-authored grammar, recurring/rescheduled/cancelled
sessions and payroll formula changes. The user approved that named scope. This branch
implemented only the portion with an existing transport contract.

**Done**:

- Replaced the mocked `/teacher/sessions` page with the live, paginated
  `GET /teacher/sessions` week agenda and `POST /teacher/sessions` one-off creation. The
  create form requires the API's `topic`, validates date/time, offers active own classes,
  refetches after POST and shows honest loading/empty/partial/error/forbidden states.
  Fake start/attendance/submit actions and in-memory session fixtures were removed.
- Repaired `/teacher/classes/[classId]/lessons` mutations: create/edit/delete no longer
  fabricate local success when the API fails, and failed reorder rolls back its optimistic
  UI change. The old unused menu ref is now connected for dismissal.
- Flow-mapper/Page Contract and page-designer spec for Teacher schedule were reconciled
  to the existing read/create API. The index no longer claims every Teacher screen is
  mocked; `DOC-018` has an append-only resolution note.
- Removed obsolete Teacher lesson ESLint suppressions in a separate frozen-file commit.

**Verified scope**:

- `node scripts/check-docs.mjs` — 9/9.
- `node --test apps/web/scripts/teacher-schedule.test.mjs` — 4/4 (date and form rules plus
  structural guard against mocked lifecycle actions).
- `pnpm --filter web build` — passed. Root build was not run.
- `pnpm --filter web lint` — passed after obsolete suppression cleanup.
- Focused Playwright production-browser tests — 4/4 at 1280px and 375px: mocked HTTP
  responses exercise Teacher schedule create/refetch and lesson reorder 409 rollback.
  These do **not** prove a running API or real PostgreSQL/MongoDB integration.

**In progress / blocked**:

- **NOT IMPLEMENTED**: Teacher dragging catalog/grammar content into a class lesson,
  Student assigned-only Grammar filter and lesson supplements. ADR-016 approved intent
  but not relation/cardinality, endpoint/payload/error code or revision/withdrawal behavior;
  ADR-017's vocabulary learning units are not Grammar IDs (`API-020`). No schema, Auth,
  RBAC or payroll code was changed to guess the missing contract.
- Teacher sessions module and runtime disagree on lifecycle/attendance and server-side
  end-after-start validation; archived-class creation is undecided (`API-021`). The UI
  does not expose those lifecycle mutations, but direct API validation remains pending.
- Grammar module historical summary says NOT IMPLEMENTED despite live self-study API
  (`DOC-019`); current category pills are incomplete over paginated content (`WEB-024`).
- Teacher lesson reorder request/response docs disagree with running DTO/envelope;
  recorded, not silently redefined (`DOC-020`).

**Contract/temporary decisions to preserve**:

- A scheduled date is a date-only value in Vietnamese teaching context. FE week arithmetic
  uses UTC date-only math to avoid browser time-zone day shifts. Actual timestamps are
  display-only in Asia/Ho_Chi_Minh; planned times are never substituted for actuals.
- `POST /teacher/sessions` returns a raw session without `className`, so the FE refetches
  the GET list after a confirmed POST. If refetch fails, it says the session was created
  but the list failed, preventing a duplicate POST.
- Student personal Grammar progress was not exposed to Teacher. No assigned-only filter
  was faked by filtering a single client page.

**Needs from owner / next steps**:

1. Approve the exact API-020 supplemental attachment contract: lesson vs class target,
   vocabulary and Grammar reference types, order/duplicate/removal, source revision and
   withdrawal behavior, active-enrollment visibility, teacher completion boundary, DTOs
   and errors. Then implement DB migration first, backend and FE in separate verified slices.
2. BE owner reconcile `API-021` and `DOC-020`; settle archived-class scheduling before
   changing server validation, and keep payroll formula unchanged unless separately approved.
3. Review the PR for this read/create + reliability slice; no merge/deploy was performed.

## PR #98 review follow-up — 2026-09-24

**Approval**: the owner replied “fix luôn đi” to the named scope: client mitigation for
uncertain session creation without schema/payroll-formula changes, plus stable list order,
pending lesson-dialog behavior and spec status correction. No broader DB/Auth/RBAC or
payroll authority was inferred.

**Changes**:

- An ambiguous session POST outcome (lost response/network/5xx/408/429) now closes the
  create form, reloads the target teaching week, displays a persistent warning and
  disables further create actions for this page instance. A definitive 4xx rejection
  remains editable; confirmed POST + failed GET still reports creation. This is a
  UI guard, not a server idempotency guarantee (`API-023`, open).
- GET `/teacher/sessions` orders by `scheduledDate` plus unique `id` in the requested
  direction for deterministic offset pages. A real-DB e2e case was added for tied
  dates and one-row pages in both directions.
- Teacher lesson create/edit/delete dialogs disable cancellation while a mutation
  is pending, keep Escape/backdrop from dismissing and show pending feedback. The
  schedule spec status changed from `ready-for-design` to `built`; no baseline bump.
- Review findings were appended to `KNOWN_ISSUES.md` as `WEB-025/026`, `API-022/023`,
  `DOC-021`; prior entries were not rewritten. IDs were scanned across local and
  refreshed remote refs before allocation.

**Verification**:

- `pnpm --filter web build`: passed; root build not run.
- `pnpm --filter api exec prisma generate` then `pnpm --filter api build`: passed;
  the initial build without a generated local client failed for that environment
  reason, not a source error. No schema/DB was changed.
- `node --test apps/web/scripts/*.test.mjs`: 242/242 passed.
- `pnpm --filter web lint`: passed.
- Focused production Playwright: 8/8 passed at 1280px and 375px. The aborted-response
  test simulates a server commit and verifies no second POST; lesson tests hold
  save/delete requests open and verify Hủy/Escape cannot close the dialog. Desktop
  and mobile screenshots of the warning and pending modal were captured and read.
- `node scripts/check-docs.mjs`: 9/9 passed; `git diff --check`: passed.
- API e2e with PostgreSQL: **NOT RUN locally** — this worktree has no `.env` and
  Docker is unavailable. CI's isolated Postgres/Mongo lane is expected to run it
  after push; until it passes, the pagination DB test is not counted as passing.

**Remaining**: `API-020` class supplements/assigned Grammar are still NOT IMPLEMENTED;
`API-021` direct-session validation/contract drift is open; `API-023` server-wide
idempotency needs a separately approved transport/schema decision. No merge/deploy.
