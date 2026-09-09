## [2026-09-08] — A11: vocabulary importer built and tested (dry-run verified on Atlas) — opencode — branch `feat/a11-vocab-importer`

**Context**: TASK A11 from `docs/prompts/student-integration-checklist.md`, stacked on the
approved A10 branch. The owner approved all three A10 unlock conditions in-session:
provenance (corpus is theirs), seed = the 1,228 `words[]` entries, and the source copied
into the repo (`apps/api/content/writing.json`, byte-identical, 388,024 bytes).

**Commits**: `c57cc01` claim · `1a9c453` source copy + decision records · `023bb9c`
importer + tests + CLI (+ one records commit).

**Built**:
- `src/flashcards/import/vocab-extract.ts` — pure module (no Nest/Mongoose imports, runs
  under plain `node --test`): validation (empty hanzi/pinyin/meaning, level 1–9), dedup by
  hanzi with deterministic winner (lowest level, then source order), full reporting of
  duplicates and conflicts (nothing silently dropped), mapping per the audit §6
  (vi→meaning, level inherited, tags `["hanlo"]`, no example/audio fields).
- `src/flashcards/import/vocab-apply.ts` — write side: **dry-run default**; upsert keyed by
  hanzi alone so reruns are idempotent and a level change updates the same document (no
  cross-level duplicates); `_id` preserved (delete-and-recreate never happens); never reads
  or writes `user_flashcard_states`; pre-existing same-hanzi duplicates in the target are
  reported, not merged silently; one 300ms retry per op for connection blips, then the
  error is reported and rerun is the recovery path (A11 rule 7).
- `scripts/vocab-import.ts` CLI + package scripts:
  `pnpm --filter api vocab:dry-run` (default) / `pnpm --filter api vocab:import`
  (`--apply`). Prints the target db+collection before running; `--source/--db/--collection`
  flags.
- Tests: `test/vocab-import.test.ts` (11 pure tests; real-file counts pinned against the
  independent A10 audit numbers) and `test/vocab-import-apply.e2e.test.ts` (7 e2e tests on
  a sandbox collection `flashcards_a11_test` in dev Atlas — dry-run writes nothing, apply
  idempotent, stable `_id`, level-change stays one row, review-state guard, partial-failure
  rerun; cleanup is deleteMany, never a collection drop).

**Environment findings worth repeating**:
1. Existing API e2e tests import from **`../dist/src/...`** (compiled by `nest build`),
   not live TS — tsx does not emit decorator metadata, so importing
   `flashcard.schema.ts` as live TS dies with `CannotDetermineTypeError`. My tests follow
   the dist convention; `reflect-metadata` import order does not fix it.
2. Fresh worktree hit **BUILD-002** exactly as documented: `@prisma/engines/dist/index.js`
   missing → `prisma generate` fails → `nest build` fails with misleading TS2339 errors
   (`Property 'user' does not exist on type 'PrismaService'`). Workaround (copy engines
   dist from the healthy main checkout) applied and worked. Root cause still open in
   KNOWN_ISSUES.
3. Two transient Atlas `monitor timed out` blips appeared across ~1.1k sequential ops (one
   per dry-run run, different records) — the retry added to the apply loop heals them;
   without it the error was still reported honestly with exit 1.

**Verification**:
- `node --import tsx --test test/vocab-import.test.ts` — **11/11**.
- `node --import tsx --test test/vocab-import-apply.e2e.test.ts` — **7/7** (real Atlas).
- CLI dry-run on the real dev collection (`hsk_dev.flashcards`): **errors 0, exit 0,
  would create 1,118 + would update 1** — the 1 is a leftover e2e fixture card in dev
  (reported as 1 pre-existing same-hanzi duplicate); updating it is correct upsert
  semantics, not data loss.
- `nest build` exit 0 · `tsc --noEmit` exit 0 · `node scripts/check-docs.mjs` 8/8.
- Full API suite **NOT RUN** — Docker is down (no Postgres); only the two new test files
  ran standalone.

**DB/Auth/RBAC/money**: nothing changed. No schema, no index, no API route touched;
`user_flashcard_states` never accessed by the importer.

**Not done on purpose → done on owner command**: the real `--apply` into `hsk_dev.flashcards`
was originally left to the owner; the owner then said "làm luôn" in the same session, so it
ran. Results:
- Run 1: **created 1,118 + updated 1, errors 0, exit 0**.
- Run 2 (idempotency proof): **created 0 + updated 1,119, errors 0, exit 0**.
- Direct DB verification after apply (throwaway script, deleted after): 1,120 total docs =
  1,119 `hanlo` + 1 pre-existing seed fixture `学习` (HSK3, tags `verb,hsk3-core`) from the
  old SRS e2e seed. Per-level 922/50/**41**/32/25/16/12/11/11 — the 41 at level 3 includes
  that fixture; extraction itself is 40. `学习` now exists as two rows (HSK1 hanlo, HSK3
  fixture) and the importer reported exactly "1 pre-existing same-hanzi duplicate" —
  reported-not-merged is the designed behavior; deciding whether to clean the fixture is
  the owner's data decision, not the importer's.
- `user_flashcard_states`: 0 docs in dev, so no review state existed to lose — the guard
  held trivially.

**Deploy note**: `prisma/seed.ts` may still insert flashcard fixtures — check before
importing into any other environment, and import to production only via the explicit
`vocab:import` in the deploy pipeline.

**Next**: push `docs/a10-vocab-audit` then `feat/a11-vocab-importer` (stacked); owner runs
`vocab:import`; after that `/student/flashcards` should serve the real 1,119-card catalog
(verify in browser once Docker/API is back).
