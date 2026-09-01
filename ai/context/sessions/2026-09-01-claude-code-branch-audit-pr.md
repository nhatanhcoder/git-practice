# 2026-09-01 — Branch audit, commit, PR — Claude Code

**Context**: user first pointed me at the wrong local checkout
(`C:\Users\nhata\OneDrive\Máy tính\Real`, an empty/uninitialized `.git`, docs-only
mirror with no `apps/`). Redirected to the real repo at `D:\PersonalProject\Real`.

**Done**:
- Audited all 12 local branches against `main` (ahead/behind/merged). 9 are fully
  merged into `main` (safe to delete later, not touched this session). `docs/adr-011-015`
  is identical to `main` (0/0). `main` is in sync with `origin/main` (0/0).
- Found `chore/fast-verify-rule` has **2 commits not merged into `main`**: `eb35bda`
  (docs progress claim) and `c6d9e5f` (`feat(web): /admin/dashboard screen — mocked,
  baseline v1`). Not touched — flagging for owner decision (finish/merge or discard).
- On `docs/merge-2026-08-31-claude-ai` (branch was at same commit as `main`, only
  uncommitted working-tree changes): ran `node scripts/check-docs.mjs` (8/8 passed)
  and `pnpm --filter web build` (compiled, all routes incl. new `/student/*` OK)
  before committing.
- Split the working tree into two commits and pushed:
  - `b33e3ac` — docs merge (2026-08-31 claude.ai review reconciliation, already
    staged by the prior Cowork session) + tracked `turbo.json` (was untracked,
    KNOWN_ISSUES `BUILD-001`) + `docs/README.md` workflow-rules addition.
  - `af9fc9e` — Student product mockup: 10 pages under `apps/web/src/app/student/`,
    `sp.*` Tailwind tokens, `hsk-learning-ia` project skill, `docs/prompts/student-product/`.
- Opened [PR #13](https://github.com/nhatanhcoder/git-practice/pull/13) `docs/merge-2026-08-31-claude-ai` → `main`.

**Excluded from commit (left untouched, not committed)**:
- `_backup/` and `_to_delete/` — per `finish-pull.ps1`'s own comments these are
  scratch output from the 2026-08-25 cleanup session (`_to_delete/` literally holds
  duplicate files meant for deletion). Not repo content.
- `finish-pull.ps1` — one-time script from that same cleanup; its own header says
  the `.git` lock removal it existed for is already done.

**Update (later same session)**:
- User confirmed cleanup: deleted `_backup/`, `_to_delete/`, `finish-pull.ps1` (were
  untracked, never committed).
- Checked why `PROJECT_KNOWLEDGE.md`/`COWORK_BOOTSTRAP.md` sit at repo root instead of
  under `ai/`/`docs/`: intentional — they're root-level entry-point docs like
  `AGENTS.md`/`CLAUDE.md`, and `project-brain.md` links to them directly. Not a mistake.
- While checking, found `BUILD-001` was actually already fixed (turbo.json tracked in
  `b33e3ac`) but `KNOWN_ISSUES.md`/`project-brain.md`/`COWORK_BOOTSTRAP.md` still said
  open/untracked — closed it in commit `0d58b34`, pushed to PR #13.
- Read `chore/fast-verify-rule`'s 2 commits: its `/admin/dashboard` mockup (A-DASH-1,2,4)
  is a duplicate of the same feature already merged via PR #8 (`feat/admin-antigravity-2026-08-16`,
  same feature IDs, same day) at a different route path. Superseded, not useful to merge.
  User confirmed — deleted the branch (`git branch -D`, local only, never pushed).
- User merged **PR #13** on GitHub. Its merge commit (`222f00d`) landed *before* commit
  `0d58b34` reached it, so `main` came out of the merge with `turbo.json` tracked (bug
  actually fixed) but the three docs saying it wasn't (stale again). Verified `main` post-merge:
  `check-docs.mjs` 8/8, `pnpm --filter web build` green.
- Cherry-picked `0d58b34` onto a fresh branch `docs/close-build-001`, reworded it to point
  at the real merge commit, opened [PR #14](https://github.com/nhatanhcoder/git-practice/pull/14).
  Deleted the now-merged `docs/merge-2026-08-31-claude-ai` branch locally.

**Blocker / needs follow-up**:
- [PR #14](https://github.com/nhatanhcoder/git-practice/pull/14) still needs review/merge.

**Next steps**:
- Review/merge [PR #14](https://github.com/nhatanhcoder/git-practice/pull/14).
