# 2026-09-01 — Refresh docs/README.md index — Claude Code

**Context**: user asked to "update readme". Resolved to `docs/README.md` (the documentation
index / navigation map) — the canonical "readme" for this docs-heavy repo; the other README.md
files are per-app scaffolding (`apps/api`, `apps/web`) or vendored skill docs.

**Done** (branch `docs/readme-refresh` off `origin/main`):
- `Last updated: 2026-07` → `2026-09-01`.
- Navigation Map: added the two `docs/` subdirs that existed but were absent from the map —
  `front-end-design-docs/` and `prompts/`.
- New section **🎨 front-end-design-docs/** — the FE design pipeline (flow-mapper → page-designer),
  linking `pages/_INDEX.md`, `root-design-fe.md`, `specs/_DESIGN-SYSTEM.md`, and pointing at the
  admin-pages (built) + teacher-pages (S2–S6, built) contract folders. This whole doc set was
  missing from the index.
- New section **🧩 prompts/** — points at `prompts/student-product/` (the prompt set behind the
  `/student/**` mockups).
- Entities view fixed to match `entities/_INDEX.md`: `ENTITY_LESSON` + `ENTITY_LESSON_ASSIGNMENT`
  moved into the PostgreSQL list; removed the stale `ENTITY_LESSON ⚠️` from the MongoDB list and
  added a note that Lesson moved PG (ADR-003 superseded). Added a pointer that `_INDEX.md` is the
  authoritative entity list, since the README's inline lists drift.
- Cleaned up the agent-workflow block at the bottom (added in PR #13): gave it a proper header
  (**🤖 Agent quick-reference**), and removed the dangling empty `VIỆC:` prompt-template label
  that had been committed as a broken artifact.

**Notes / state observed (not acted on)**:
- Landed the branch from `origin/main` at `cd3ce77` (PR #18 — opencode's Teacher S2–S6 build —
  is merged). While here, noticed my own Teacher S2 contract files now read `status: built` on
  disk: that's correct, opencode built them; not a discrepancy to fix.
- Did **not** touch PROGRESS.md or KNOWN_ISSUES.md — this is a pure index refresh, no sprint item
  and no new bug. The staleness it fixed was not a tracked issue.

**Next steps**:
- Review/merge the README PR.
