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
**Status**: Open

**Description**: Mapping the Admin surface surfaced endpoints that do not exist in
`docs/api/API_ADMIN.md`, the worst being `GET /api/v1/admin/payroll/:id`.
Also, the entire `INVOICE_*` error-code family is absent from `API_ERROR_CODES.md`.

**Status update 2026-08-14**: all 7 endpoints are now *written down* in `API_ADMIN.md`
§ *Referenced by FE contracts, not yet defined*, and the `INVOICE_*` / `RATE_*` / `SESSION_*`
/ `AI_*` code families exist in `API_ERROR_CODES.md` marked **proposed, not agreed**.
**Still Open** — documenting a gap is not closing it. Five business decisions still block
four of the endpoints.

**Fix Plan**: full list in `ai/PROGRESS.md` → `## Needs from the other lane`.

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

### [WEB-007] Every learning-path lesson above HSK 1 rendered "Không tìm thấy chặng"

**Severity**: High
**Status**: ✅ Resolved 2026-09-03 — found by the first Playwright run, minutes after the check existed.

**Description**: `apps/web/src/app/student/learning-path/[nodeId]/page.tsx` derived the curriculum
and level from the node id with `nodeId.match(/-L(\d+)-/)` and `nodeId.startsWith("han_yu")`.
Neither pattern has ever matched a generated id: `learning-path-data.ts` builds them as
`std-<level>-l<n>` / `-sq<n>` / `-boss` and `hy-<level>-…`. Every id therefore fell back to
"HSK Standard Course, level 1", so `buildLevelMap(...).nodes.find(...)` missed and the page
rendered its own not-found branch.

**Impact**: only HSK 1 Standard Course lessons opened. Every other level, and the entire
Hán Ngữ Giáo Trình curriculum, was unreachable from the map — a large share of the Student area.

**Why it survived**: the 2026-09-03 fidelity session recorded "smoke-tested all 20 Student
routes, including valid dynamic lesson IDs". It had used `std-1-l1`, which resolves correctly
**by accident** — the fallback is level 1 of the Standard Course. One fixture drawn from the
fallback's own value proves the parser works exactly where it cannot fail.

**Fix**: parse `^(std|hy)-(\d+)-`. Fixtures at `std-3-l2` and `hy-1-l1` added to
`apps/web/tests/routes.ts`, plus an assertion that a listed route never renders a
"Không tìm thấy" heading — the not-found branch returns 200 and renders an `h1`, so without
that assertion the check would have screenshotted a broken screen and passed.

**Lesson**: a fixture set drawn from one level, one curriculum or one id shape tests the happy
default, not the code. Spread fixtures across the axes the code branches on.

---

### [WEB-008] Three screens scrolled horizontally at 375px

**Severity**: Medium
**Status**: ✅ Resolved 2026-09-03 — both found by the 375px project of the new screen check.

**Description**: two nowrap flex rows held content wider than the mobile content column, so the
overflowing child dragged the whole document past the viewport:

- `/student/learning-path/[nodeId]` — "Mở thư viện ngữ pháp" (216px) beside "Sang phần luyện
  tập" in a 293px row; the document went to 388px in a 375px viewport.
- `/admin/payroll` — the teacher select plus "Tạo kỳ lương" needed 393px in a 343px column
  (409px document), and once that was wrapped the filter card's year + status + "4 kỳ lương"
  still needed 361px (378px document). Both needed fixing; the first fix alone looked like a
  failure to fix anything.

**Fix**: `wrap` on the lesson row; `flex-wrap: wrap` on `.titleControls` and `.filterCard` in
the `max-width: 768px` block of `payroll.module.css`, with `.teacherSelect` allowed to shrink.

