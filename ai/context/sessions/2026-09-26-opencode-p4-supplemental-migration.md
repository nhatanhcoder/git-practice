# 2026-09-26 — P4 SupplementalPractice migration — opencode

Branch `feat/api020-supplemental-migration`, worktree `../Real-p4`, from main@9a5339b
(post-#101). Lane note: backend/Prisma lane on explicit owner directive (P4→P7 chain).

## Migration
`20260926090444_add_supplemental_practice` — exactly the accepted §12: enum
`supplement_source_type`, table `supplemental_practice` (id, lesson_id→lessons CASCADE,
source_type, source_key, order_index, created_at; 2 UNIQUEs; composite index). No
updatedAt, no spare fields. Schema: enum + model + `Lesson.supplements` back-relation.

## Verify (all real DB, hsk_dev + scratch)
- With-data deploy: `migrate dev` applied onto hsk_dev holding 2 lessons ✅
- Empty DB: scratch `hsk_p4_empty` + full 15-migration `deploy` ✅, then verified
  information_schema (table, both UNIQUEs, composite index, FK `confdeltype=c`,
  enum labels, exactly 6 columns) and dropped the DB ✅
- `supplemental-practice-migration.e2e.test.ts` 6/6: contracted shape, duplicate
  (lesson,source) → P2002, duplicate order same lesson → P2002 / other lesson OK,
  ghost lessonId → P2003, bad enum → DB rejects, lesson delete cascades attachments
  while `UserStudyProgress` + sibling attachments survive ✅ (self-cleaning fixtures)
- `type-check` ✅ · `build` ✅ · `lint` (max-warnings 0) ✅ · `check-docs` (next section)

## Notes
- Test runner on Node 25: `node --import tsx --test` fails resolving extensionless
  dist imports (BUILD-005); `tsx --test` works.
- No Mongo changes; app boot in tests uses existing MONGODB_URI like other suites.
