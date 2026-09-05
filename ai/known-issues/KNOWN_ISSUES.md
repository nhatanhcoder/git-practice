# ⚠️ KNOWN_ISSUES.md — Known Issues & Limitations

> Replaces Jira for a solo dev. Track bugs, limitations, and technical debt here.
> **Append only.** Prefix IDs by lane: `API-###`, `WEB-###`, `GIT-###`, `DOC-###`, `BUILD-###`,
> `DEBT-###`, `SCOPE-##`. **Never renumber and never reuse an ID** — check the list below before
> assigning one. (A 2026-08-31 chat session, working from a stale copy, reissued `API-003`,
> `DOC-006`, `DOC-007` and `SCOPE-01` for unrelated problems; those were renumbered on merge.)
> Last reviewed: 2026-09-01 against the working tree at HEAD `d277ca1`.

---

## Format

```
### [ISSUE-XXX] Title

**Severity**: Critical | High | Medium | Low
**Sprint**: Sprint X
**Status**: Open | In Progress | Resolved | Won't Fix

**Description**: ...
**Reproduce**: ...
**Workaround**: ...
**Fix Plan**: ...
```

---

## Open Issues

### [DOC-001] Duplicate docs — git worktree lives inside the repo

**Severity**: High
**Status**: ✅ Resolved 2026-08-14 — `git worktree list` shows only the main checkout;
`.claude/` is absent from disk and gitignored. Kept for the lesson: **worktrees live outside
the repo**, `multi-agent-workflow.md` §5.

**Description**: `.claude/worktrees/updatedocs-to-english/` is a git worktree checked out
**inside** the repo. It holds a second full copy of `ai/` and `docs/` — 88 duplicate `.md`
files against 118 real ones. The copy is stale (its `ai/skills/*.md` are still the empty
0-byte versions).

**Impact**: grep, file search and AI context all return two versions of every file. An agent
can silently read the outdated copy. Its `.git` file also holds an absolute Windows path, so
git run from any other environment fails with `fatal: not a git repository`.

**Fix Plan**:
```
git worktree remove .claude/worktrees/updatedocs-to-english
git worktree add ../Real-updatedocs updatedocs-to-english
```
Worktrees must live **outside** the repo — see `ai/rules/multi-agent-workflow.md` §5.

---

### [DOC-002] Third copy of the repo left in OneDrive

**Severity**: Medium
**Status**: Open

**Description**: The repo was moved to `D:\PersonalProject\Real`, but OneDrive re-synced a
partial copy back to `C:\Users\nhata\OneDrive\Máy tính\Real` (`ai/`, `docs/`, `.git`,
AGENTS.md, CLAUDE.md).

**Fix Plan**: delete the OneDrive copy. Never keep the repo inside OneDrive — see
`docs/shared/ENVIRONMENT_SETUP.md`.

---

### [DOC-003] `root-design-fe.md` is the token source but still marked draft

**Severity**: Medium
**Status**: ✅ Resolved 2026-08-14 — promoted to `status: active`. Its tokens have now been
rendered on `/admin/users`, though see WEB-002: the code does not actually source badge
colours from it yet.

**Description**: `docs/front-end-design-docs/root-design-fe.md` has `status: draft`, yet every
page spec and `specs/_DESIGN-SYSTEM.md` derive their tokens from it. It has also never been
rendered in a real page.

**Fix Plan**: promote to `status: active` once `/admin/users` is built and the tokens are
confirmed on screen.

---

### [DOC-004] HSK level range inconsistent across docs

**Severity**: Medium
**Status**: ✅ Resolved 2026-08-14 — swept all 117 markdown files. Every remaining "HSK 1–6"
string sits inside the note explaining *not* to use 1–6. The range is **1–9**.

**Description**: `ai/context/project-brain.md` says HSK **1–9** (updated 2026-08-11, calling
1–6 a mistaken revert). Some other sources still say 1–6. `ENTITY_USER.md` has
`hskLevelGoal` documented as 1–9.

**Fix Plan**: sweep all docs, settle on 1–9, note it in an ADR.

---

### [API-001] Missing endpoints blocking the Admin UI

**Severity**: High
**Status**: ✅ Resolved 2026-09-05 — All 10 missing Admin endpoints across Sessions, Payroll, Billing, and Monitoring implemented, covered by 23 e2e tests, and wired to the Next.js frontend with mock markers removed.

**Description**: Mapping the Admin surface surfaced endpoints that do not exist in
`docs/api/API_ADMIN.md`, the worst being `GET /api/v1/admin/payroll/:id`.
Also, the entire `INVOICE_*` error-code family is absent from `API_ERROR_CODES.md`.

**Resolution**: Implemented Modules 04 (Sessions), 05 (Payroll), 06 (Billing), and 08 (Dashboard/Monitoring), registered error codes, and connected all 10 frontend admin pages with full typing.

---

### [WEB-001] Sticky table header overlaps the first row

**Severity**: Low
**Status**: Resolved (pattern to avoid)

**Description**: A card wrapping a table with `overflow-hidden` becomes the containing block
for `position: sticky`. A `thead` with `sticky top-[56px]` is then pushed 56px down **inside
the card**, covering row 1.

**Workaround**: drop `overflow-hidden` from the card so the `thead` sticks to the viewport.

**Note**: `next build` passed with this bug present. It was only caught by screenshotting the
page and looking at it — build success is not render correctness.

---

### [BUILD-001] `turbo.json` missing — `pnpm dev` / `pnpm build` fail at repo root