**Third, found the same day on a route committed while this check was being written**:
`/student/landing` reached 443px. Two causes again — the sitebar keeps a 158px premium CTA
beside the theme toggle and the burger, and the final CTA's label measures 416px against a
global `white-space: nowrap` on `.btn`, so the button was wider than the viewport and spilled
out of both edges. Fixed in the `max-width: 768px` block of `landing.css`; the CTA hide is
scoped to `.sitebar__actions` because the mobile menu reuses the same class for its own copy.

**Note**: `/admin/payroll` is an Admin screen on a different design baseline, fixed here only
because it is a two-line CSS change and leaving CI red on a pre-existing bug is worse than a
small cross-area commit.

---

### [WEB-009] Student route changes felt slow and had no transition feedback

**Severity**: Medium
**Status**: ✅ Resolved 2026-09-03 — verified in production mode and by the Student screenshot matrix.

**Description**: Student navigation relied only on Next's default route loading. Cold route
chunks could take long enough to feel unresponsive, while the persistent shell gave no visible
or accessible indication that navigation had started.

**Fix**: stagger-prefetch the top-level Student routes after first paint, prefetch rail/tab/sheet
targets on hover or focus, show a capped route progress bar with `aria-busy` and `aria-live`, and
provide Student-scoped loading and error boundaries. Warm production navigation measured about
81 ms to URL change and 117 ms to the destination heading. The mandatory Student Playwright run
passed 38/38 across desktop and 375px mobile.

---
### [API-002] Two contradictory rate-reading formulas — wrong amounts

**Severity**: Critical
**Sprint**: Backend Phase 0
**Status**: Open

**Description**: `ADR-008` (Accepted, 2026-08-13) specifies rates are **append-only**: changing
a rate = creating a new record, reading the applicable rate via
`WHERE effectiveFrom <= <date> ORDER BY effectiveFrom DESC LIMIT 1`.

However, `ENTITY_TEACHER_PAY_RATE.md` and `ENTITY_STUDENT_TUITION_RATE.md` say *"To update
rate: set `effectiveTo` on current, create new record"* and *"Active rate = where
`effectiveTo IS NULL` or `effectiveTo > today`"* — meaning it **UPDATEs the old row** and reads
via a completely different SQL query.

**Reproduce**: For the same teacher and the same payroll period, the two queries return two
different rate records if `effectiveTo` is set incorrectly or not set → **two different pay
amounts**.

**Fix Plan**: Lock one side via an ADR before writing the first line of money-calculation code.
Evidence leans toward ADR-008: FE `admin-tuition-rates.spec.md` describes history using only
`effectiveFrom` + a `current` flag, without `effectiveTo`. If ADR-008 wins, `effectiveTo`
should be removed from the schema, or clearly marked as a derived column for display only.

---

### [API-003] Mistakenly created `draft` payroll period has no cancellation path

**Severity**: High
**Sprint**: Backend Phase 3
**Status**: Open

**Description**: Creating a `PayrollPeriod` assigns `payrollPeriodId` to the `ClassSession`
records grouped into the period. There is no endpoint to delete a `draft` period or unassign
sessions — `API_ADMIN.md` only has `POST /admin/payroll`, `GET`,
`PATCH /:id/finalize`, `PATCH /:id/pay`.

**Reproduce**: Admin creates a payroll period by mistake (wrong date range, wrong teacher) →
the assigned sessions are **permanently locked** out of all future payroll periods, because
they no longer have `payrollPeriodId IS NULL`.

**Workaround**: Direct DB edit. Not acceptable in production.

**Fix Plan**: Add `DELETE /admin/payroll/:id` allowed only when `status = draft`, and it must
unassign `payrollPeriodId` from all sessions in the same transaction.

---

### [API-004] `GET /admin/sessions/pending` will be permanently empty

**Severity**: High
**Sprint**: Backend Phase 3
**Status**: Open

**Description**: The session review screen has no data source. Two gaps compound:
1. There is no endpoint to create a `Class` or `ClassEnrollment` for any role in the current
   design scope — `API_ADMIN.md` has none, and `Class.create` per RBAC belongs to Teacher.
