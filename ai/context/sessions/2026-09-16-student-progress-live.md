---
status: complete
task: student-progress-live
branch: codex/student-progress-live
last_updated: 2026-09-16
---

# Student progress live

## Outcome

Implemented `GET /student/progress` and `/student/progress/chart` over the caller's graded attempts and replaced the production-unavailable mock page with live totals, skill heatmap/breakdown, and score chart/table. Removed every fabricated XP, streak, badge, rank and HSK-ladder figure from this route.

## Verification

- API type-check and build: pass
- Web type-check and production build: pass
- Workspace lint: pass
- Progress rules: 3/3 pass
- Progress API e2e: 4/4 pass (ownership, RBAC, empty/null, UTC Monday, deleted questions, no content leak)
- `node scripts/check-docs.mjs`: pass (9 checks)

## Next lane

Implement leaderboard in a fresh branch from updated main after this PR merges. Its approved scope is an anonymized top-20 aggregate plus caller rank, minimum three official graded attempts, with no ids, names, email, content, streak or retention data.