**Severity**: High
**Status**: Resolved 2026-09-01 — `turbo.json` tracked in commit `b33e3ac` (PR #13)

**Update 2026-09-01**: a `turbo.json` now exists in the working tree, but `git ls-files turbo.json`
returns nothing — it is **untracked**, so it does not exist for CI or for anyone who clones. The
eslint/prettier half is done (`eslint.config.mjs`, `.prettierrc`, `.npmrc` are present). Fix is now
one line: `git add turbo.json` in its own commit.

**Resolution**: `git add turbo.json` done in commit `b33e3ac`, landed on `main` via PR #13
(merge commit `222f00d`). Confirmed on `main`: `git ls-files turbo.json` returns the file,
and `pnpm --filter web build` runs clean. Re-open if a clean clone still fails.

**Description**: Root `package.json` defines `dev`, `build`, `lint`, `type-check` as
`turbo run <task>`, and `turbo` is in devDependencies, but there is **no `turbo.json`**.
Any command run from the repo root fails. Only `pnpm --filter web dev` works.

**Impact**: CI cannot be set up, and the Sprint 0 DoD ("CI passes lint+build") is
unreachable. Also `eslint.config.mjs` and `.prettierrc` are missing, so there is no lint gate
at all — three agents are writing into this repo with nothing enforcing style or catching
unused imports.

**Fix Plan**: create `turbo.json` with `dev`/`build`/`lint`/`type-check` pipelines, add
eslint + prettier configs. One commit, alone (frozen files, `multi-agent-workflow.md` §2).

---

### [GIT-001] ~118 files permanently show as modified — line endings

**Severity**: High
**Status**: Open — `.gitattributes` added 2026-08-14, **normalisation not yet run**

**Description**: The working tree is CRLF, `HEAD` is LF, there was no `.gitattributes` and
`core.autocrlf` is unset. `git diff --stat` reports ~13,000 changed lines across ~120 files
when the real change is a handful.

**Impact**: this is the highest-risk conflict source in the repo. Review is impossible — a
real change is invisible in the noise. With two agents on different environments (Windows
native vs WSL/container) every merge becomes a whole-file conflict on every file.

**Fix Plan**: run once on Windows, no agent working:
```
git config core.autocrlf false
git add --renormalize .
git commit -m "chore: normalise line endings via .gitattributes"
```

---

### [GIT-002] `.idea/` still tracked despite being gitignored

**Severity**: Low
**Status**: ✅ Resolved — verified 2026-08-25 and again 2026-09-01; `.idea/` is no longer tracked.

**Description**: `.gitignore` lists `.idea/`, but the files were committed before that, so
git keeps tracking them and they show as modified forever.

**Fix Plan**: `git rm -r --cached .idea && git commit -m "chore: stop tracking .idea"`

---

### [WEB-002] Badge colours hardcoded in CSS instead of `lib/status.ts`

**Severity**: Medium
**Status**: Open

**Description**: The project decision is that `apps/web/src/lib/status.ts` is the **only**
place a status colour is decided (enum → hex). In reality `status.ts` does not exist;
`lib/user-status.js` holds only transition logic, and the colours are hardcoded in
`app/admin/users/users.module.css` (`.pending`, `.active`, `.suspended`).

**Impact**: the rule that exists specifically to prevent colour drift is not enforced by
anything. Teacher and Student screens will each invent their own.

**Fix Plan**: create `lib/status.ts` exporting the enum→token map; drive the CSS from custom
properties set from it. Do this **before** mapping Teacher/Student.

---

### [WEB-003] The two `/admin/users` screens disagree on date format

**Severity**: Medium
**Status**: Open

**Description**: The list stores ISO (`"2026-08-09"`) and formats via `formatDate()`. The
detail dataset stores display strings (`"09/08/2026"`) and has no formatter.

**Impact**: `API_CONVENTIONS.md` mandates UTC ISO 8601 on the wire. When the real API lands,
the list keeps working and the detail screen breaks. The bug is invisible today because both
run on mocks.

**Fix Plan**: all mock data stores ISO; formatting happens only at render. Add the rule to
the spec template so the other 11 admin screens do not repeat it.

---

### [WEB-004] Dev-only REVIEW-STATE switcher shipped in the page

**Severity**: Low
**Status**: Open

**Description**: Both `/admin/users` screens render a fixed-position "REVIEW STATE" widget for
flipping between ready/loading/empty/error. It is design-review scaffolding, unconditionally
rendered.

**Fix Plan**: gate behind `process.env.NODE_ENV !== 'production'`, or strip when the real API
is wired. Decide the convention now — all 13 admin screens will have one.

---

### [WEB-005] Page metadata title static across admin routes

**Severity**: Low
**Status**: Open

**Description**: All 10 newly built admin screens are client components without individual
exported `metadata` or dynamic document title setters, resulting in the fallback title
"Tài khoản | HSK Learning Platform" persisting across all routes.

**Fix Plan**: Add `export const metadata: Metadata` in page / layout wrappers or use
`<title>` tags per admin screen.

---

### [WEB-006] Seven Teacher UI bugs — fixed 2026-09-02, three re-opened and closed the same day

**Severity**: High (one of them money-adjacent)
**Status**: ✅ Resolved 2026-09-02 — but **only after a second pass**. See *Correction* at the
end: the first pass fixed 4 of 7 completely and 3 partially, and this entry originally claimed
all seven were closed. That over-claim was caught by an independent review of `main@74a1e76`,
not by this session's own verification — which is the more useful lesson here.

**Description**: a review of the mocked Teacher screens found seven defects. All were real —
verified in code before any fix. Worst first:

- **A1 — session submit fabricated `actualEnd`.** `handleSubmit` wrote
  `actualEnd: s.actualEnd ?? s.endTime`, i.e. it stored the **scheduled** end as the **actual**
  one whenever the teacher had not recorded a real end time. `INV-PAYROLL-06` forbids pricing
  `per_hour` work from scheduled times, and `INV-PAYROLL-17` says the payroll request must fail
  outright when `actualEnd` is NULL. Because the field was never null, that guard could never
  fire: **a loud failure was converted into a silently wrong payment.** Fixed with a required
  time input, prefilled only from a real value, gated on `actualEnd > actualStart`.
- **A2 — grading destroyed the AI audit trail.** `finishGrading` wrote
  `aiSuggestion: { score: finalScore, reasoning: teacherFeedback }` — overwriting the AI's
  suggestion with the teacher's edited values, which is the one comparison the field exists for.
  Scores were also unvalidated (`-1` and `maxScore + 1` were accepted). Fixed by splitting the
  draft into the teacher's final values and the AI's untouched original.
- **B1 — wrong enum + missing validation.** `AssignmentType` used `"assignment"`;
  `ENTITY_ASSIGNMENT` says `"homework"`. A `mock_test` could also be saved with no
  `timeLimitMinutes`, which the entity requires.
- **B2 — Writing questions stored a rubric in `answer`.** `ENTITY_QUESTION` says Writing has
  `correctAnswer = null` and keeps the rubric in `content.rubric`.
- **C1 — assignment picker lied about filtering.** The hint said "đã lọc theo HSK của lớp" while
  the code rendered the whole bank; picking questions then switching class left stale ids
  selected but invisible, and they were still submitted.
- **C2 — CopyChip faked success.** `onClick={() => setCopied(true)}` never called the Clipboard
  API, so it reported "Đã sao chép" even where clipboard access is denied.
- **C3 — menus and overlays had no dismissal or focus management.** No outside-click, no Escape
  on menus, no focus trap or restore on dialogs.

**Two implementation traps found while fixing C3** — both cost real debugging time, both now
commented at the code in `apps/web/src/hooks/use-overlay.ts`:
1. An inline `onClose` must **not** be an effect dependency. Callers pass a fresh arrow every
   render, so the effect tears down and re-runs constantly, losing the captured focus-restore
   target. Keep it in a ref and depend only on `open`.
2. Restoring focus **only** in the effect cleanup does not work. Measured in a production build
   (not just dev/StrictMode): the dialog closed but focus landed on `<body>` every time. The
   restore has to happen synchronously in the Escape handler, the way the menu hook does it.

**Verification**: `pnpm --filter web build` green; `node --test apps/web/scripts/*.test.mjs`
31/31 (11 new in `teacher-rules.test.mjs`); `check-docs` 8/8; all 9 Teacher routes HTTP 200; each
acceptance criterion exercised in a browser against the **production** build, desktop + 375px.

**Note on Q-SES-3**: requiring `actualEnd` before submit picks option (a) — "block early" — of
the open question in `docs/api/modules/04-sessions-attendance.md` §16, which the backend has
**not** settled. `INV-SESSION-13` alone only constrains the pair when both are non-NULL. This is
a UI-level choice; if the BE later chooses option (b), the FE gate can be relaxed.

**Correction (2026-09-02, second pass)** — an independent review of `main@74a1e76` found three of
the seven only partially fixed. All three are now closed. Each had the same root cause: the fix
was applied to the path named in the report rather than to the rule behind it.

- **C1 was fixed only for the *class-change* path.** `openEdit` still trusted the stored ids,
  `step2Valid` counted ids the picker had hidden, and `submitDraft` wrote the raw draft. Fixture
  `a4` showed it: "1 đã chọn" with no checkbox ticked and Save still enabled. Pruning is now one
  shared rule (`questionIdsForClass`) applied on open, on class change, when counting and at the
  write. **Four of five fixtures were also wrong** — a2/a3/a5 held off-level questions, and a4 was
  an HSK-5 class holding an HSK-4 question while declaring `hskLevel: 4`. The first pass audited
  the code and never the data.
- **C3 missed two overlays.** The conversion covered sessions/assignments/questions/grading but not
  the **income drawer** or the **lessons modal**, which kept hand-rolled dialogs: focus stayed on
  the row behind, Tab escaped the drawer, Escape did nothing. Both now use `Overlay`/`useOverlay`.
- **B2 fixed the Writing rubric but not the model shape.** `ENTITY_QUESTION` nests `content`
  (`prompt` / `passage` / `transcript` / `rubric`) and gives options a stable id; multi-answer
  questions store an **array**. The model had a flat `content` string, a top-level `rubric`,
  options as bare strings, and `q5` stored its two answers as the concatenated string `"A + B"` —
  which no comparison could match, so the preview marked neither option correct. Options are now
  `{ id, text }`, `correctAnswer` references those ids, and `toQuestionDto()` maps the flat editor
  ViewModel onto the entity shape. **The model is not a valid payload on its own** — always map.

Also moved `teacher-rules` from `.ts` to `.js` with JSDoc, following `src/lib/user-status.js`. The
test had been hand-stripping TypeScript with regexes, which broke the moment a signature used
`string[]`; importing the module directly removes that failure mode.

**Lesson**: "fix the reported line" is not "fix the rule". Three of these came back because the
first pass patched the path named in the report without asking where else the same rule had to
hold — including in the fixtures, which were never checked.

---

### [API-002] Two contradictory rate-reading formulas — wrong amounts

**Severity**: Critical
**Sprint**: Backend Phase 0
**Status**: ✅ Resolved 2026-09-05 — ADR-008 confirmed as authoritative in ADR-010, ADR-012, ADR-013.

**Description**: `ADR-008` (Accepted, 2026-08-13) specifies rates are **append-only**: changing
a rate = creating a new record, reading the applicable rate via
`WHERE effectiveFrom <= <date> ORDER BY effectiveFrom DESC LIMIT 1`.

**Resolution**: `TeacherPayRate` and `StudentTuitionRate` schema models have NO `effectiveTo` column. Rates are strictly append-only, and all queries use `effectiveFrom <= date ORDER BY effectiveFrom DESC LIMIT 1`. Verified in unit and e2e test suites.

---

### [API-003] Mistakenly created `draft` payroll period has no cancellation path

**Severity**: High
**Sprint**: Backend Phase 3
**Status**: ✅ Resolved 2026-09-05 — `DELETE /admin/payroll/:id` implemented and verified.

**Description**: Creating a `PayrollPeriod` assigns `payrollPeriodId` to the `ClassSession`
records grouped into the period. There was no endpoint to delete a `draft` period or unassign
sessions.

**Resolution**: Implemented `DELETE /admin/payroll/:id` in `PayrollService` and `AdminPayrollController`, guarded to only allow deleting periods in `draft` status and atomically resetting `payrollPeriodId = null` for all associated sessions within a single transaction. Fully covered by e2e test.

---

### [API-004] `GET /admin/sessions/pending` will be permanently empty

**Severity**: High
**Sprint**: Backend Phase 3
**Status**: ✅ Resolved 2026-09-05 — Teacher session lifecycle endpoints implemented.

**Description**: The session review screen had no data source because the transitions
`scheduled → in_progress → completed_pending` for `ClassSession` had no endpoints.

**Resolution**: Implemented `/teacher/sessions` controller & service with complete lifecycle endpoints: create session, start session (`scheduled → in_progress`), end session (`in_progress`), record attendance, and submit for review (`completed_pending`). Seed data and e2e tests confirm pending sessions are populated and reviewed via `GET/PATCH /admin/sessions/*`.

---

### [DOC-005] `User.status` cannot represent "application rejected"

**Severity**: High
**Sprint**: Backend Phase 2
**Status**: Open

**Description**: Business decision #5 (approved 2026-08-16) chose **soft rejection** — keep the
record, no hard delete. But `ENTITY_USER.md` only has `status: pending / active / suspended`.
There is no `rejected` value.

`pending → suspended` is not a semantically valid transition (suspend is for locking an active
account), so a rejected application **stays stuck at `pending` forever** and mixes into the
approval queue.

**Fix Plan**: ADR-011 + migration to add the `rejected` enum value. Cascading impact: valid
values for the `?status=` filter, state machine in `docs/api/modules/02-users.md` §6.

---

### [DOC-006] `nickname` vs `fullName` — field name mismatch between entity and API

**Severity**: Medium
**Sprint**: Backend Phase 2
**Status**: Open

**Description**: `ENTITY_USER.md` defines the field `nickname`. But `API_AUTH.md` uses
`fullName` in both `POST /auth/register` and `PATCH /auth/me`.

**Impact**: Blocks the DTO response for all 5 user endpoints, and also blocks determining
which field is searched by the `?search=` query parameter.

**Fix Plan**: Lock one name. Choosing `fullName` requires a migration to rename the column.

---

### [DOC-007] Unclear which error codes are usable and which are still pending approval

**Severity**: Medium
**Sprint**: Backend Phase 0
**Status**: Open

**Description**: `API_ERROR_CODES.md` marks *proposed, not agreed* inconsistently: the
`INVOICE_*`, `RATE_*`, `AI_*` groups have a warning banner, but the "Session Review Errors"
section (`SESSION_*`) **does not**. Conversely, `PAYROLL_*` exists in the registry but does
not appear in any "approved" list.

Additionally, the following error branches **have no valid code**: duplicate payroll period ·
overlapping payroll period · `per_hour` missing `actualStart`/`actualEnd` · idempotency key
conflict · invalid status transition on suspend/activate · `CLASS_CODE_INVALID` ·
`CLASS_ARCHIVED` · `CLASS_ALREADY_ENROLLED`.
`PAYROLL_PERIOD_FINALIZED` is currently overloaded with 3 different semantics.

**Fix Plan**: Audit the entire registry, mark status consistently for each group, and add
the missing codes. No module is allowed to invent its own codes.

---

### [SCOPE-02] Product model: LMS vs single-user self-study

**Severity**: Critical
**Status**: ✅ Resolved 2026-09-03 — ADR-016 combines both lanes in one product

**Description**: Every doc in this repo describes a multi-role LMS (Admin/Teacher/Student,
classes, assignments, attendance, payroll, tuition). `PROJECT_KNOWLEDGE.md` §8 (F9–F16) describes
a single-user self-study app — 10 static JSON content packs, XP, badges, imperial-exam ranks, a
leaderboard of 20 simulated rivals, one demo progress profile. These are two different products,
not two versions of one. Schema, RBAC and sprint order all depend on the answer.

**Renamed**: raised as `SCOPE-01` by the 2026-08-31 session, which did not know `SCOPE-01` was
already in use in `ai/PROGRESS.md` for the Classes/Enrollment scope question.

**Important qualifier (2026-09-01)**: the self-study half rests entirely on
`backend/data/content/`, which **is not in this repository** — see `DOC-011`. Until those files
are located this may not be a conflict at all, just a spec for a different project that got
merged into these docs.

**Owner decision (2026-09-03)**: keep both. Class learning owns teacher lessons, Assignments and
official Attempts. Platform self-study owns personal learning units and progress. Teachers may
assign catalog units as supplemental practice aligned to their class curriculum, but completion
only becomes an official result when wrapped in an Assignment. XP, ranks, streaks, badges, Lego,
Workplace and Placement are accepted domain capabilities. Production SRS uses SM-2. See ADR-016.

`DOC-011` remains separate: the content corpus was located outside this repo, but import/seed and
production storage are still unresolved.

---

### [SCOPE-03] Teacher role scope: full management vs read-only

**Severity**: High
**Status**: ✅ Resolved 2026-09-01 (owner-confirmed) — **full management. `(Read Only)` on
`client-demand.txt` labels the document, not the role.**

**Description**: A parallel Cowork/device-mount session raised a conflict between "client-demand"
(Teacher read-only) and this repo's RBAC/API/roadmap docs (Teacher full management), as part of a
16-item plan for Teacher FE+BE work. That session could not commit (no git identity in its
sandbox), so the conflict itself was never written to the repo.

**First pass (wrong — see Correction)**: searched `ai/`, `docs/`, `PROJECT_KNOWLEDGE.md` and
`COWORK_BOOTSTRAP.md` for "client-demand" with `grep --include="*.md"`, found nothing, and closed
this as Resolved on `docs/shared/RBAC_MATRIX.md` + `docs/api/API_TEACHER.md` +
`docs/roadmap/SPRINT_PLAN.md` all agreeing on full management. **The search missed
`docs/actors/teacher/client-demand.txt` — a `.txt` file, excluded by the `*.md` glob** — which is
the actual client-demand document the other session meant.

**Correction (same day)**: `docs/actors/teacher/client-demand.txt` line 5 reads
`Access level: Client Demand (Read Only)`, and its Sprint 1–3 items are worded as view-only
("Xem danh sách lớp...", "Xem bài nộp của học sinh...", "Xem thống kê lớp..."). Taken alone this
does contradict full management. But the identical header appears on
`docs/actors/admin/client-demand.txt` and `docs/actors/student/client-demand.txt` too, and Admin's
already-built system (14 screens: user approve/suspend, invoice generation, pay-rate edits, ...)
is definitively not read-only — so `(Read Only)` most likely labels the **document** (a frozen
client-supplied source text, not to be edited) rather than the **role's** permission level. Under
that reading, `docs/actors/teacher/FEATURES_TEACHER.md` and `PERMISSIONS_TEACHER.md` — which sit
right next to `client-demand.txt` in the same folder and should be the derived spec from it — both
describe full CRUD (`✅ Create / update / archive a class`, etc.), consistent with RBAC/API/roadmap.

**Owner decision (2026-09-01)**: `(Read Only)` labels the document (frozen client source text),
not the role. Teacher keeps full management as `RBAC_MATRIX.md` / `API_TEACHER.md` /
`FEATURES_TEACHER.md` / `PERMISSIONS_TEACHER.md` already describe. Teacher Page Contracts get
create/edit/regenerate-code affordances, not view-only screens. Do not re-litigate without new
evidence.

---

### [DOC-011] `backend/data/content/` does not exist in this repo

**Severity**: Critical
**Status**: Open — source located externally; import/seed strategy still needed

**Description**: `PROJECT_KNOWLEDGE.md` §8 and `COWORK_BOOTSTRAP.md` are both written around 10
static JSON files at `backend/data/content/` (`grammar.json`, `writing.json`, `lego.json`,
`exams.json`, `workplace.json`, `learning-path.json`, `badges.json`, `levels.json`,
`leaderboard.json`, `foundation.json`) plus `backend/data/progress.default.json`.

Verified 2026-09-01: there is **no `backend/` directory, no `content/` directory, and none of
those filenames** anywhere in `D:\PersonalProject\Real` (excluding `node_modules`). The repo
has exactly two apps, `apps/api` and `apps/web`.

**Location update (2026-09-03)**: the owner supplied the Hán Lộ prototype at
`D:\PersonalProject\Chinese UI test\ui-claude`; all ten content files exist under its
`backend\data\content` directory. They remain outside this repo and unavailable to CI/deploy.

**Consequences**:
- §8 (F9–F16) is accepted product scope via ADR-016, but its content counts/data remain unverified
  by this repository
- The HSK 1–9 decision was re-justified on 2026-08-31 using these files; that justification is
  unverifiable here. It does not matter — the range was already settled 2026-08-11 on repo
  evidence (entity specs, `GLOSSARY.md`, `DATABASE_SCHEMA.md`, `CONVENTIONS.md`, `SPRINT_PLAN.md`)
- `DEBT-003` (content data defects) cannot be actioned

**Fix Plan**: validate the external corpus, choose an approved content model and import/seed path,
then bring it into a location available to CI/deploy. Do not make production depend on the
developer-machine absolute path.

---

### [DOC-008] `DECISIONS.md` is referenced but does not exist

**Severity**: Medium
**Status**: Open

**Description**: `ai/PROGRESS.md` cites `DECISIONS.md` #3, #4 and #5 as the authority for the
sprint structure, the question sub-type scope, and whether Sprint 6 is in scope.
`ai/AI_CHAT_LOG.md` claims the file was created on 2026-07-18. The 2026-07-27 session removed a
stale `ai/DECISIONS.md` reference from `AGENTS.md`, noting the file does not exist.

Verified 2026-09-01: `find` across the repo returns no `DECISIONS.md`. Three documents point at a
file nobody can read, and three real decisions have no recorded rationale — including the one
currently holding all of Sprint 6 at `⏸`.

**Fix Plan**: drop the references and record those three decisions as ADRs in
`docs/shared/decisions/`, which is where architecture decisions already live. Do not create
`DECISIONS.md` — it would be a second, competing decision store.

---

### [DOC-009] Stale local-infrastructure references (`5433`, `27018`, local Mongo)

**Severity**: Medium
**Status**: Open

**Description**: Docs describing "Postgres 5433, Mongo 27018" predate PR #12, which renamed the
Postgres service to `db`, switched the port to `${POSTGRES_PORT:-5432}`, renamed the database to
`hsk_dev`, and dropped the local MongoDB container in favour of Atlas.

**Fix Plan**: `grep -rn "5433\|27018" docs/ ai/ *.md` and fix every hit outside historical log
entries.

---

### [DOC-010] `ai/PROGRESS.md` Sprint 0 does not match the working tree

**Severity**: Medium
**Status**: In Progress — corrected 2026-09-01, needs a second pass after the next merge

**Description**: Sprint 0 was last verified 2026-08-14 and PR #12 has landed since. Verified
2026-09-01:

| Claim in `PROGRESS.md` (pre-fix) | Reality |
|---|---|
| `turbo.json` MISSING | exists on disk, **untracked** — see `BUILD-001` |
| `apps/api/` does not exist | **exists** — NestJS scaffold, `prisma/schema.prisma`, `seed.ts`, health module, migration `20260820000000_init_users` |
| `packages/types` directory missing | correct — **`packages/` does not exist at all** |
| eslint ❌ / prettier ❌ | both exist (`eslint.config.mjs`, `.prettierrc`) |
| husky ❌ | correct, still absent |

The 2026-08-31 session asserted the opposite error — that the repo root "already contains a
`packages/` directory". It does not.

**Fix Plan**: re-verify item by item after each merge to `main`, not once per month.

---

### [DOC-012] Sprint count: `PROGRESS.md` and `PROJECT_KNOWLEDGE.md` §6 use 8 sprints, the plan has 10

**Severity**: Medium
**Status**: Open

**Description**: `docs/roadmap/SPRINT_PLAN.md` is the authority and contains **S0–S9**, with
Sprint 7 = Invoicing + Notifications, Sprint 8 = Skill Drill + Quiz Room + Leaderboard, Sprint 9 =
Testing + Polish + Launch. `ai/context/project-brain.md` agrees.

`ai/PROGRESS.md` and `PROJECT_KNOWLEDGE.md` §6 both run S0–S7 and both label S7 "Testing &
Deploy", which is really S9. Anyone planning "Sprint 7" from `PROGRESS.md` will build the wrong
thing.

**Fix Plan**: renumber both against `SPRINT_PLAN.md`. Not done in the 2026-09-01 merge because it
changes item identity across three files and deserves its own reviewed commit.

---

### [API-005] `.env.example` is missing the entire auth block

**Severity**: High
**Sprint**: Sprint 1
**Status**: Open — **needs the owner's decision**

**Description**: The `.env.example` that came in with PR #12 contains none of
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `BCRYPT_ROUNDS`,
`COOKIE_DOMAIN`, `COOKIE_SECURE`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`. The older local version
had all of them. `docs/api/modules/01-auth.md` is the only module spec in `accepted` status, so
this is a real gap rather than a stylistic difference.

**Renamed**: raised as `API-003` by the 2026-08-31 session; `API-003` was already taken by the
payroll-period cancellation issue.

**Workaround**: the old version was preserved at `_backup/env.example.local` — that file was
deleted 2026-09-01 (untracked scratch, never committed, not recoverable from git). The variable
**names** are not lost — they're listed in the Description above — only the old example values
and comments are gone. Reconstruct from `docs/api/modules/01-auth.md` (the accepted spec), not
from memory of the deleted file.

**Fix Plan**: do not touch auth until the block is agreed and restored.

---

### [API-006] `API_TEACHER.md` and `FLOW_ENROLLMENT.md` disagree on Class routes

**Severity**: Medium
**Status**: ✅ Resolved 2026-09-01 (owner-confirmed) — **role-prefixed wins**:
`/api/v1/teacher/classes/...`, `/api/v1/student/classes/...`

**Resolution**: the owner settled the convention as role-prefixed. New evidence found while
resolving it — the conflict was wider than this entry recorded. A **third** source,
`docs/api/modules/03-classes-enrollment.md` (the backend build source), also used bare
`/api/v1/classes`, siding with `FLOW_ENROLLMENT.md`. But `API_ADMIN.md`, `API_TEACHER.md` **and**
`API_STUDENT.md` all use role prefixes, so the two outliers were the module spec and the flow doc.

Applied:
- `docs/api/modules/03-classes-enrollment.md` § 2 — rewritten to the role-prefixed paths, quoted
  from the role API docs. Two findings recorded there rather than smoothed over: the old
  `GET /classes` row served two roles and splits into two existing endpoints; and there is **no**
  standalone `GET /classes/:id/students` — `API_TEACHER.md` embeds the roster in the class detail.
- `docs/flows/FLOW_ENROLLMENT.md` — header note added: its 35 path references are stale, the role
  `API_<ROLE>.md` file wins, archive is `PATCH` not `POST`. **The 35 references were not
  rewritten** — that touches Student routes outside this change and is its own task.
- The Teacher Page Contracts and `teacher-flow.md` were already on the winning side; no change.

**Description**: found while writing the Teacher Page Contracts (`teacher-classes-list.md`,
`teacher-class-detail.md`). Two docs describe the same Class endpoints differently:

| | `docs/api/API_TEACHER.md` | `docs/flows/FLOW_ENROLLMENT.md` §2.3/§7 (Teacher routes) |
|---|---|---|
| Prefix | `/api/v1/teacher/classes` | bare `/classes` — no `/teacher` prefix (Admin's routes in the same doc, §4, *are* prefixed: `/api/v1/admin/classes`) |
| Archive | `PATCH /api/v1/teacher/classes/:id/archive` | `POST /classes/:id/archive` |
| Student list | embedded in `GET .../classes/:id` | separate `GET /classes/:id/students` |
| FE create/edit | modal (this session's Teacher Page Contracts) | separate pages, per §5: `/teacher/classes/create`, `/teacher/classes/:id/edit` |

The Teacher Page Contracts follow `API_TEACHER.md`, per flow-mapper's `§2` read order (the
role's `API_<ROLE>.md` is the designated endpoint source; `docs/flows/` is only consulted for
cross-actor ordering). This is a **documentation** conflict, not yet a build-time one — neither
side is implemented in `apps/api` yet (only `apps/api`'s `User` module exists, per PR #12).

**Fix Plan**: whoever writes the `ClassesModule` (Sprint 2 backend) picks one convention and
updates the losing doc. Recommend `API_TEACHER.md`'s role-prefixed paths, since every other
`API_<ROLE>.md` in this repo (Admin, Student) follows that convention and `FLOW_ENROLLMENT.md`
reads as an earlier design note that predates it — but this is a recommendation, not a decision;
do not silently pick a side without saying so in the commit.

---

### [API-007] `API_TEACHER.md` has no Lessons section — no endpoints exist at all

**Severity**: High
**Status**: ✅ Resolved 2026-09-01 — Lessons section written. **One follow-up left**: no Lesson
row in `RBAC_MATRIX.md` / `PERMISSIONS_TEACHER.md` (see below).

**Resolution**: `API_TEACHER.md` § Lessons now defines 8 endpoints covering T-LESSON-1…5, and
`API_ERROR_CODES.md` has a `LESSON_*` family (6 codes), marked *proposed, not agreed* per the
registry's convention — no BE owner has signed them off, so they are documented but not usable
in code yet.

Nothing was invented. Every path, field and rule came from
`docs/entities/postgres/ENTITY_LESSON.md` and `ENTITY_LESSON_ASSIGNMENT.md`, both of which turned
out to be **full specs** that no one had read while writing the FE contract. Two things the FE
contract had marked "inferred / unconfirmed" are in fact written business rules:
- **Ownership** — "created/managed exclusively by the teacher who owns the class".
- **Delete blocking** — "cannot delete lesson if linked assignments have active Attempts".

A third: `FEATURES_TEACHER.md` T-LESSON-3 calls the Lesson↔Assignment cardinality "to be
settled", but `ENTITY_LESSON_ASSIGNMENT.md` settles it as **M:N** with a unique
`(lessonId, assignmentId)`. Entity specs outrank feature docs, so M:N it is.

`teacher-lessons-list.md`, `teacher-flow.md` and `pages/_INDEX.md` were updated from
"every action ⛔" to the real endpoints and codes.

**Follow-up still open**: `RBAC_MATRIX.md` and `PERMISSIONS_TEACHER.md` have no Lesson row. The
ownership rule is sourced from the entity spec so the endpoints are usable, but the permission
matrix has not been extended — that edit touches RBAC and needs owner approval on its own.

**Description**: found writing the Teacher Page Contracts, the hard way. An early draft of
`teacher-lessons-list.md` cited five Lesson endpoints (`GET`/`POST .../lessons`,
`PATCH`/`DELETE /lessons/:id`, `PATCH .../lessons/reorder`) as if they existed in
`API_TEACHER.md`. They don't — `API_TEACHER.md` has exactly six sections (Classes, Question
Bank, Assignments, Grading, Sessions, Income) and none of them is Lessons. The cited paths were
reconstructed from memory of a different checkout read earlier in the same session, not from
this file. `check-docs.mjs`'s `endpoint-undefined` check caught it before commit.

`FEATURES_TEACHER.md` T-LESSON-1 through T-LESSON-5 describe the feature; `RBAC_MATRIX.md` and
`PERMISSIONS_TEACHER.md` have no row for Lesson either, so ownership (does a teacher managing a
lesson need to own the parent class?) is undocumented, not just unimplemented.

**Fix Plan**: write a Lessons section in `API_TEACHER.md` (create/list/update/delete/reorder,
matching `FEATURES_TEACHER.md` T-LESSON-1/2/4/5, plus the attach/detach-assignment pair for
T-LESSON-3) and add the matching `LESSON_*` family to `API_ERROR_CODES.md`. Add a Lesson row to
`RBAC_MATRIX.md`/`PERMISSIONS_TEACHER.md` while at it. Until then,
`docs/front-end-design-docs/pages/teacher-pages/teacher-lessons-list.md` and the Lesson branch
of `teacher-flow.md` describe a screen that cannot be built against anything real.

**Lesson for future sessions**: re-verify file contents against the actual working directory
before citing them, even within the same session — do not reuse a reading from an earlier point
in the conversation if the working directory could have changed (here, an earlier turn had read
the same-named file in a *different* repo checkout entirely).

---

### [GIT-003] Device mount forbids `unlink`, breaking git operations

**Severity**: High
**Status**: Open (environmental — no fix, only a workaround)

**Description**: When the repo is reached through a device mount, `rm`/`unlink` returns
`Operation not permitted`, but `mv` (rename) works. Git can create new files but cannot replace
existing ones, so `git pull` / `merge` / `checkout <branch>` leave a half-applied working tree:
new files appear untracked, the index is unchanged, and HEAD does not move.

**Reproduce**: `git pull` from a sandbox with the repo on a device mount. Observed 2026-08-25 —
54 files failed with `unable to unlink old '<path>'`.

**Workaround**:
- Clear a stuck `.git/index.lock` with `mv`, not `rm`
- Sync manually: `git show origin/main:<path> > <path>` per file (overwrites in place, no unlink)
  → `git update-ref refs/heads/main` → `git reset` (mixed)
- Verify with `git diff HEAD` (empty) and `git fsck`
- `git checkout -b <new-branch>` **is** safe — it creates a ref and touches no files
- The sandbox has **no git identity** and will not sign commits on the owner's behalf. It can
  stage; `git commit` happens on Windows.

---

### [API-008] `PATCH .../lessons/reorder` accepted payloads the unique index cannot satisfy

**Severity**: High
**Status**: ✅ Resolved 2026-09-04 — found by a self-review of the Teacher Lessons service.

**Description**: `Lesson` carries `@@unique([classId, orderIndex])`, and `reorder()` avoided
collisions by shifting every item to `orderIndex + 10000` before writing the real values.
That works only when the payload is a **complete permutation** of the class's lessons, and
nothing enforced that. Two payload shapes broke it:

- **Partial payload.** `ReorderLessonsDto` allows `ArrayMinSize(1)`, so reordering one
  lesson of three to index 1 is a valid request. The lesson that already holds index 1 is
  untouched, so step two collides with it.
- **Duplicate `orderIndex`.** Two items sharing an index are shifted to the *same*
  temporary value, so even the collision-avoidance step collides.

**Impact**: a P2002 escaping as `DUPLICATE_ENTRY` (409) for what is a malformed request,
from an endpoint whose whole job is ordering. The transaction rolls back, so no data was
corrupted — but the failure is unexplained to the caller and the FE has no branch for it.

**Fix**: the service now requires the payload to name every lesson of the class exactly
once with `orderIndex` values exactly `1..N`, rejecting anything else as
`VALIDATION_ERROR` before touching the database. Four regression tests cover partial,
duplicate-id, duplicate-index and out-of-range payloads, plus one asserting the stored
order is unchanged after each rejection.

**Lesson**: the collision-avoidance trick was correct for the input it assumed and had no
check that the input was that shape. A guard that depends on an unvalidated precondition
is not a guard.

---

### [API-009] `ClassesService.findById` skipped the ownership check when no teacher id was passed

**Severity**: Medium
**Status**: ✅ Resolved 2026-09-04 — hardening; no caller was exploiting it.

**Description**: the condition read `if (!isAdmin && teacherId && cls.teacherId !== teacherId)`.
The `teacherId &&` term means that calling `findById(classId)` with neither a teacher id nor
`isAdmin` returned **any** class, including its full student roster.

Both current callers are correct — the admin controller passes `isAdmin: true`, the teacher
controller passes `user.id` — so this was latent rather than live. It is recorded because the
default was the wrong way round: in the one place ownership is enforced, "argument missing"
resolved to "no check" instead of "denied".

**Fix**: `if (!isAdmin) { if (!teacherId || cls.teacherId !== teacherId) throw ... }`.

---

### [API-010] `delete` of a lesson re-packed order indices outside the transaction

**Severity**: Medium
**Status**: ✅ Resolved 2026-09-04.

**Description**: `LessonsService.delete()` deleted the row and then re-packed the remaining
`orderIndex` values in a loop of separate updates. A failure between the two left a
permanent hole in the ordering: `create()` assigns `max + 1`, so nothing ever reuses the
gap, and `@@unique([classId, orderIndex])` means the hole cannot be closed by a later write
that assumes contiguity.

**Fix**: delete and re-pack now share one `$transaction`. The ascending iteration order is
kept and now commented — each row moves down into an index the previous row has already
vacated, so no intermediate state violates the unique constraint.

---

### [DEBT-004] The API e2e suites share one database and were running in parallel

**Severity**: Medium
**Status**: ✅ Resolved 2026-09-04.

**Description**: `node --test` runs test files in parallel by default. Every suite in
`apps/api/test/` points at the same development database, and `admin-approval-concurrency`
and `admin-user-lifecycle` both create users. The INV-USERS-07 pagination test walks every
page and asserts it sees each row exactly once — with rows being inserted mid-walk it saw
the total move from 7 to 9 and failed as though pagination had duplicated a row.

**Observed**: one run failed, the next passed with no code change. A test that fails at
random is worse than a missing test, because it trains people to re-run rather than look.

**Fix**: `--test-concurrency=1` in the `test` script, and a comment at the affected test
naming the flag so the next person checks it before suspecting the pagination code.

**Not fixed**: the suites still share a database and still write to it. Per-suite schemas or
a transactional rollback per test would make them independent rather than merely ordered.

---

---

### [WEB-011] Wired screens swallowed every API failure and kept showing mock data

**Severity**: Critical
**Status**: ✅ Resolved 2026-09-04.

**Description**: every screen that had been connected to the API shared one defect: the call was
real, the failure was discarded, and the hardcoded fixtures stayed on screen. `/admin/users`
issued `GET /api/v1/admin/users`, received **401** (nothing could log in — see `WEB-012`), ran
`.catch(() => {})`, and rendered eight invented accounts complete with status badges and
pagination. It looked like a working screen. The row count even matched the database's eight
seeded users, by coincidence.

The service layer made it worse rather than better: `admin-users-service` returned
`FALLBACK_USERS` with `isFallback: true` — a flag **no caller ever read**. `auth-profile-service`
did the same with a hardcoded admin profile, so an unreachable API showed a *different person's*
name and email as "my profile". `teacher-service` returned `mockTeacherClasses` /
`mockClassLessons`, and `createTeacherClass` fabricated a class **with an enrollment code** and
returned it as created — a code no student could ever join with.

Three more of the same family, found while fixing it:

- `/admin/profile` applied a failed `PATCH /auth/me` locally and toasted "Đã lưu hồ sơ". The user
  walked away believing a change that never reached the database.
- `/admin/users/[userId]` rendered `getStudentDataset()` / `getTeacherDataset()` — invented
  enrollments, scores and attendance — as that account's record. An admin deciding whether to
  suspend someone was reading fiction. The endpoint carries no history at all (`API-001`), so the
  panel now says so instead.
- `/teacher/classes/[classId]/lessons` looked its class up in `mockTeacherClasses`. Real ids are
  uuids and are never in that array, so **every real class rendered "Không tìm thấy"** — the
  screen was unreachable for any class that actually existed.

**Fix**: all fallbacks deleted, `user-detail-data.js` removed, errors propagate, and each screen
distinguishes loading / empty / forbidden / failed-to-load. `WEB-004`'s REVIEW-STATE switcher is
now dev-only, because over live data it let a failed load be repainted as "ready".

**Lesson**: a fallback the caller never checks is not a fallback, it is a lie with a comment on it.
"Graceful degradation for offline dev" was the stated intent of every one of these, and the result
was a UI that could not tell anyone it was disconnected.

---

### [WEB-012] No login screen existed, and the access token was in localStorage

**Severity**: High
**Status**: ✅ Resolved 2026-09-04.

**Description**: the frontend was wired to a JWT-protected API with **no `/login` route anywhere**
(`find apps/web/src/app -iname "*login*"` returned nothing), so there was no way to obtain a token
— which is why every guarded call 401'd and fell into `WEB-011`'s silent mock.

Two rule violations alongside it, both from `ai/rules/working-rules.md` § Auth Rules:

- *"Access token stored in Zustand (memory only, never localStorage)"* — it was in `localStorage`,
  readable by any injected script and outliving the tab that earned it.
- *"On 401: auto-call `/auth/refresh` once, then redirect to login"* — there was no refresh branch
  at all. With a 15-minute access TTL a session died every 15 minutes with no recovery.

**Fix**: `/login`, mapping the registry `code` rather than the HTTP status to its message — a
pending account and a wrong password are both failed logins needing opposite advice. Token in a
Zustand store with no `persist`. `restoreSession()` on mount, because a memory-only token means the
httpOnly refresh cookie is the only thing that survives a reload. `RequireAuth` on `/admin` and
`/teacher` that waits out the `unknown` state instead of bouncing a signed-in user on every reload.

**The refresh is single-flight, and that is not an optimisation.** Refresh tokens rotate: two
parallel `/auth/refresh` calls carrying the same cookie make the second look exactly like a
replayed stolen token, and the replay defence revokes the whole family — logging the real user out
mid-work. Sharing one promise is what stops a race from causing a forced logout.

**Verified for real**: the API was restarted with an 8-second access TTL, and the browser network
log showed `GET /admin/users?role=teacher` **401** → `POST /auth/refresh` **200** → the same GET
**200**, with nothing surfacing to the user.

---

### [API-011] A listening question cannot be created from the UI — audio upload does not exist

**Severity**: Medium
**Status**: Open

**Description**: `ENTITY_QUESTION.md` requires `content.audioUrl` on a listening question and the
API enforces it (`QUESTION_AUDIO_REQUIRED`). The question editor has **no audio upload**, and
`toQuestionDto()` has never set `audioUrl` — its comment says so, and correctly refuses to invent
one.

**Impact**: a teacher can create reading and writing questions from `/teacher/questions`, but every
listening question is rejected. Listening questions can only be created by calling the API directly
with a URL obtained elsewhere.

**Why not "just make audioUrl optional"**: a listening question with no audio is unanswerable. The
rule is right; the upload is missing. Relaxing the API to make the form pass would move the failure
from the teacher writing the question to the student sitting the exam.

**Blocked by `CR-3`** — the storage provider is undecided (Supabase Storage vs Cloudinary,
`PROJECT_KNOWLEDGE.md` §9). Nothing can be uploaded until the owner picks one.

**Fix Plan**: settle CR-3, then add upload to the editor plus a signed-URL endpoint.

---

### [API-012] Two e2e tests depend on a seed row staying `pending`

**Severity**: Medium
**Status**: Open

**Description**: `admin-users.e2e.test.ts:132` and `auth.e2e.test.ts:181` both use the seeded
`teacher.pending@hsk.local` and assume its status is still `pending`. Every other suite builds its
own fixtures with `POST /auth/register` + approve, and tears them down.

**Reproduce**: approve that account once — through the UI, or during any manual check of the
approve flow — and three tests fail: *refuses a pending account*, *applies role and status filters
together (INV-USERS-03)*, and *rejects login for pending account (INV-AUTH-05)*. It happened on
2026-09-04 while verifying the approve button in a browser: the suite went from 93/93 to 90/93 with
no code change at all.

**Workaround**:

```sql
UPDATE users SET status='pending' WHERE email='teacher.pending@hsk.local';
```

or re-run `pnpm --filter api db:seed`.

**Fix Plan**: give those two tests their own registered-and-left-pending account, the way every
other suite already does. A test that depends on shared mutable state fails for reasons unrelated
to the code under test, which is the most expensive kind of red.

---

### [WEB-013] The F3.6 delete gate on questions is not enforced — `usageCount` has no source

**Severity**: Medium
**Status**: Open

**Description**: F3.6 says a question already used in an assignment must not be hard-deleted. The
UI gate reads `Question.usageCount`, which can only be computed from `Assignment.questionIds[]` —
and the `Assignment` table does not exist in Postgres yet, so `GET /teacher/questions` cannot
return it. `fromApiQuestion()` sets `0` and says why at the code.

**Impact**: `/teacher/questions` will let a teacher delete anything. Harmless today, because no
assignment exists to reference a question; the moment assignments land it silently orphans
`Assignment.questionIds[]` — and `DEBT-001` means there is no cross-store transaction or foreign
key to catch it, since Question lives in MongoDB and Assignment in Postgres.

**Fix Plan**: when the Assignments module is built, return `usageCount` on the question list and
enforce the block in `QuestionsService.remove` — service-side, not only in the UI.

---

### [DOC-014] `KNOWN_ISSUES.md` has diverged across two unmerged branches, risking ID collision

**Severity**: High
**Status**: Open — **act before either branch is merged**

**Description**: this file is append-only with ids that are never reused, but two long-lived
branches have been appending to it independently:

- `feat/student-hanlu-ui` added `WEB-007`, `WEB-008`, `WEB-009`, `WEB-010` and `DOC-013`.
- `feat/s1-teacher-classes-api` (this branch) added `API-010` and `DEBT-004`, neither of which
  appears on the other branch.

Neither branch can see the other's ids, so the next agent on either one picks the same next number.
This session skipped `WEB-007`–`WEB-010` and `API-010` on purpose after checking both branches,
which is why the entries above start at `WEB-011` and `API-011`.

**Impact**: exactly the failure this file's header warns about — the 2026-08-31 chat session
reissued four live ids working from a stale copy. Here it would come from two *live* branches
instead, and git would merge both sides cleanly because they touch different lines.

**Fix Plan**: merge the two branches' issue lists by hand, in one commit, before either PR lands.
Do not let git auto-merge this file.


### [WEB-015] The student shell shows a hardcoded name instead of the signed-in user

**Severity**: High
**Status**: Open

**Description**: with `/student` now behind a login (2026-09-05), the area was opened as a real
signed-in account for the first time — `demo.student2@hsk.local`, display name *Học Viên Demo 2*.
The dashboard greets **"Chào buổi tối, Mai Anh"** and the sidebar footer also reads *Mai Anh*.
That name is mock data in `src/lib/student/*`; it is not the person holding the session.

**Impact**: the same defect class as `WEB-011` — a screen presenting invented data as the user's
own. There it was a different person's profile on `/admin/profile`; here every learner sees
someone else's name, XP (2.450), streak (12 ngày) and progress as their own. Worse than a blank
state, because nothing signals that it is fake.

**Reproduce**: sign in as any student, open `/student`. The greeting never changes.

**Fix Plan**: read the display name from the auth store (the session already carries it — the
admin and teacher shells do this), and leave the numbers absent until the progress endpoints
exist rather than substituting fixtures. Do not paper over it by renaming the fixture.

---

### [WEB-016] The DEMO state switcher ships in the production student build

**Severity**: Medium
**Status**: Open

**Description**: `WEB-004` recorded the dev-only REVIEW-STATE widget, and `WEB-011`'s fix made it
dev-only "because over live data it let a failed load be repainted as ready". That fix reached the
admin and teacher screens but **not** the student ones. Verified 2026-09-05 on a real production
build (`pnpm --filter web build` then `next start`, so `NODE_ENV=production`): `/student` renders a
`Sẵn sàng / Đang tải / Rỗng / Lỗi` switcher at both desktop and 375px.

**Impact**: a learner can flip their own dashboard into a fake "Lỗi" or "Rỗng" state, and once the
screens are wired to real endpoints the same control can repaint a genuinely failed load as
healthy — exactly the failure `WEB-011` was filed for.

**Fix Plan**: apply the same `process.env.NODE_ENV !== 'production'` gate the admin and teacher
screens now use. Do it before wiring any student screen to a real endpoint, not after.

**Numbering note**: `WEB-014` is taken by the unmerged branch `feat/s2-student-enrollment`, so
these start at `WEB-015`. Per `DOC-014`, reconcile by hand on merge.
### [BUILD-002] A fresh git worktree installs Prisma with an incomplete engines package

**Severity**: Medium
**Status**: Open — workaround known, root cause not fixed

**Description**: `git worktree add ../Real-<name>` followed by `pnpm install` reports success
(exit 0, "Done in 27.2s") but leaves
`node_modules/.pnpm/prisma@5.22.0/node_modules/@prisma/engines/dist/` holding only
`index.d.ts` and `scripts/` — **`dist/index.js` is missing**. Every Prisma command then dies
with `Cannot find module .../engines/dist/index.js. Please verify that the package.json has a
valid "main" entry`, which reads like a corrupt package rather than a partial install.

`pnpm rebuild prisma @prisma/client @prisma/engines` restores the native binaries
(`query_engine-windows.dll.node`, `schema-engine-windows.exe`) but **still not** `dist/index.js`.

**Impact**: `db:deploy`, `db:migrate`, `db:generate`, `db:seed` and the whole API test suite are
unrunnable in a new worktree. Since `multi-agent-workflow.md` §5 makes worktrees the prescribed
way for two agents to work at once, this blocks the project's own concurrency mechanism, and the
error message points at the wrong thing.

**Workaround** (used 2026-09-05, worked):

```
cp -r ../Real/node_modules/.pnpm/prisma@5.22.0/node_modules/@prisma/engines/dist/. \
      node_modules/.pnpm/prisma@5.22.0/node_modules/@prisma/engines/dist/
```

**Fix Plan**: likely pnpm 10/11 not running the `@prisma/engines` postinstall without approval.
Try declaring `pnpm.onlyBuiltDependencies` in the root `package.json` and verify from a genuinely
cold worktree — the store is shared, so a partial extraction can survive a reinstall and make the
problem look intermittent.

---

### [WEB-014] Student enrollment has a working API and no screen — F2.3/F2.4/F2.6 unreachable

**Severity**: High
**Status**: Open

**Description**: `POST /student/classes/join`, `GET /student/classes`, `GET /student/classes/:id`
and `DELETE /student/classes/:id/leave` are implemented and covered by 19 e2e tests
(2026-09-05), but `apps/web/src/app/student/` contains only the nine mocked self-study routes —
there is **no `/student/classes` route of any kind**. A student cannot join a class from a
browser.

**Impact**: the Sprint 2 DoD — *"Teacher creates class → student joins via code → teacher sees
the student in the list"* — is proven by an automated test and **not** by a person using the
product. `ai/PROGRESS.md` marks F2.3/F2.4/F2.6 `✅` on the strength of the API; do not read that
as a shippable flow.

**Fix Plan**: run `flow-mapper` for `/student/classes` and `/student/classes/[classId]` to
produce Page Contracts (the pipeline is mandatory for any screen), then build and wire them to
the live endpoints. Do not repeat `WEB-011`: no fallback fixtures, and a failed load must say so.

**Numbering note**: assigned against `origin/main`, where the highest web id is `WEB-013`.
`DOC-014` warns that `WEB-007`–`WEB-010` were added on an unmerged branch; if another branch has
also taken `WEB-014`, renumber this on merge rather than dropping either entry.

---

### [WEB-017] `/student/landing` is live prototype content, and the branch it came from is still abandoned

**Severity**: Medium
**Status**: Open

**Description**: `/student/landing` was restored to `main` on 2026-09-05 because it 404'd. The
page itself says what it is — *"Bản prototype giao diện · dữ liệu mô phỏng · không cần đăng
ký"* — and every figure on it is a fixture in `apps/web/src/components/site/landing-data.ts`:
named teachers with invented credentials (*Thạc sĩ SISU*, *Tiến sĩ Ngôn ngữ học PKU*), a
*"Bảng vàng thành tích"* of students, and counts (9 levels, 76 grammar points, 214 radicals, 57
pinyin sounds). It is now publicly reachable with no login.

**Impact**: this is the only page on the platform a stranger can read, and it presents invented
teachers and invented student results as fact. The prototype disclaimer is one small line. That
is a different risk class from the mock data on the guarded screens, which only a signed-in user
sees.

**Fix Plan**: before this is pointed at real users, either replace `landing-data.ts` with real
staff and real outcomes, or cut the sections that assert facts about people. Do not simply
enlarge the disclaimer.

**Related**: the rest of `feat/student-hanlu-ui` is still unmerged — 24 commits, and `main` has
moved 64 past it. Its PR #24 was closed 2026-09-05 04:06 UTC with `mergedAt: null` and **no
comment recording why**. Only the landing route was ported here; the branch also rewrites the
student area by 52 files (+15.9k/−3.3k) and holds `WEB-007`–`WEB-010` and `DOC-013` in its own
copy of this file (see `DOC-014`). Someone has to decide whether that branch is revived or
dropped — leaving it half-ported is the worst of the three states.

---

## Technical Debt

### [DEBT-005] The landing page ships ~8.5 MB of uncompressed teacher photos

**Severity**: Low
**Status**: Open

**Description**: `apps/web/public/teachers/*.png` are four PNGs of 1.9–2.3 MB each, committed
as-is from `feat/student-hanlu-ui`. They are texture sources for the three.js carousel on
`/student/landing`, which is now the only page reachable without logging in.

**Impact**: the first paint of the only public page pulls ~8.5 MB. On a phone connection that is
the whole first impression.

**Fix Plan**: compress and resize to the size the cylinder faces actually sample, or convert to
WebP with a PNG fallback. Do this before the page is linked anywhere public — see `WEB-017`,
which has to be settled first anyway.

---

### [DEBT-001] No cross-DB transactions

**Severity**: Medium
**Status**: Won't Fix (by design)

**Description**: PostgreSQL and MongoDB do not share a transaction. If creating a Question (MongoDB) succeeds but linking it to an Assignment (PostgreSQL) fails, orphan data can result.

**Workaround**: Periodic cleanup script, or soft-delete instead of hard-delete.

---

### [DEBT-002] No real-time notifications (polling only)

**Severity**: Low
**Status**: Won't Fix (Sprint 6 scope)

**Description**: Notifications use 60-second polling, not real-time WebSocket.

**Workaround**: Polling interval is sufficient for the current use case.

---

### [DEBT-003] Content data defects in the F9–F16 source files

**Severity**: Low
**Status**: Open — **blocked by `DOC-011`** (the files are not in this repo)

**Description**: Counting and balance problems reported by the 2026-08-31 session while writing
`PROJECT_KNOWLEDGE.md` §8. Recorded here so they are not rediscovered; **not verifiable from this
repo**, since the files are missing.
- `grammar.json` declares 60 points; the per-level counts sum to 51
- `与其…不如…` appears under both HSK 5 and HSK 8 — one must go
- `writing.json` declares 60 characters; the per-level counts sum to about 65
- `levels.json` XP curve is uneven: Cử nhân 24,000 → Cống sĩ 26,400 is a 2,400 gap, while
  Cống sĩ → Tiến sĩ is 25,600
- HSK 7–9 content is thin: 3–4 grammar points and ~2 characters per level

**Fix Plan**: authoring work, not engineering. Locate the files first (`DOC-011`).

---

### [API-010] Three teacher-API error branches have no usable code — blocks coding

**Severity**: High
**Sprint**: Teacher API
**Status**: ✅ Resolved 2026-09-03 (same day, owner-approved) — `SESSION_INVALID_TRANSITION`
(409) · `QUESTION_IN_USE` (409) · `ATTEMPT_NOT_SUBMITTED` (409) added to
`API_ERROR_CODES.md` as agreed, and the `LESSON_*` family (6 codes) was signed off as agreed
in the same decision. The teacher module specs' §9/§16 were updated to match.

**Description**: found 2026-09-03 while writing the Teacher module specs
(`docs/api/modules/teacher/`). Three frequently-hit branches have no code in
`API_ERROR_CODES.md` that fits, and the registry rule forbids inventing one:

1. **Teacher session transition errors** (start/end/submit from a wrong status) —
   `05-sessions.md` §9. `SESSION_ALREADY_REVIEWED` is Admin-flavored ("already approved or
   rejected"); the code `FLOW_SESSION_ATTENDANCE.md` §5 uses for this branch
   (SESSION_ALREADY_SUBMITTED) is **not in the registry** — `check-docs` confirms it.
2. **Question edit/delete gated by a published assignment** — `02-question-bank.md` §9
   (INV-TQ-05). No `QUESTION_*` code covers "in use".
3. **Grading a non-`submitted` attempt** — `04-attempts-grading.md` §9.
   `ATTEMPT_ALREADY_SUBMITTED` reads backwards for this branch; `ATTEMPT_NOT_IN_PROGRESS` is
   the student edit code.

Also recorded in the specs' §16 and `teacher/_INDEX.md` §4: ~~`LESSON_*` (6 codes) and `AI_*`
(3 codes) remain *proposed, not agreed*~~ — `LESSON_*` was signed off as **agreed**
2026-09-03; `AI_*` stays *proposed* (parked with the AI-suggest endpoint, owner decision).

**Fix Plan**: the BE/registry owner adds the missing codes (or signs off mapped reuses) in
`API_ERROR_CODES.md`. Numbering note: API-008/API-009/DOC-013 are known to exist on a branch
not yet merged to `main` when this entry was written; this entry is API-010 to avoid reuse.

---

### [DOC-014] TeacherPayRate read for teachers: three-way contradiction

**Severity**: Medium
**Sprint**: Teacher API
**Status**: Open

**Description**: found 2026-09-03 while writing `docs/api/modules/teacher/06-income.md` §5.
Three sources disagree on whether a teacher may read their own pay rate:

| Source | Says |
|---|---|
| `RBAC_MATRIX.md` | no TeacherPayRate read row at all (only "set = Admin") |
| `PERMISSIONS_TEACHER.md` § Income | "🔒 Read their own TeacherPayRate" — **grants** it |
| `docs/api/modules/05-payroll.md` §5 | reads the missing row as forbidden ("a teacher can't even read their own rate") |

**Impact**: the teacher Income screen has nowhere to show the rate from; any income-adjacent
FE contract is a guess until settled.

**Fix Plan**: PO decides; then align all three docs in one commit. The Teacher income spec
(06) deliberately reads no rate either way, so it is not blocked — but its DTO cannot grow
rate fields until this closes. Numbering note: written against a tree where DOC-013 exists on
an unmerged branch; this is DOC-014.

---

## Resolved Issues

- **`GIT-002`** `.idea/` tracked in git — resolved, verified 2026-08-25 and 2026-09-01.
  (Entries stay in place above with a resolved status; this list is the index.)