2. The three transitions `scheduled → in_progress → completed_pending` for `ClassSession` have
   no endpoint anywhere. Nothing can move a session into `completed_pending` status.

**Reproduce**: Build `GET /admin/sessions/pending` → always returns an empty array.
The `session_submitted_for_review` notification is never emitted.

**Fix Plan**: Decide SCOPE-01 (see `ai/PROGRESS.md` § Still unsettled). Two options and a
recommendation are in `docs/api/modules/03-classes-enrollment.md` §16.

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

### [SCOPE-02] Product model is undecided: LMS vs single-user self-study

**Severity**: Critical
**Status**: Open — **blocks roadmap planning**

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

**Fix Plan**: locate the content (`DOC-011`) first, then the owner decides. Do not start work
that assumes either answer.

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
**Status**: Open — **needs the owner**

**Description**: `PROJECT_KNOWLEDGE.md` §8 and `COWORK_BOOTSTRAP.md` are both written around 10
static JSON files at `backend/data/content/` (`grammar.json`, `writing.json`, `lego.json`,
`exams.json`, `workplace.json`, `learning-path.json`, `badges.json`, `levels.json`,
`leaderboard.json`, `foundation.json`) plus `backend/data/progress.default.json`.

Verified 2026-09-01: there is **no `backend/` directory, no `content/` directory, and none of
those filenames** anywhere in `D:\PersonalProject\Real` (excluding `node_modules`). The repo
has exactly two apps, `apps/api` and `apps/web`.

**Consequences**:
- §8 (F9–F16) documents content nobody in this repo can read — it is a proposal, not a spec
- `SCOPE-02` rests on evidence that is not here
- The HSK 1–9 decision was re-justified on 2026-08-31 using these files; that justification is
  unverifiable here. It does not matter — the range was already settled 2026-08-11 on repo
  evidence (entity specs, `GLOSSARY.md`, `DATABASE_SCHEMA.md`, `CONVENTIONS.md`, `SPRINT_PLAN.md`)
- `DEBT-003` (content data defects) cannot be actioned

**Fix Plan**: the owner says where the content lives — another repo, an un-pushed local folder,
or an older project. Then either bring it in under a decided path or delete §8. Do not plan
F9–F16 until then.

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

### [DOC-013] Student FE contracts cite 18 endpoints absent from `docs/api/**`

**Severity**: High
**Status**: Open — blocks `node scripts/check-docs.mjs`

**Description**: Verified on 2026-09-03 while completing the Hán Lộ Student UI fidelity pass.
The docs checker reports 18 `endpoint-undefined` violations from existing Student FE contracts:
`PUT /progress/display-settings`, `GET /api/content`, `PATCH /api/progress`,
`PUT /mistakes/:id`, `POST /attempts`, `POST /nodes/:id/unlock`, `POST /activity`,
`PUT /grammar/:id`, `PUT /writing/:id`, `PUT /lego/:stationId`, `PUT /badges`,
`PUT /week`, `PUT /xp-months`, `PUT /streak-history`, `POST /lessons/:nodeId/complete`,
`PUT /workplace/:scenarioId`, `PUT /display-settings`, and `POST /reset`.

**Impact**: the Student mock UI builds and its routes render, but the repository-wide docs gate
cannot pass. This UI task did not define or call these endpoints; inventing API paths, fields,
error codes, auth or RBAC rules here would violate contract-first workflow.

**Fix Plan**: the docs/API owner must reconcile each FE contract with the accepted Student API
module specs. Remove obsolete references or document the accepted endpoint; do not bulk-add the
18 paths without entity, auth and RBAC review.

---

## Technical Debt

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

## Resolved Issues

- **`GIT-002`** `.idea/` tracked in git — resolved, verified 2026-08-25 and 2026-09-01.
  (Entries stay in place above with a resolved status; this list is the index.)
