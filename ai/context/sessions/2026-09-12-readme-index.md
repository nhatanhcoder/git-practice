## [2026-09-12] — Refresh `docs/README.md` to the current repo structure — codex — branch `readme-index-2026-09-12`

**Context**: the user asked to re-read the whole repo and update the README. Two findings came
before any edit:

1. **There is no root `README.md`** — not in the working tree, not on `origin/main`, and
   `git log --all --diff-filter=A -- "README*"` returns nothing. It has never existed. The
   only README in the repo is `docs/README.md`, which is a **documentation index**, last
   updated 2026-09-03.
2. That index was **9 days stale** and, more importantly, **omitted whole directories** that
   were added since — most notably `docs/api/modules/` (the specs the backend was coded from).

**Task type**: DOCS. No DB schema, Auth, RBAC or money touched → no owner approval gate.

**Done** (`docs/README.md`, rewritten):
- **Added `api/modules/`** — the largest omission. 8 Admin specs + `_INDEX`/`_TEMPLATE`, 6
  Teacher specs, and the Student group, grouped by lane with a warning that status is
  per-module and `proposed ≠ agreed`.
- **Added `content/`** — `VOCAB_SOURCE_AUDIT.md` + `_INDEX.md` (task A10), cross-linked to
  `DOC-011` (corpus still outside the repo).
- **Added `testing/`** files that were missing: `CI.md`, `TEST_PLAN_ADMIN_API.md`,
  `TEACHER_TEST_PLAN_AND_REVIEW.md`, `_INDEX.md` (only 2 of 6 were listed).
- **Added a "Root-level docs" section** — `BACKEND_PLAN.md` and `init-promt.md` were
  unmentioned.
- **Added a "Start here" table** pointing at `AGENTS.md`, `ai/PROGRESS.md`,
  `KNOWN_ISSUES.md`, `PROJECT_KNOWLEDGE.md` §9 (conflicts register) and `ai/context/sessions/`.
- **Expanded ADRs from 1 link to a full table** (001–016) — and recorded that **ADR-009 does
  not exist**; the numbering jumps 008 → 010, and `ai/PROGRESS.md` lists "ADR-009 risk-based
  testing" as not started.
- **Corrected the stale line "Student screens are not yet mapped through this pipeline."**
  `pages/student-pages/` now holds 6 files: `/student/flashcards`, `/student/classes`,
  `/student/classes/[classId]` are `built`; `/student/foundation` and `/student/grammar` are
  `contracted (proposed)` and ⛔ blocked on source/schema/API/media approval.
- **Flagged the duplicated agent rules.** The Vietnamese quick-reference at the bottom was a
  third copy of `docs/init-promt.md` (which itself is the short form of
  `ai/rules/working-rules.md`). Kept it for reachability but marked `init-promt.md` as the
  single source, so the two do not drift.
- Added settled conventions inline where they prevent repeat mistakes: flat error envelope,
  role-prefixed routes (`API-006`), entity specs outrank feature docs, entity specs
  authoritative over the glance lists, `SCOPE-03` (`(Read Only)` labels the document, not the
  role), `DOC-012` (sprint numbers come from `SPRINT_PLAN.md`).
- Bumped "Last updated" to 2026-09-12 and added "HSK levels: 1–9".

**Not done (deliberate)**: `docs/api/modules/student/02-word-bank.md` is **not linked**,
because it has never been committed — `git log --all --diff-filter=A` returns nothing for it.
It exists only as uncommitted work on `feat/student-word-bank` (PROGRESS: zcode, 2026-09-12,
slice 2). Linking it from a README built on `origin/main` would have been the first broken
link in the file. Noted inline instead.

**Verification**:
- Every relative link in the file checked against disk: **0 broken**. (Caught the
  `02-word-bank.md` link this way before committing.)
- `node scripts/check-docs.mjs` → **all 9 checks passed**.

**Next steps**:
- Decide whether the repo should get a **root `README.md`** — it still has none. A short one
  pointing at `AGENTS.md`, `docs/README.md` and the two apps would help a newcomer; it is a
  separate, larger judgment call than this refresh.
- Re-check the index whenever a new `docs/` subdirectory appears.
