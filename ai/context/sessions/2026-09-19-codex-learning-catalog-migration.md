## [2026-09-19] — Learning Catalog Slice 1A migration — codex — branch `codex/learning-catalog-migration`

**Done**:
- Verified Slice 0 PR #95 is merged on `main` and all three CI lanes passed.
- Claimed the isolated migration lane without touching the dirty main checkout.
- Recorded owner sign-off for `LEARNING_PATH_*` and resolved the documented §16 defaults in a separate commit.
- Reconciled ownership as 404 only for missing paths and 403 for paths owned by another teacher.
- Added Postgres `LearningPath`/`LearningPathStatus`, four notification enum values and one additive migration.
- Extended Mongo `learning_units` for teacher authoring, references, path indexes and immutable-history marker `firstPublishedAt`.
- Added all four notification types to the API registry and their FE Vietnamese sentence/deep-link mapping.
- Verified Prisma schema and migration by isolated shadow DB diff: `No difference detected`; the temporary DB was removed.
- Final verification: API 365/365, web scripts 238/238, API build pass, web build pass, check-docs 9/9.

**In progress** (and why it's unfinished):
- None for Slice 1A. Slice 1B cannot start until this migration PR is merged.

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
- Open and merge the migration PR first.
- Start Slice 1B from updated `main`: implement the 13 teacher + 8 admin endpoints, producers, signed error codes and one test line per invariant.
