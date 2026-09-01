## [2026-09-01] — Verify + merge the 2026-08-31 claude.ai doc review — claude (Cowork) — branch `docs/merge-2026-08-31-claude-ai`

**Done**:
- Verified 11 docs produced by a 2026-08-31 Claude.ai session against the real repo. Five of them
  were regressions (shorter than the repo copy, written from July-era mirrors, colliding issue
  IDs). Merged by hand; overwrote nothing.
- Added `PROJECT_KNOWLEDGE.md` and `COWORK_BOOTSTRAP.md` (neither existed here).
- Appended 9 new issues to `KNOWN_ISSUES.md` under non-colliding IDs; updated `BUILD-001`,
  closed `GIT-002`.
- Re-verified `PROGRESS.md` Sprint 0 against the working tree; added Sprint 5b (blocked).
- Added § Conflict Rules to `working-rules.md`; refreshed `project-brain.md`; logged both
  sessions in `AI_CHAT_LOG.md`; wrote the `HANDOFF.md` entry.

**Contract/temporary decisions to preserve**:
- Conflict register IDs are `CR-##`, not `C##` — `C1`/`C2`/`C3` are already module blockers in
  `PROGRESS.md`. Product-model conflict is `SCOPE-02`; `SCOPE-01` is Classes/Enrollment scope.
- Sprint 5b is a placeholder and is absent from `SPRINT_PLAN.md`.

**Blocker / needs follow-up**:
- `DOC-011` — `backend/data/content/` and its 10 JSON files are not in this repository. Blocks
  `SCOPE-02`, `PROJECT_KNOWLEDGE.md` §8 and `DEBT-003`.
- `CR-3` storage, `API-005` auth env block, `DOC-012` sprint renumbering — all need the owner.

**Next steps**:
- `git commit` on Windows (sandbox has no git identity). Note ADR-011/015 and the 2026-08-25
  session file were already staged from that session and rode onto this branch.
- Answer `DOC-011` → then `SCOPE-02`.
- `git add turbo.json` (`BUILD-001`); `git add --renormalize .` (`GIT-001`).

**Lane note**: docs only. No code, schema, API or auth touched.
