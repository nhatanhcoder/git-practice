## [2026-09-19] — Learning Catalog Slice 1A migration — codex — branch `codex/learning-catalog-migration`

**Done**:
- Verified Slice 0 PR #95 is merged on `main` and all three CI lanes passed.
- Claimed the isolated migration lane without touching the dirty main checkout.
- Recorded owner sign-off for `LEARNING_PATH_*` and resolved the documented §16 defaults in a separate commit.
- Reconciled ownership as 404 only for missing paths and 403 for paths owned by another teacher.

**In progress** (and why it's unfinished):
- Postgres/Mongo migration implementation and verification after owner approval of `firstPublishedAt`.

**Contract/temporary decisions to preserve**:
- Submit and approve each require at least one unit; maximum 100 units per path.
- A teacher cannot hard-delete an approved path; admin suspends it.
- References cannot target a unit whose source path is suspended.
- Suspend v1 has no reason; moderation v1 keeps only the latest audit.

**Needs from the other lane**:
- None.

**Blocker / needs follow-up**:
- None for Slice 1A.

**Next steps**:
- After approval, amend the module contract in its own commit, add the Prisma/Mongo schema migration, run the full migration verification lane, record, and open the migration PR.
