## [2026-09-09] — /student/mistakes + /student/exams honesty pass (hooks order, sprint copy, visible demo banners) — claude — branch `feat/student-prod-return-hooks`

**Context**: the user asked to plan and code `/student/mistakes` + `/student/exams`. Both are
backend-less (Sprint 4 exam engine + mistake collection do not exist; `API_STUDENT.md` lists
"platform mock exams" as no-contract). Per WEB-011/API_STUDENT rules the screens must not
invent endpoints or present mock data as live — so the meaningful code is an honesty pass:
legal React shape, correct dependency copy, and disclaimers the viewer can actually see.

**Done**:
1. **WEB-023 (fixed same batch)**: 17 of 20 `student/(app)` pages early-returned the
   production `UnavailableState` before their hooks (Rules-of-Hooks violation; A05 had fixed
   only `/mistakes/review`). All 17 now place the branch after the hooks with the same
   explanatory comment. Regression test `apps/web/scripts/student-prod-return.test.mjs`
   scans every student page for a hook after the prod early-return; **proven to fire** by
   reverting `grammar/page.tsx` to the violating shape (red) and restoring it (green).
   `foundation` needed no move (no hooks follow its branch).
2. **Exams prod copy corrected**: the 3 `/exams` routes cited "Sprint 5"; the exam engine is
   **Sprint 4** (`AttemptsModule`, SPRINT_PLAN.md). New copy also says what the screen waits
   for instead of a vague "quay lại sau".
3. **`DemoBanner` (new component)**: exams list, exam room, result sheet and mistakes/review
   ran browser-local mock data with the disclaimer only in code comments — WEB-017's lesson
   is that such disclaimers are never read. Each now renders a visible "dữ liệu mô phỏng"
   note in dev; it renders nothing in production (those routes already show `UnavailableState`).
4. Docs: `student-flow.md` note (hook-ordering rule + correct sprint citation), KNOWN_ISSUES
   WEB-023 entry, PROGRESS entry.

**Verification**: `pnpm --filter web build` clean · **111/111 web tests across 28 suites**
(1 new) · `check-docs` 8/8 · browser: dev server shows all 4 banners (exams list, exam room
`HSK 1 — Đề mẫu 1`, result, mistakes/review "Ôn lỗi sai · câu 1/6"); `next start` production
shows the new Sprint-4 `UnavailableState` message on exams; 375px no horizontal overflow.

**DB/Auth/RBAC/money**: none touched. No backend, no endpoints invented.

**Temporary decisions to preserve**:
- The DemoBanner styling uses fallback values inline (`var(--warn, #b45309)` etc.) so it
  renders correctly even if a token sheet changes; it is NOT a new design token (no
  `/design-promote` involvement).
- Scope decision (user did not pick from the options offered): "honest screens" was chosen by
  best judgment — full Sprint 4 needs owner-approved contracts + schema (hard gate), mock-UI
  polish contradicts WEB-011. If the owner wants the exam engine, that starts with the
  Attempts contract, not this PR.

**Blocker / needs follow-up**:
- The real `/student/exams` and mistake notebook need **Sprint 4 backend** (Attempts +
  grading + mistake-collection endpoints). Until then both screens stay demo/dev-gated —
  this PR only makes that state honest and visible.

**Next steps**:
- Review/merge order: #49 → #50 → #52 → #51 → #53 → this PR (all doc-only or FE-only, no
  cross-conflicts expected except `student-flow.md` if #51 lands first — trivial).

## 2026-09-13 merge review

Kept newer live Assignments and current Grammar/Learning Path gate implementations on main; retained the other demo banner/hook corrections. Updated the regression test to inspect hooks only inside the gated function. Lint, web build 44/44, tracked web tests 171/171 and check-docs 9/9 passed. CI pending.
