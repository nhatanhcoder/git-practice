# 2026-09-26 — P6 teacher lesson supplements UI — opencode

Branch `feat/api020-teacher-supplements` (base P5 head + merge of #98 head
`3dd35e0`), worktree `../Real-p6`. FE lane on explicit owner directive. Docs merge
conflicts resolved (KNOWN_ISSUES append-order + index date, both sides kept).

## Built (extends live lessons page, #98 fixes preserved)
- `lib/teacher/teacher-supplements-service.ts`: fetch supplements via lesson detail
  embed, picker reads (units with level/search, grammar with level/category/search),
  attach/remove/reorder; throws on failure, no mock fallback.
- `lessons/page.tsx`: per-lesson "Bổ trợ" menu item → expandable section (loading /
  error+retry / empty / ordered rows with kind chips, unavailable badge, drag +
  up/down + remove); picker `Overlay` (tabs, filters, per-row attach, attached rows
  locked disabled, errors inline); remove `ConfirmModal`. All mutations share the
  existing `mutationPending` — `Overlay.closeDisabled` + `ConfirmModal.pending` locks
  carry over untouched, as do optimistic reorder rollbacks.
- `lessons.module.css`: section/row/chip/picker styles, token vars only; drag handles
  hidden on mobile (existing rule), buttons carry reorder.
- Contract `teacher-lessons-list.md`: supplements region + 3 action rows (additive).

## Verify
- type-check ✅ · lint ✅ · web build 43/43 ✅ · check-docs 9/9 ✅
- Temp Playwright spec 16/16 (desktop + 375px, `--workers=1` serial — fixtures shared
  across projects): picker real data both tabs, distinct kinds, UI+API duplicate 409
  without fake success, keyboard + mouse-drag reorder with reload persistence,
  reorder-500 rollback, delete-500 keeps item + open modal then real delete works,
  attach-gate modal lock (Escape/backdrop blocked), screenshots read (section + picker,
  both viewports, no overflow). Spec deleted after run.
- Fixture debris: timestamped teacher/class/lessons + LESSON1 supplement links stay in
  dev DB (accepted debris pattern; links removable via UI).

## Open for owner
- Merge order: #102 (P4) → #103 (P5) → #98 → this P6 PR (stacked on P5; rebase onto
  main after the three land).
- P7 next: student supplement + assigned filter (FE, needs P5 endpoints live = same chain).
