---
status: completed-with-limitations
date: 2026-09-29
agent: codex
branch: codex/admin-learning-paths-moderation
---

# Admin Learning Catalog moderation UI

## Scope and startup

Previous unfinished work: Admin branch contained a queue claim but no implementation.
User approved Admin moderation and requested automatic PR creation. Task: CODE.
No database schema, Auth, RBAC or money behavior changed. Existing Admin guards and
moderation API are reused. Primary checkout is dirty and was left untouched; worktree:
`D:/PersonalProject/Real-admin-moderation`. Synced origin/main at eedc49a before implementation.

## Delivered

- `/admin/learning-paths`: FIFO review queue, status filters, exact All-page aggregation,
  URL pagination, approve, validated reject, published-unit removal and error states.
- `/admin/learning-paths/[pathId]`: metadata, authored vocabulary, audit, approve/reject,
  suspend/restore and unit removal. Conflict responses reload state without replaying writes.
- Shared Admin shell/dialog, dashboard navigation entry and real API service; no new dependency.
- Registered both routes with the screen sweep; missing pending fixture returns an explicit skip.
- Page Contracts/index marked built; spec document statuses retained independently.

## Verification

- `pnpm --filter web build`: PASS (production, 44 pages).
- `node --test apps/web/scripts/*.test.mjs`: PASS, 242 tests / 49 suites.
- `pnpm lint`: PASS before final records (0 errors).
- Production Playwright `tests/admin-learning-catalog.spec.ts`: PASS, 16/16, desktop
  1280x800 and mobile 375x812. API-boundary fixtures, NOT live API/database verification.
- Cases: approval request/body and queue refresh; reject length and retained error input;
  409 no replay; authored preview and reference unavailable state; suspend/restore/remove;
  All pagination; published-unit retained removal state; Escape/focus restoration; 403/500.
- Initial run exposed an ambiguous rejection accessible name; corrected with labelledby.
  Error test selector also needed scoping to main to exclude Next's route announcer.
- Screenshot review: queue/detail desktop/mobile; no horizontal overflow. Existing design
  tokens only, no baseline promotion. Keyboard cancel restores focus. Full screen-reader
  audit and real FE-to-API-to-DB lifecycle: NOT VERIFIED.
- `node scripts/check-docs.mjs`: PASS, 9/9 before commit; `git diff --check`: PASS.

## Limitations and follow-up

DOC-023 records contract/runtime mismatches: flat list data versus nested items, missing
published-unit owner/path metadata, and reference content preview **NOT IMPLEMENTED**.
Approval only permits Teacher publication; it does not publish every unit automatically.
All-tab deep pagination requires multiple reads and is not a transactional snapshot.
No Postgres on local 5432 or API on 3001 during this session; do not mistake fixture
browser tests for live lifecycle evidence. Previous backend E2E is not claimed as rerun.

Used existing build-screen/UI skills and baseline v1; installed ui-ux-pro-max was read
from the primary checkout because this worktree lacks its copy. No installation.
Two approved screens are delivered together as one coherent moderation feature PR;
this departs from the skill's per-screen commit-cycle preference and is disclosed here.
No merge/deploy, no edits to Teacher lane, no mutation of existing accounts/content.
