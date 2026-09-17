## [2026-09-17] — Student mock cleanup — opencode — branch `chore/student-mock-cleanup`

**Context**: owner ordered mock removal in stages: merge first, then a dedicated
cleanup PR (this one). Full inventory showed only 5 mock modules are truly
orphaned; `content.ts`/`store.ts`/rules still back 7 mock pages + the shell and
cannot go until those pages are wired (progress analytics BE, gamification
design, lego/workplace corpus, writing lane).

**Done**:
- Deleted `foundation-data.ts`, `radicals-data.ts`, `grammar-data.ts`,
  `learning-path-data.ts`, `lms-data.ts` (zero importers; tests assert some must
  never be imported).
- Removed unused `vocabCards` (content.ts) + `VocabCard` (types.ts); updated both
  file headers that referenced the deleted modules.
- Rewrote the A12 `keeps vocabCards` guard into a removal pin; dropped the one
  suppression entry for a deleted file.
- Verified: web build green · web unit 235/235 · scoped eslint clean ·
  check-docs 9/9.

**Not touched**: writing lane files (active lane), `student_test_results.xlsx`
(unknown owner), mock-backed pages + their data (separate wiring slices).
