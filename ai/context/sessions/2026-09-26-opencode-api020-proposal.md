# 2026-09-26 — API-020 contract proposal (SupplementalPractice) — opencode

Owner-authorized option 1: draft the supplemental-practice module spec as a proposal for
owner acceptance. No code, no migration, no live endpoint from this slice. Worktree
`../Real-api020`, branch `docs/api-020-supplements` from `origin/main@144ea3c`.
Lane note: `docs/**` is claude's lane — docs-only proposal on explicit owner authorization.

## Gate verification before starting (P4–P7 all blocked, verified 2026-09-26)
- `API-020` string: 0 hits repo-wide (registry stops at API-018) → no accepted contract.
- No explicit DB/RBAC approval for a supplemental table; `PROGRESS.md:381` ⛔ still defers
  table/endpoint choice for supplemental practice.
- PR #98 still OPEN (`codex/class-content-schedule-v1`) → P6's must-preserve fixes unmerged.
- No agent had claimed P4–P7; no one is writing API-020. `writing-plans` deliberately
  deferred: planning implementation against a non-existent contract would be fabrication.

## Written (proposal, all `proposed`)
- `docs/api/modules/teacher/08-supplements.md` (T8 — T7 taken by learning catalog on main):
  16-section template, 8 endpoint rows (5 new + 3 additive extensions), INV-SUP-01..12
  covering the P5/P7 checklists 1:1 (ownership via `lesson.class.teacherId`, active-enrollment
  gates, duplicate rule, dense-`1..N` transactional reorder, link-only remove, unavailable
  markers without leak, server-side assigned filter, no official outcomes).
  Table `SupplementalPractice` proposed (name from `RBAC_MATRIX.md` domain row):
  id, lessonId→Lesson CASCADE, sourceType enum, sourceKey, orderIndex, createdAt;
  UNIQUE(lessonId, sourceType, sourceKey); UNIQUE(lessonId, orderIndex); no updatedAt
  (`LessonAssignment` precedent); no spare fields.
- `API_ERROR_CODES.md`: `SUPPLEMENT_*` 4-code family in *proposed, not agreed*
  (ALREADY_ATTACHED 409, NOT_ATTACHED 404, ORDER_CONFLICT 409, SOURCE_NOT_FOUND 404).
- `teacher/_INDEX.md`: T8 row + counts (8 modules, 57 endpoints) + dependency bullet.
- Reused agreed codes only: `LESSON_NOT_FOUND`, `LESSON_ACCESS_DENIED`,
  `CLASS_ACCESS_DENIED` (student-lesson-detail precedent), `VALIDATION_ERROR`,
  `GRAMMAR_NOT_FOUND` (referenced, not redefined).

## Owner decisions needed (§16, 7 rows)
Accept as API-020 (+confirm ID/placement) · sign 4 codes · confirm table name + CASCADE +
no-updatedAt · RBAC/API-catalog follow-up edits (separate approval) · Page Contract/spec
updates for P6/P7 (follow-up slices) · assignedOnly empty-set edge · attach-time
unpublished rejection vs allow-plus-marker.

## Verify
- `pnpm check:docs` → all 9 checks passed (new backticked codes resolve via the proposed
  section; all relative links resolve; no envelope drift).
- No code touched: `git status` shows only the 4 docs files + this session file.
