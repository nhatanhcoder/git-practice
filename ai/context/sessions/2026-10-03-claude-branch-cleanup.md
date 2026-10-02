---
title: Claude — branch and worktree cleanup, losslessly
status: complete
date: 2026-10-03
branch: docs/branch-cleanup-record
scope: GIT-005
schema_change: false
auth_rbac_money_change: false
---

# Outcome

Local branches 23 → 3 (`main`, `student/ui-polish-recovery`, `wip/antigravity-ui-polish-0918`);
worktrees 11 → 1. No commit was discarded.

## Method

1. Merged PRs #110, #111, #107, #109 (CI green each; #111/#107/#109 needed `origin/main` merged in
   because the squash of the previous PR conflicted in the append-only record files; both sides kept).
2. A branch was deleted outright only when its tip equalled the head of its MERGED PR.
3. Every other unmerged local branch got a local tag `archive/<name>` (verified to point at the same
   commit) before the branch was deleted. Dirty worktrees were committed to WIP branches first.
4. Worktrees were removed with plain `git worktree remove` (no `--force`) except `teacher-imgopt`,
   whose 593 dirty entries were all deletions of tracked files.
5. Remote branches were deleted only for the five merged PRs whose tip equalled the PR head.

## Not done

- Docker Desktop crashed again (`BUILD-006`), so `WEB-027`'s Playwright verification did not run; its
  changes are stashed on the primary checkout, not committed.
- Remote branches with commits beyond a merged PR, and closed/PR-less remote branches, were left.
- `archive/*` tags are local only; push them (`git push origin --tags`) if an off-machine copy is wanted.
