## [2026-09-03] — Student Hán Lộ UI fidelity — codex — branch `feat/student-hanlu-ui`

**Done**:
- Read the reference implementation at `D:\PersonalProject\Chinese UI test\ui-claude\frontend` without modifying it.
- Added the prototype's Playfair Display, Sora, Inter and Noto Serif SC type stack and preserved the Student canvas across dark/light theme changes.
- Rebuilt the Dashboard hierarchy and corrected its daily-minute calculation and dead lesson link.
- Aligned Learning Path, Grammar, Foundation and Flashcards with the prototype's layout hierarchy; fixed Foundation's 375 px horizontal overflow.
- Unified the Hán Lộ eyebrow/title/subtitle pattern across Exams, Writing, Mistakes, Lego, Workplace, Leaderboard, Progress and Badges.
- Smoke-tested all 20 Student `page.tsx` routes, including valid dynamic lesson, exam, writing and workplace IDs.
- Verified desktop dark, desktop light and 375 px mobile views. `pnpm --filter web build` passed 37/37 pages; `node --test apps/web/scripts/*.test.mjs` passed 34/34.

**In progress** (and why it's unfinished):
- The claim remains 🔶 because this is still `MOCK(student)` frontend data; no accepted API integration was in scope.

**Contract/temporary decisions to preserve**:
- Student styling remains scoped below `.student-root`; Admin/Teacher design baselines were not changed.
- `root-design-fe.md` and `_DESIGN-SYSTEM.md` were not promoted because the human did not run `/design-promote`.
- No DB schema, auth, RBAC, payment rule, endpoint, field or error code was changed or invented.

**Needs from the other lane**:
- Docs/API owner must reconcile the 18 Student FE contract endpoint references recorded as `DOC-013` before the docs gate can pass.

**Blocker / needs follow-up**:
- ⛔ `node scripts/check-docs.mjs` fails with 18 pre-existing `endpoint-undefined` violations; full list is in `ai/known-issues/KNOWN_ISSUES.md` under `DOC-013`.

**Next steps**:
- Review and merge the UI PR.
- Resolve `DOC-013` through accepted Student API/entity/auth/RBAC specs, then rerun the docs gate.
- Run `/design-promote <screen>` only if the human explicitly chooses to promote this shipped Student direction into the project baseline.

**Navigation follow-up (same branch)**:
- Added idle plus intent-based prefetch for all top-level Student destinations, including
  `/student/placement`, with visible and accessible transition feedback and Student-scoped
  loading/error boundaries.
- Production measurement after warm-up: ~81 ms to URL change and ~117 ms to the destination
  heading. The route indicator also appeared during a deliberately cold transition.
- Mandatory screenshots passed 38/38 (`PW_AREA=student`) across desktop and 375px mobile; visual
  inspection of Dashboard, Learning Path and Foundation found no typography/layout regression.
