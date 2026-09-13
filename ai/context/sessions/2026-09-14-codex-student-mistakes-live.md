---
status: completed — pending PR review
last_updated: 2026-09-14
---
## [2026-09-14] — S-MSTK Task B live notebook/review — codex — branch `codex/student-mistakes-live`

**Done**:
- Replaced EmptyState-only notebook and DEV-only review with live student-owned API pages.
- Added Mongo user_mistakes unique student/source index, real rating-0 capture, graded wrong-answer reconciliation, server-side question practice, optimistic version checks.
- Correct practice resolves; incorrect remains pending; later genuine failure reopens the same record.
- No flashcard/word-bank insertion, official score, XP, or SM-2 change from notebook practice.
- Read-only self-review checked production paths, ownership, answer embargo, concurrent review and unavailable source behavior.
- API 3/3 lifecycle tests passed. Production browser 2/2 projects passed (desktop + 375px), real registration/approval/login and review, reload, network-error state; no horizontal overflow.
- API build/type-check, web production build, lint, 212/212 web scripts and check-docs 9/9 passed.
- Claim dd0108b; backend 6c534e5; frontend e8f4ab9. Worktree D:/PersonalProject/Real-mistakes-live.

**In progress**: PR review only; implementation and local verification complete.

**Final regression**: 305/305 API tests, 53 suites, zero failed/cancelled/skipped (563.6s).
SRS teardown updated for the new derived mistake records; both SRS suites rerun 15/15.
Lint and API type-check rerun after the cleanup change. Both production browser projects
passed; 212 web script tests passed; web/API builds and check-docs passed.

**Contract/temporary decisions to preserve**:
- Owner explicitly approved additive schema and student-owned API after being told existing mistake transport was missing.
- Earlier question-only notebook contract is superseded by approved Task B including flashcard rating 0; word-bank bookmarks remain separate.
- Question source is isCorrect=false on a graded attempt. Teacher point overrides do not rewrite this flag.
- PostgreSQL history is reconciled into Mongo on reads in batches of 100; this bounds memory, not total latency. Replays do not reopen a resolved record.
- No historical SRS rating log exists, so no guessed flashcard backfill. Capture starts with this rollout.
- Missing/deleted sources return unavailable and cannot be practiced; version conflict requires refetch.
- Page spec documentation was initially omitted and added during final review; existing Hán Lộ components were reused without a new visual redesign or design promotion.

**Evidence**:
- API: `node --env-file=D:/PersonalProject/Real/.env node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 'test/*.test.ts'` in apps/api; tsx CLI workaround for BUILD-005.
- Browser: `..\\api\\node_modules\\.bin\\dotenv.cmd -e D:/PersonalProject/Real/.env -- pnpm exec playwright test tests/student-mistakes-live.spec.ts --workers=1` in apps/web.
- Browser assertion correction: target the notebook error text rather than all role=alert nodes (Next also has a route announcer).
- Source API returns 201 for flashcard review; test corrected to actual existing controller behavior.
- Images: apps/web/test-results/output/student-mistakes-live-S-MS-5b810-error-and-responsive-layout-desktop/{review,notebook}.png and corresponding mobile-375 directory. Visually inspected desktop notebook and mobile review.
- Browser test aborts only the notebook request to verify network failure; API was not stopped globally.
- Test fixtures create dedicated users/cards/classes and clean their own records.

**Needs from the other lane**: none.

**Blocker / needs follow-up**:
- No implementation blocker. Merge is not performed under this Task B scope.
- No new issue ID assigned; append-only KNOWN_ISSUES note records BUILD-005 and historical-source limitation.

**Next steps**: review the Task B PR; merge only with owner authorization.

**Remote**: origin verified as nhatanhcoder/git-practice; authenticated owner has ADMIN access.
An initial auto-review push rejection was resolved by verifying destination/ownership; branch push succeeded.

## Files updated

- `ai/PROGRESS.md`
- `ai/context/sessions/2026-09-14-codex-student-mistakes-live.md`
- `ai/known-issues/KNOWN_ISSUES.md`
- `apps/api/src/common/errors/error-codes.ts`
- `apps/api/src/flashcards/flashcards.module.ts`
- `apps/api/src/flashcards/flashcards.service.ts`
- `apps/api/src/mistakes/mistakes.controller.ts`
- `apps/api/src/mistakes/mistakes.dto.ts`
- `apps/api/src/mistakes/mistakes.module.ts`
- `apps/api/src/mistakes/mistakes.service.ts`
- `apps/api/src/mongodb/schemas/user-mistake.schema.ts`
- `apps/api/test/mistakes.e2e.test.ts`
- `apps/api/test/student-flashcards-flow.e2e.test.ts`
- `apps/api/test/student-flashcards.e2e.test.ts`
- `apps/web/scripts/srs-routes.test.mjs`
- `apps/web/src/app/student/(app)/mistakes/page.tsx`
- `apps/web/src/app/student/(app)/mistakes/review/page.tsx`
- `apps/web/src/lib/student/mistakes-service.ts`
- `apps/web/tests/student-mistakes-live.spec.ts`
- `docs/actors/student/PERMISSIONS_STUDENT.md`
- `docs/api/API_ERROR_CODES.md`
- `docs/api/API_STUDENT.md`
- `docs/api/modules/student/04-mistakes.md`
- `docs/api/modules/student/_INDEX.md`
- `docs/entities/_INDEX.md`
- `docs/entities/mongodb/ENTITY_USER_MISTAKE.md`
- `docs/front-end-design-docs/pages/_INDEX.md`
- `docs/front-end-design-docs/pages/student-pages/student-flow.md`
- `docs/front-end-design-docs/pages/student-pages/student-mistakes-review.md`
- `docs/front-end-design-docs/pages/student-pages/student-mistakes.md`
- `docs/front-end-design-docs/specs/student-pages/student-mistakes-review.spec.md`
- `docs/front-end-design-docs/specs/student-pages/student-mistakes.spec.md`
- `docs/shared/RBAC_MATRIX.md`
