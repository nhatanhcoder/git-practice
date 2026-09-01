# 2026-09-01 — Teacher Page Contracts + Flow Map (S2 slice) — Claude Code

**Context**: following `SCOPE-03`'s resolution (Teacher = full management), the owner asked to
run flow-mapper for Teacher's Sprint 2 slice (Classes + Lessons) — docs only, no code
("update docs lại để khớp thôi, tôi không cần bạn code").

**Done**:
- Read the flow-mapper/page-designer skills (`.agents/skills/flow-mapper/SKILL.md`,
  `.agents/skills/page-designer/SKILL.md`) and the §2 read-budget sources:
  `FEATURES_TEACHER.md`, `RBAC_MATRIX.md`, `PERMISSIONS_TEACHER.md`, `API_TEACHER.md`, plus
  `docs/flows/FLOW_ENROLLMENT.md` (cross-actor).
- Wrote 4 Page Contracts under `docs/front-end-design-docs/pages/teacher-pages/`:
  `teacher-dashboard.md`, `teacher-classes-list.md`, `teacher-class-detail.md`,
  `teacher-lessons-list.md`. Modals (create class, edit class, regenerate code, create/edit
  lesson) live inside their parent screen's contract, per flow-mapper's "one screen per
  contract" rule — not separate files.
- Wrote `teacher-flow.md` (trees, full transition table, entity state transitions, missing
  endpoints), derived from the contracts' own Entry points/Actions, not from memory.
- Updated `_INDEX.md` § Teacher (was `_Not yet mapped._`), and noted why `_Student_` is also
  still `_Not yet mapped._` despite the merged Student mockup — that mockup came from
  `docs/prompts/student-product/`, outside this contract pipeline.
- Claimed in `ai/PROGRESS.md` § Sprint 2, flagging that this section's `F2.*` IDs and
  `FEATURES_TEACHER.md`'s `T-CLASS-*`/`T-LESSON-*` IDs are two unreconciled numbering schemes
  for the same features — not two different scopes.

**Found while writing (not part of the original ask, recorded so it isn't lost)**:
- **`API-006`** (new): `API_TEACHER.md` and `docs/flows/FLOW_ENROLLMENT.md` describe the same
  Class endpoints differently — route prefix, archive's HTTP method, and where student-list
  lives. Contracts followed `API_TEACHER.md` per flow-mapper's designated read order; the
  conflict itself is filed, not resolved, in `KNOWN_ISSUES.md`.
- No `RBAC_MATRIX.md`/`PERMISSIONS_TEACHER.md` row exists for Lesson at all — ownership in
  `teacher-lessons-list.md` is inferred from Class ownership, flagged as unconfirmed.
- No dashboard-aggregation endpoint for Teacher — `teacher-dashboard.md` was scoped down to
  what S2 can actually support (a class-card preview) instead of mocking KPI numbers with
  nothing behind them.
- Corrected a dangling reference: `KNOWN_ISSUES.md`'s `API-005` workaround pointed at
  `_backup/env.example.local`, which was deleted earlier this session (untracked scratch, user
  confirmed). The variable *names* survive in `API-005`'s own description; only the old example
  values are gone and unrecoverable. Updated the entry to say so and point at
  `docs/api/modules/01-auth.md` instead.

**Mistake caught mid-session (self-caught via `check-docs.mjs`, then fixed)**: the first draft of
`teacher-lessons-list.md` cited five Lesson endpoints as if `API_TEACHER.md` defined them. It
doesn't — this repo's `API_TEACHER.md` has **no Lessons section at all** (only Classes, Question
Bank, Assignments, Grading, Sessions, Income). Those five endpoints were reconstructed from
memory of an `API_TEACHER.md` read much earlier in this same conversation — except that earlier
read happened against a *different, stale checkout* (`C:\Users\nhata\OneDrive\...`) before the
user redirected this session to the real repo (`D:\PersonalProject\Real`). `check-docs.mjs`'s
`endpoint-undefined` check flagged all five before commit. Filed as `API-007`, and rewrote
`teacher-lessons-list.md` + the Lesson branch of `teacher-flow.md` to mark every action `⛔`
instead of citing endpoints that don't exist. Also found and fixed while cleaning this up:
`CLASS_CODE_GENERATION_FAILED` (used in three places) isn't in `API_ERROR_CODES.md` either — it
only appears in `FLOW_ENROLLMENT.md`'s example TypeScript, never registered — replaced with
`TODO(error-code)`. And the flow map's short-form endpoints (`GET /classes/:id` etc.) were
missing the `/teacher` prefix that `admin-flow.md`'s equivalent shorthand keeps — fixed to match.

**Blocker / needs follow-up**:
- `API-006` (Class route mismatch) needs whoever writes the `ClassesModule` to pick a convention.
- `API-007` (no Lessons API) blocks `teacher-lessons-list.md` entirely — every action in it is
  `⛔`. Do not build that screen until the API exists.
- Question Bank, Assignments, Grading, Sessions, Analytics, Income screens are still
  `_Not yet mapped._` — this session covered only the S2 slice, as scoped.

**Next steps**:
- Owner review of the 4 contracts + flow map before any Teacher screen is built (page-designer
  is the next skill in the pipeline — not run this session, per "no code" instruction).
