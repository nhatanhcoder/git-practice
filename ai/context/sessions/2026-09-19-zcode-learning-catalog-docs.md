## [2026-09-19] — Teacher-authored learning catalog: ADR, specs, contracts (Slice 0, docs only) — zcode — branch `docs/learning-catalog-adr`

**Context**: owner asked for "learning path do teacher tạo → admin duyệt → rồi thêm bài học". That
request *is* the `⛔ contract needed` cell `RBAC_MATRIX.md` had been carrying for
`LearningCatalog | author / publish`, and the question `ADR-016` §2 explicitly left open ("cách giáo
viên author/publish catalog … chưa được duyệt"). Owner answered three product questions on
2026-09-19 (recorded verbatim in ADR-017 §Context): scope is the **platform catalog**, the path is
approved **once** and lessons are then published by the teacher, and content is **teacher-authored or
a reference** to an already published unit. Plan approved before any write; this slice is docs only
— **no `apps/**` file was touched**.

Worked in a dedicated worktree `D:/PersonalProject/Real-lc-docs` because the main checkout is
occupied by another agent's live lane (`codex/student-practice-live`, 18 modified files). Branch is
based on `origin/main@d4b4d2e`; `origin/main` has since moved to `1c24348`.

**Done**:
- **ADR-017** `docs/shared/decisions/017-teacher-authored-learning-catalog.md` — supersedes the last
  sentence of `RBAC_MATRIX.md`'s 2026-09-15 note (the CLI is no longer the only publisher). Records
  the storage split (metadata/audit in Postgres `LearningPath`, content in Mongo `learning_units`),
  the two state machines, published-content immutability, and 5 rejected alternatives.
- **Specs**: `docs/api/modules/teacher/07-learning-catalog.md` (13 endpoints, INV-LCAT-01..14) and
  `docs/api/modules/09-learning-catalog-moderation.md` (8 endpoints, INV-LMOD-01..12), both
  `proposed`, both with a full §15 test matrix and §16 unresolved table.
- **Registry**: family `LEARNING_PATH_*` (11 codes) added to `API_ERROR_CODES.md`, backticked so
  `check-docs` resolves them, marked **proposed, not agreed**.
- **RBAC / permissions / features**: the two `⛔ contract needed` rows replaced with real permissions
  (author/publish for teacher, review + unpublish-any for admin); new `T-LCAT-1..8` and
  `A-LCAT-1..5` sections; `PERMISSIONS_TEACHER.md` / `PERMISSIONS_ADMIN.md` sections added.
- **Student contract stays additive**: `05-learning-path.md` gains a §17 addendum and one new
  endpoint (`GET /api/v1/student/learning-path/curricula`); its 12 invariants and every response
  shape are unchanged.
- **Screens**: 5 Page Contracts (3 teacher, 2 admin) + 5 layer specs (new `specs/teacher-pages/`
  directory — the teacher area had none) + v3 branches in both flow maps with the two new state
  machines.

**In progress** (and why it's unfinished):
- Slices 1–4 (BE, FE Teacher, FE Admin, FE Student) — not started. Slice 1 is **blocked on the error
  code sign-off**, not on engineering.

**Contract/temporary decisions to preserve**:
- **A published unit's `words` are immutable.** Learner progress is keyed by `unitSlug` and stores
  the answers a learner gave, so an edit behind it is unverifiable; correction is a new unit plus an
  unpublish. This is the costliest constraint for a teacher and the owner accepted it with the plan.
- **`submit` requires ≥ 1 lesson** (INV-LCAT-04), which is stronger than the approved plan. Added
  deliberately: without it an admin can approve an empty shell and the one-time gate reviews nothing.
  Recorded in the spec's §16 as a decision taken, not silently.
- Admin may **unpublish any published unit on any path** — this is the compensating control for
  approving a path only once (ADR-017 §2). Without it the approval gate is theatre.
- Teacher ownership is a service-layer predicate; a missing owner argument **denies** (`API-009`).
- `reorder` is a full `1..N` permutation validated before any write (`API-008` trap).
- Both new contracts stay `status: contracted`, not `designed` — no mockup exists yet.
- No teacher spec existed before this slice; see `DEBT-008`.

**Needs from the other lane**:
- ⛔ **Owner sign-off on the `LEARNING_PATH_*` family (11 codes).** Until then Slice 1 may not use
  them in running code — the registry rule is explicit that *proposed* codes are not usable.
- Sign-off on INV-LMOD-05 (`approve` requires ≥ 1 unit) and the §16 defaults, which Slice 1 will
  implement as written unless told otherwise.

**Blocker / needs follow-up**:
- Error-code sign-off (above) is the only blocker on Slice 1.
- `DOC-018` filed: `pages/_INDEX.md` still claims the Teacher backend has no module spec.
- `DEBT-008` filed: no Teacher page ever went through page-designer.
- **Not filed, deliberately**: an earlier observation in the main checkout that
  `apps/api/src/writing/` was orphaned/untracked became false while this session ran — the other live
  lane wired `WritingModule` into `app.module.ts` and added a `dto/` directory. Re-verified before
  filing rather than recording a stale finding.
- `apps/web/.next-bak-1789409806/` and `student_test_results.xlsx` (untracked, 14/09) are still in
  the main checkout; not mine, not touched.

**Next steps**:
1. Owner signs off the `LEARNING_PATH_*` family → unblocks Slice 1.
2. Slice 1 (BE, FULL LANE — permission boundary): `LearningPath` model + enum migration, 4 new
   `NotificationType` values, Mongo `learning_units` extension (`pathId`, `authorId`, widened
   `curriculum` enum, derived `sourceHash`), 21 endpoints, notification producers.
3. Slices 2–4: FE Teacher (3 screens), FE Admin (2 screens), FE Student (additive).
