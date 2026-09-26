# 2026-09-26 — P5 supplemental attachment API — opencode

Branch `feat/api020-supplemental-api` stacked on P4 head (`feat/api020-supplemental-migration`;
merge order #102 first), worktree `../Real-p5`. Backend lane on explicit owner directive
("finish everything" P4→P7 chain + accepted API-020).

## Implemented (strictly the accepted contract)
- `apps/api/src/supplements/` (service/controller/DTOs/module): teacher attach (server
  MAX+1 order, bounded retry on order-P2002, duplicate → 409), remove link-only (204),
  reorder dense-1..N single-tx with two-step shift (INV-TCL-08 mirror), read-time
  availability resolution batched by key set, ownership via `lesson.class.teacherId`.
- `SUPPLEMENT_*` ×4 wired in `error-codes.ts` (enum + HTTP map).
- Teacher lesson detail + student lesson detail embed `supplements[]`
  (`{id,sourceType,sourceKey,orderIndex,title|null,available}`); existing e2e assert
  fields only, no deepEqual breakage.
- Grammar `assignedOnly` (DTO + `listForStudent` + `assignedGrammarKeys` over active
  enrollments; filter before pagination) + teacher picker `GET /teacher/catalog/grammar`
  (public projection, no tokens).
- Units picker: reused accepted `GET /teacher/learning-units` + additive `search`
  (title/slug regex, AND-combined with the approved-path scope — fixed an overwrite bug
  while there). Contract §2/§3.4 amended accordingly in this branch (deviation recorded).
- `LearningCatalogService.findPublishedUnits` + `GrammarService.findPublishedGrammars`
  (published-only batch lookups); both services exported from their modules.
- No attempt/XP/SRS/progress writes anywhere in this slice (verified by INV-SUP-10).

## Verify
- type-check ✅ · build ✅ · lint (max-warnings 0; test-file `any`s registered per repo
  convention) ✅ · check-docs 9/9 ✅
- New `supplemental-practice.e2e.test.ts` 11/11 real-DB (§15 full matrix).
- Related suites teacher-lessons + student-lesson-detail + student-foundation-grammar +
  learning-catalog: 49/49.
- Debugging notes: grammar API identity is list-item `id` (= revision key); `data.key` is
  an unrelated source field (using it 404s). Teacher lesson detail legitimately embeds its
  own class row (pre-existing shape) — leak assertions apply to student payloads.
  Single-file tsx runs exit cleanly; earlier observed hangs were stray-tree contamination
  (verified: kill-all → clean run → exit 0).

## Open for owner
- Merge order: #102 (P4) → this P5 PR (stacked) → #98 rebase → P6 → P7.
- Follow-ups from §16-Q4 still pending (RBAC/API-catalog listing rows — separate approval).
