## [2026-09-03] — Teacher API Phase 1: 6 module specs written — opencode — branch `feat/api-teacher-specs`

**Context**: owner asked for "spec để code cho teacher rồi code luôn, tự chạy kiểm thử fix
bug cho đến khi xong phần API của teacher". Work done in a dedicated worktree
`D:\PersonalProject\Real-opencode` (branched from `origin/main`) because **Antigravity is
actively working in the main checkout** on the Auth module (uncommitted `apps/api/src/auth/`
+ `RefreshToken` migration at session start; its foundation commit `924f7fe` appeared
mid-conversation).

**Owner decisions locked at plan approval (2026-09-03)**:
- SCOPE-01 (teacher slice): **teacher-side full management**; student join/leave stays
  deferred in Admin module 03.
- Income: **read-only over stored data**, no rate computation (sidesteps API-002/C2 + money
  Decision A).
- AI-suggest (Gemini): **parked** — endpoint specced, not implemented.
- Antigravity still running → code phase waits for auth to land on main.

**Done**:
- 6 module specs in `docs/api/modules/teacher/` (16-section template each):
  `01-classes-lessons.md` (14 ep, INV-TCL 01–10) · `02-question-bank.md` (5 ep, INV-TQ 01–07,
  MongoDB §7/§12 rethought per `_INDEX.md` §11) · `03-assignments.md` (5 ep, INV-TASG 01–08) ·
  `04-attempts-grading.md` (4 ep, INV-TGRD 01–08, AI-suggest parked) · `05-sessions.md`
  (6 ep, INV-TSES 01–09 — the teacher-side transitions + `session_submitted_for_review`
  producer that `API-004` said did not exist) · `06-income.md` (2 ep, INV-TINC 01–04,
  read-only, closes module 05's Q-PAY-7).
- `teacher/_INDEX.md` — module map, dependency order, cross-cutting rules, what the set closes.
- Admin `docs/api/modules/_INDEX.md` §11 + header updated to point at the teacher set
  (historical note kept).
- `RBAC_MATRIX.md`: Lesson + LessonAssignment rows added (owner-approved via the plan);
  `PERMISSIONS_TEACHER.md`: Lessons section added; both note the entity-spec origin.
- `check-docs` 8/8 (it usefully caught me quoting the unregistered
  SESSION_ALREADY_SUBMITTED code — reworded).
- KNOWN_ISSUES: appended **API-010** (3 missing teacher error codes — blocks coding) and
  **DOC-014** (TeacherPayRate read 3-way contradiction, new find).

**Method notes** (for whoever codes it):
- Sources were read verbatim (entity specs, API_TEACHER.md, modules 03/04/05 via a research
  subagent returning verbatim extracts, error-code registry, RBAC matrix). Nothing invented;
  every §16 row is a recorded open question, not a silent choice.
- Inherited invariants (INV-CLASS-*, INV-SESSION-*, INV-PAYROLL-*) are referenced, never
  renumbered. New prefixes: INV-TCL/TQ/TASG/TGRD/TSES/TINC.
- Known cross-doc conflicts deliberately re-recorded in §16s: C1 (nickname/fullName), C4
  (HSK 1–9), FLOW_SESSION_ATTENDANCE legacy naming + direct-submit machine vs module 04's
  two-step machine.

**In progress** (and why it's unfinished):
- Phase 2 (code) not started — two gates: (1) Antigravity's auth PR must land on main (every
  teacher endpoint needs teacher JWTs); (2) API-010's three error codes must exist or be
  signed off before the branches that throw them can ship.

**Contract/temporary decisions to preserve**:
- Spec numbering note: API-008/API-009/DOC-013 exist on a branch not merged to main at
  writing time; API-010/DOC-014 were assigned against the newest known state to avoid reuse.
- Worktree `D:\PersonalProject\Real-opencode` is live (branch `feat/api-teacher-specs`);
  remove it after merge per multi-agent-workflow §12.

**Needs from the other lane**:
- (opencode → BE owner) sign off `LESSON_*` + decide API-010's three codes.
- (opencode → owner) merge Antigravity's auth PR so the code phase can branch from main.

**Blocker / needs follow-up**:
- API-010 (error codes) — blocks 3 of 6 modules' error branches.
- DOC-014 — blocks any rate display for teachers.

**Next steps**:
1. Merge this PR (docs only — zero conflict with Antigravity's apps/api work).
2. After auth lands on main: branch `feat/api-teacher`, implement T1→T6 in dependency order
   with e2e tests per module (`pnpm --filter api test`), fixing until green.
3. AI-suggest stays parked until the owner re-opens the Gemini decision.

**Update (same day, after the first commit)**: the owner approved all four error-code
decisions — `SESSION_INVALID_TRANSITION` (409), `QUESTION_IN_USE` (409),
`ATTEMPT_NOT_SUBMITTED` (409) added to `API_ERROR_CODES.md` as agreed, and the `LESSON_*`
family (6 codes) signed off as agreed. `API_ERROR_CODES.md`, the four specs' §9/§16, the
teacher `_INDEX.md`, `KNOWN_ISSUES.md` (API-010 → Resolved) and `PROGRESS.md` were updated
in the same branch. The code phase is now gated **only** on Antigravity's auth landing on
main.
