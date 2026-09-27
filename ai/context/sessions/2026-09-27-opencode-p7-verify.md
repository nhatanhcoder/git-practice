# 2026-09-27 — P7 verification round (real DB + regression fix) — opencode

Branch `feat/api020-student-supplements` (base P6 head). Lane note: student FE on
explicit owner directive (P4→P7 chain); no codex worktree touched.

## Real-DB browser verification (temp spec, deleted after run)
Fixtures: teacher pw.p7t.*, student pw.p7s.* enrolled in class dfe29eab, lesson
be298c96 with unit hanlo-v1-hsk-1-unit-1 + grammar g001 supplements (seedp7.mjs).
API :3001 from this worktree (P5 code), web prod build :3000.
`zz-p7-student-supplements.spec.ts` 12/12 (desktop + 375px), zero console errors:
lesson renders supplements in server order with correct deep links
(`/student/learning-path/:slug`, `/student/grammar?point=:id`); unit page shows real
content, no fabricated score; `?point=` opens the drawer; assignedOnly toggle is
server-side + URL-restorable across reload; fresh student gets the honest assigned
empty state; dropped student gets 403 + empty assigned, then rejoins cleanly.
Screenshots read (lesson panel, assigned mobile — no overflow). Temp spec deleted;
timestamped fixtures stay as accepted dev-DB debris.

## Regression found and fixed
`student-grammar.spec.ts` mark-studied failed on both viewports: the P7 `?point=`
deep-link correctly reopens the drawer after reload, so the old test's card click hit
the scrim. New contracted behavior, not a bug — updated the test to close the drawer
(first asserting the URL drops `point=`) before continuing. 2/2 green after fix.

## Full P7 gate now
- Committed specs: 14/14 (lesson-supplements 4/4 incl. unavailable row + empty state;
  grammar 10/10 incl. assigned filter + deep-link).
- web build 43/43 · type-check ✅ · lint ✅ · check-docs 9/9 ✅.

## Open for owner
- Merge order: #102 (P4) → #103 (P5) → #98 → #104 (P6) → this P7 PR (stacked on P6).
- Unavailable-row UI proof is mocked-spec + P5 real-DB API proof (no shared-catalog
  mutation was made to force a live dead source).
