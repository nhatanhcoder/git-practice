# 2026-09-15 — Live vocabulary learning path — Codex

## Scope and decisions

- Owner explicitly approved the Mongo catalog/progress schema and student-owned RBAC/API scope.
- Owner selected real vocabulary first. Only the approved repository copy of `writing.json` is published; no textbook lessons, XP, audio, official Attempt, SRS, or Flashcard behavior was invented.
- Skills used: flow-mapper, hsk-learning-ia, page-designer, build-screen, and ui-ux-pro-max within the existing v1 student design baseline.

## Implemented

- Deterministic, dry-run-by-default importer: 1,119 deduplicated words become 143 immutable HSK 1–9 units; repeat apply creates zero duplicates and rejects catalog drift.
- Student-only catalog/detail/start/study/answer/complete routes with ownership, prerequisite locking, optimistic revisions, server grading, idempotent start, and duplicate/concurrent write protection.
- Production `/student/learning-path` map/list and `/student/learning-path/[nodeId]` study → quiz → result flow with reload resume, account isolation, empty textbook catalogs, error/offline states, and 375px layout.

## Verification

- API build and web production build passed; web type-check and lint passed.
- `learning-path.e2e.test.ts`: 5/5 tests, including three independent real-DB lifecycle rounds with fresh users and isolated Mongo databases.
- Production Playwright: three repetitions for desktop 1280×800 and mobile 375×812; covered full lifecycle, reload during study/quiz/result, one-row/concurrent mutation behavior, account isolation, empty catalog, offline state and horizontal overflow.
- Web script tests: 233/233 passed. `node scripts/check-docs.mjs`: 9/9 passed.
- Full API suite was not rerun; the scoped new API suite ran via the documented Node 25 `tsx` CLI workaround for BUILD-005.

## Source and operational notes

- Dev catalog apply: 143 created on first run; second apply: 0 created, 143 existing.
- Dedicated verification servers used ports 3200/3201, leaving the user's port 3100 process untouched.
- No new known-issue ID was needed. Textbook catalogs remain intentionally empty pending verified source material.

## Next step

- Review PR for `codex/student-learning-path-live`; merge is not part of this task.
