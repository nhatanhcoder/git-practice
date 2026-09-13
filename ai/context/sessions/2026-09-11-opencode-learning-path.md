## [2026-09-11] — Student learning-path contract + rebuild (S-SELF-1) — opencode — branch `feat/student-learning-path`

**Done**:
- flow-mapper: `student-learning-path.md` + `student-learning-path-node.md` (both <60
  lines, `status: built`); every read/write ⛔ per API_STUDENT §83–94 (learning catalog
  and curriculum paths have no path/DTO/error contract — nothing invented);
  `student-flow.md` Learning Path branch + LP1–LP6 rows; `_INDEX.md` 2 rows.
- page-designer: 2 Tier-0 specs (existing mock is the visual reference; no external
  skill); mockup step N/A (no designer in loop — rebuild composes the same visuals).
- Rebuild: filters in URL (`?curriculum=&level=&view=`, validated, Suspense-wrapped
  `useSearchParams`); drawer unlock gains the Partial branch (XP unresolved → disabled
  with reason); node back link keeps map filters via history with deep-link fallback;
  MOCK(S-SELF-1) markers + contract refs in headers; boss 80% gate + XP mock rules kept.
- Verified: prod build 42/42 green; real API + dev web, student login — URL filters
  applied (18 list rows), drawer → `std-1-l1` detail 200, 4 screenshots read
  (desktop list, mobile map, drawer, node detail); check-docs 9/9.
- Lane note: `apps/web` is codex's lane but no parallel agent touches learning-path
  files (active S3 lane is assignments); solo-slice flip recorded here.
- Worktree `Real-learnpath` from `origin/main@73bdd2c`; main checkout untouched.

**In progress**: commits local; push + PR next, no merge/deploy.

**Merge review (2026-09-12)**: CI exposed that the list page suppression was obsolete while
the node page still returned before thirteen hooks. The default node export now performs only
the production gate and mounts `LessonInner` in development; all hooks live in that inner
component. Removed both learning-path suppression entries. Workspace lint and web type-check
pass on current main; a production web build is the remaining local merge check.
