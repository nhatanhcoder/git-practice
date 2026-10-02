---
title: Claude — worktree visibility tool and rescue of the primary checkout
status: complete
date: 2026-10-01
branch: docs/wt-status-script
scope: tooling (scripts/wt-status.mjs), GIT-005, WEB-027
schema_change: false
auth_rbac_money_change: false
---

# Outcome

Review of the whole project found `main` healthy (lint, `check-docs`, `tsc` for web and api all
pass) but the primary checkout dirty and a worktree sprawl. This session fixed only the
reversible, additive parts; everything destructive or policy-changing was left for the owner.

## Done

- Primary checkout: its 44 uncommitted files (2026-09-18, Antigravity's UI polish) were committed
  **verbatim** to local branch `wip/antigravity-ui-polish-0918` (`fe37832`, never pushed), then
  the checkout was moved to `main` and fast-forwarded to `origin/main@eedc49a`. Nothing deleted.
- `scripts/wt-status.mjs` + `pnpm wt:status`: zero dependencies, read-only.
- `GIT-005` (worktree sprawl) and `WEB-027` (flashcards page replaced by local mock) recorded.

## Verification

- `pnpm wt:status` against the 11 real worktrees: 9 flagged, `#103/#104/#106` shown as MERGED
  (first cut missed them because squash merges never make the branch an ancestor — fixed).
- `pnpm wt:status --offline --strict` exits 1 when flagged. `pnpm lint` clean, `check-docs` 9/9.
- Not a UI change, so no Playwright run applies.

## Added 2026-10-02

- `.github/pull_request_template.md`: the PR body is the task card (brief, `Status:`, `Log:`,
  lock checklist, record and cleanup checklists).
- `check-docs` check 10 `issue-id-reused`: duplicate `KNOWN_ISSUES` ids fail. Three ids were already
  duplicated (`API-010`, `DEBT-006`, `DOC-014`); renumbering is forbidden, so they are grandfathered
  at exactly two uses. Verified by injecting a duplicate `GIT-005` (red) and removing it (green).
  Counts in `docs-check.yml` and `working-rules.md` updated to 10.

## Not done (needs the owner)

- Rewrite `ai/rules/multi-agent-workflow.md` to the one-task/one-branch/one-PR process.
- Deleting or discarding any worktree: `Real-teacher-imgopt` (593 dirty), `Real-grammar-live`,
  `Real-lc-docs`, merged `p5fix/p6fix/p7`, `api020-integrate`, `pr99-fix`.
- Deciding the fate of `wip/antigravity-ui-polish-0918`.
