## [2026-09-12] — Student assignments list contract (S-ASGN-1) + isolation e2e — opencode — branch `feat/student-assignments-list`

**Context**: S3 shipped BE (`listForStudent`: published + active-enrollment join) and live FE
with zero mocks, but no Page Contract existed (page cites a file that was never written;
`_INDEX` recorded the gap). T5 = the teacher-assignments S3 surface (controller + entity read
as pattern; untouched). Plan approved before any edit. No schema/Auth/RBAC/money change.

**Done**:
1. **Contract** `docs/front-end-design-docs/pages/student-pages/student-assignments-list.md`
   (flow-mapper template, 7 states `[x]`, existing codes only) — `status: built`. Registered in
   `pages/_INDEX.md` (replaces the "no separate contract file" note) + `student-flow.md`
   §2b branch and transition rows 10–11.
2. **Detail deliberately NOT built**: `GET /student/assignments/:id` is listed in
   `API_STUDENT.md` but unimplemented — marked ⛔ in contract Blocked-on + flow tree. Rows
   stay non-navigational. No endpoint/field/code invented.
3. **e2e** `apps/api/test/student-assignments-isolation.e2e.test.ts` (4 tests): A sees only
   class-A published (own draft + class-B published hidden); B mirrors; row shape
   (`className`, `questionCount`, no `enrollmentCode` leak); anonymous 401. Own `saiso.*`
   fixtures, both stores cleaned. (One self-caught slip: wrong `error-codes` import path —
   file failed to load in the first full run; fixed, then green standalone and in-suite.)
4. **Verify**: `pnpm --filter api build` clean · API **256/256 across 45 suites** (4 new) ·
   `pnpm --filter web build` 43/43 · `node scripts/check-docs.mjs` 9/9.

**Blocker / needs follow-up**:
- Student assignment detail needs a real endpoint decision (spec + BE) before rows can link.
- Attempt take/submit/result (S-ASGN-2..8) stays Sprint 4.

**Next steps**: review/merge this branch.
