## [2026-09-08] — A12: dead-code cleanup after the A05–A09 integration — opencode — branch `chore/a12-dead-code`

**Context**: TASK A12 from `docs/prompts/student-integration-checklist.md` (deps: A02,
A05–A09 — all done; branch based on A09 `f656d71`). Rule: only remove what is proven
consumer-less; no redesign, no baseline/palette/business changes.

**Audit first (rule 1–2)** — full-tree `git grep` for every export of `content.ts` plus the
store fields A05 had flagged:

| Candidate | Consumers | Verdict |
|---|---|---|
| `vocabBox` (store state/type/seed) | none | **delete** |
| `rateVocab` (store action) | none (A05 moved the SRS off the local Leitner store) | **delete** |
| `vocabTopics` (content) | none — only its own definition line | **delete** |
| `vocabCards` | `learning-path/[nodeId]` lesson quiz | keep |
| `advanceBox` | `reviewMistake` in the same store | keep |
| `boxInterval` | dashboard + `mistakes/review` | keep |
| `mistakeSeed` | seeds `mistakes` state (store.ts:114) | keep — see audit trap below |

**Audit trap worth repeating**: my first export-scanner excluded `store.ts` from the
consumer search (it was the file under inspection for other candidates), which made
`mistakeSeed` look dead. A manual re-check found the consumer one line away. A grep audit
must search *everywhere*, including the file being audited.

**Done**:
- Removed `vocabBox` (state field, type entry, seed initializer) and `rateVocab` (interface
  + action) from `store.ts`; removed `vocabTopics` from `content.ts`.
- **Persist migration v1→v2** in the store: v1 localStorage entries still carry `vocabBox`;
  because `partialize` spreads `...rest` and zustand's default merge re-attaches unknown
  keys, the stale key would survive forever as junk state. v2's `migrate` deletes it before
  merge. (Deleting the field alone was NOT enough — this is the non-obvious half of the
  cleanup.)
- `apps/web/scripts/a12-cleanup.test.mjs` — 8 tests: 3 removal invariants, 2 migration
  invariants (version bumped, migration names the dropped key), 3 survival invariants for
  the neighbours above. TDD: 5 failed before the change, 8 pass after (the removal test had
  to allow the migration's one legitimate mention of `vocabBox` — pinned by slicing the
  persist options block out before grepping).

**Verification** (serial, single worktree — the A09 lesson about never running install and
build/test concurrently is still applied):
- `node --test apps/web/scripts/*.test.mjs` — **153/153** across 37 suites (145 existing +
  8 new; A05's `srs-routes.test.mjs` guard against `rateVocab|vocabBox` returning still
  passes unchanged).
- `pnpm --filter web build` — clean.
- `node scripts/check-docs.mjs` — 8/8.
- Diff scope: only `store.ts` (−11/+10) and `content.ts` (−2) — no Admin/Teacher, no
  baseline, no mock corpus, no routes, no business logic.

**Not done on purpose**: browser/screenshots pass (TEST A12 items 3–6: theme contrast,
landing/login/register navigation, 375px) — Docker/API unavailable in this environment for
a production run; the same items were last exercised green by A05/A09 and the diff touches
no rendered markup, only removed unused state and one localStorage migration. Flagged for
the next live pass.

**DB/Auth/RBAC/money**: none touched.
