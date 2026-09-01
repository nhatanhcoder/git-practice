## [2026-09-01] — Build the remaining 5 Teacher screens (S3–S6) — opencode

**Done**:
- Continued on `feat/teacher-s2-classes` (S2 screens not yet PR'd; same lane flip).
- Wrote 5 Page Contracts (`teacher-question-bank`, `teacher-assignments`, `teacher-grading`,
  `teacher-sessions`, `teacher-income`) + flow-map v2 section (trees + transitions 14–26 +
  expanded entity state machines from FLOW_GRADING / FLOW_SESSION_ATTENDANCE). Every
  error code recorded as `TODO(error-code)` — nothing invented; endpoints cited verbatim
  from `API_TEACHER.md`.
- Built all 5 screens in `apps/web/src/app/teacher/**`, Admin pattern (CSS modules,
  `status.ts` badges, REVIEW-STATE switcher, mobile card lists):
  - `/teacher/questions` — filter by skill/HSK/sub-type (options adapt to skill),
    create/edit modal with dynamic MCQ options editor, preview modal, delete confirm
    gated by `usageCount > 0` (F3.6 soft-delete rule, tooltip explains).
  - `/teacher/assignments` — 2-step create wizard (info → question picker from the bank),
    edit/delete locked when `submittedCount > 0` (T-ASGN-5), submission-stats drawer
    (submitted vs not-submitted rosters).
  - `/teacher/grading` — queue (class/status filters), grading drawer with per-question
    score + feedback inputs, **AI gợi ý** button on writing questions only (fills inputs,
    overridable — per FLOW_GRADING), finish-gating until every question scored; graded
    attempts open read-only.
  - `/teacher/sessions` — status machine `scheduled → completed_pending → approved|rejected`;
    create modal, "Bắt đầu" records actualStart, attendance drawer (present/absent_excused/
    absent_unexcused + note), "Gửi duyệt" confirm with topic+notes (payload per FLOW §3.2),
    rejection-reason modal.
  - `/teacher/income` — view-only (RBAC): stat strip (period/sessions/paid total),
    periods table, period drawer with per-session breakdown; totals come from the mock
    envelope — no client-side money arithmetic.
- New mock data: `lib/teacher/{question,assignment,grading,session,payroll}-data.ts`.
- Shell: 7 live nav items; "Phân tích lớp học" stays disabled (T-ANL, S5, not contracted).
- Verification: `pnpm --filter web build` exit 0 (33 routes incl. 9 teacher);
  `node scripts/check-docs.mjs` all 8 passed.
- Mid-session incident, fixed: a PowerShell `Get-Content/Set-Content` round-trip corrupted
  the flow map's UTF-8 (Vietnamese mojibake); restored from git and redid the path fix with
  a Node script. Lesson: never round-trip UTF-8 files through PS 5.1 string cmdlets.

**In progress** (and why it's unfinished):
- Everything still fully mocked — no backend exists for any of these endpoints.

**Contract/temporary decisions to preserve**:
- `Attempt.status=graded` renders via status.ts's neutral fallback — it is NOT in the
  design system's enum→colour map, and the map is the single source (do not add a colour
  locally). Same for `absent_excused` (neutral) — only `present`/`absent_unexcused` are mapped.
- Income totals are display-only from the envelope; no client arithmetic (money rule).
- Session "start/end" record actual times but do NOT change the status enum — submit is
  the only transition (per FLOW_SESSION_ATTENDANCE §2).

**Needs from the other lane**:
- (fe → be) Error codes for Question/Assignment/Attempt/Session actions — all contracts
  say `TODO(error-code)`.

**Blocker / needs follow-up**:
- No screenshots (no browser tooling); verify via `pnpm --filter web dev` → `/teacher/*`.
- Branch `feat/teacher-s2-classes` now holds both S2 and S3–S6 work (9 commits incl. S2) —
  not yet pushed; consider one PR "Teacher FE (mock)" or split before pushing.

**Next steps**:
- Human review of the 5 new screens.
- Push + PR when approved.
