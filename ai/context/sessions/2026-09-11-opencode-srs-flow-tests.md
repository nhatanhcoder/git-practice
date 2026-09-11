## [2026-09-11] — SRS flow integration tests (study → feedback → reload-state) — opencode — branch `test/srs-flow-integration`

**Done**:
- New `apps/api/test/student-flashcards-flow.e2e.test.ts` (9 tests), same tsx+dist runner
  pattern as the existing suite, zero overlap with it (no SM-2 maths / role-guard /
  input-validation dupes). Own users `test.srsflow.a/b@hsk.local`, own cards tagged
  `test-srs-flow-e2e` at HSK 4+5; no seed row read or mutated (API-012); no field, path
  or code invented (contract: `student-srs.md` `route: /student/flashcards`).
- Results — new suite **9/9**, existing `student-flashcards.e2e.test.ts` regression **6/6**:
  empty out-of-range page keeps envelope; concurrent L4/L5 browses self-consistent;
  POST review deep-equals reloaded browse row + stats; past-due fixture served most-overdue-first
  (≤20); second rating advances SM-2 and clears due; parallel double-POST both 201 with
  totalReviews +2 (no idempotency key in contract — documented, client guard owns dedupe);
  A/B states mutually invisible on the shared card; forged/missing token → 401
  `AUTH_TOKEN_INVALID`; absent ObjectId → 404 `FLASHCARD_NOT_FOUND`.
- Fixture cleanup verified after green run: 0 tagged flashcards, 0 flow users left.
- `after()` runs on failure by node:test guarantee + pre-run TAG sweep, so fixtures are
  cleaned even on red/killed runs.
- `pnpm --filter api build` is RED on pristine `origin/main@73bdd2c` (pre-existing TS2322
  in `vocab-apply.ts:56`) — recorded as **BUILD-004**, not fixed (out of scope; another
  lane has an uncommitted cast in flight). Suites run via tsx, unaffected; `dist/` emits.
- Fresh worktree also needs `db:generate` before build (254 Prisma errors otherwise) —
  setup note, cf. BUILD-002.
- check-docs 9/9. Worktree `Real-srs-flowtest` from `origin/main@73bdd2c`; main checkout
  (`feat/s3-assignments`, 2 dirty files) untouched.

**In progress** (and why it's unfinished):
- Commits local: claim (`09ca95f`) + suite (`pending`) + RECORD (`pending`). Push + PR
  still to do — no merge/deploy per owner order.

**Contract/temporary decisions to preserve**:
- Test-files-only scope held: no assignments/schema/auth/config/lock edits. Local `.env`
  copied into the worktree only (gitignored, same machine).
- True token-expiry (`AUTH_TOKEN_EXPIRED`) is NOT RUN — minting an expired token needs the
  JWT secret; invalid-token 401 path is covered instead.
- Network-error retry + stale-response-wins are FE concerns, covered by
  `srs-session.test.mjs` (20 tests) — cited in-suite, not re-tested at API level.

**Needs from the other lane**:
- None. No production-code correction requested: the double-POST count is contract-faithful
  (no idempotency key), and BUILD-004 already has an in-flight fix elsewhere.

**Blocker / needs follow-up**:
- `pnpm --filter api build` red on main (BUILD-004) — whoever lands the cast first closes it.

**Next steps**:
- Commit suite + RECORD, push, open PR (request review; no merge).
