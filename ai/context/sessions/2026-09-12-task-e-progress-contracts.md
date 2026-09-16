## [2026-09-12] — Task E design slice: progress/board/badges contracts (proposed) + analytics module — opencode — branch `feat/student-progress-contracts`

**Context**: gamification + analytics has no entities, no codes, no BE, no module spec —
and FEATURES locks XP curve / streak rule / badge unlocks / board privacy behind owner
approval. Owner-approved scope: design slice only (contracts proposed + specs proposed +
decisions list), code after PR #73 + gate decisions. No schema/Auth/RBAC change; nothing
invented (no endpoint/field/code).

**Done**:
1. **Module `04-progress-analytics.md`** (16 sections, proposed, 7 invariants): read-only
   aggregation over own graded attempts (heatmap trailing-8w, chart trailing-12w, UTC Monday
   buckets); `null` ≠ 0; no `correctAnswer`/peer content; streak field ABSENT (not null);
   no new codes; needs PR #73 (AttemptAnswer table). §16 holds the 7 open decisions.
2. **`student/_INDEX.md` row 4** + no-collision note (PR #73 owns filename `03`).
3. **Conflict with PR #74 (merged mid-slice) — resolved link-only per owner approval
   and Conflict Rules, no silent pick**: #74 had just landed mock-fidelity contracts for
   the same 3 routes. Those files stay authoritative; this slice only links the progress
   contract's recorded need to the new module (Data-table shape cells + one update
   paragraph — 6 lines) and points the `_INDEX` progress row + flow blocker cells at it.
   Board/badge contracts untouched. My full-replacement drafts were written, then reverted
   uncommitted — they survive nowhere, by design.

**Verification**: `node scripts/check-docs.mjs` 9/9; contract line counts 45–46 (<60 per
flow-mapper). No code → no build/test matrix; e2e isolation deferred to the code slice
(spec §15 test matrix written and waiting).

**Blocker / needs follow-up**:
- PR #73 merge (AttemptAnswer) before any analytics code.
- 7 owner decisions in module §16 (XP curve, streak rule, badge unlocks, board privacy,
  skill widening, T-ANL split, PR #73).
- Leaderboard/badge FE stays prod-gated mock until contracts + code land.

**Next steps**: review/merge this branch; code slice after gates.
