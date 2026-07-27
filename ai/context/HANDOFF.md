# HANDOFF.md — End-of-session notes

> Read the **most recent** entry (top of file) first when starting a new session.
> Unlike `docs/roadmap/SPRINT_PLAN.md` (sprint task checklist) and `docs/shared/decisions/` (long-lived ADRs) — this file only holds things that are **temporary and easy to forget**: what's in progress, why it's unfinished, which temporary decisions must be preserved.
>
> Keep a maximum of the 5 most recent entries — delete older ones (distant history already lives in git log + ADRs).
> 2+ agents running in parallel: each agent adds its own entry, clearly labeled by name in the heading.

---

## Template

```
## [YYYY-MM-DD] — <what's being worked on> — <Claude Code / Antigravity / manual>

**Done**:
-

**In progress**:
-

**Temporary decisions to preserve** (if any):
-

**Blocker / needs follow-up**:
-

**Next steps**:
-
```

---

## [2026-07-27] — AI context cleanup & translation to English — manual (Claude.ai)

**Done**:
- Translated all active `ai/` files and root `AGENTS.md` / `CLAUDE.md` to English
- Fixed path mismatch: `HANDOFF.md` now lives at `ai/context/HANDOFF.md` (previously at `ai/HANDOFF.md`, which didn't match the path `AGENTS.md`/`CLAUDE.md` already pointed to)
- Removed the stale reference to `ai/DECISIONS.md` in `AGENTS.md` (that file does not exist anywhere in the repo)
- **Found and fixed a data conflict**: this file and `project-brain.md` said HSK level = 1–9; corrected back to **HSK 1–6** to match the confirmed decision and all entity specs. ⚠️ Please double-check this is correct — if HSK 1–9 was an intentional recent change, it needs to be re-applied everywhere consistently instead of reverted.
- Moved `feature.md`, `feature-root.md`, `PROJECT_SUMMARY.md` into `archive/` (previous entry claimed this was already done, but the files were still at repo root)
- Added a mandatory workflow rule to `ai/rules/coding-rules.md`: Analyze → Create a plan → Wait for approval → Begin work

**In progress**:
- No code written yet — project is still at "docs done, code not started"

**Next steps**:
- Confirm the HSK 1–6 vs 1–9 conflict resolution above
- Start Sprint 0 per `docs/roadmap/SPRINT_PLAN.md`

---

## [2026-07-19] — Set up entry point for AI agents — manual

**Done**:
- Added `CLAUDE.md` + `AGENTS.md` at root, pointing to `ai/context/project-brain.md` (project-brain.md already existed but wasn't in the location Claude Code/Antigravity auto-discover)
- Archived 3 stale files (`feature.md`, `feature-root.md`, `PROJECT_SUMMARY.md`) into `archive/` *(note: this step was not actually completed — see 2026-07-27 entry above)*
- Confirmed HSK level = **1–6**, matching all of `docs/entities/`, `GLOSSARY.md`, `DATABASE_SCHEMA.md` — no changes needed
- Added missing links to `ai/rules/`, `ai/known-issues/` in the Key Docs table in `project-brain.md`

**In progress**:
- No code written yet — project is at "docs done, code not started" (matches project-brain.md)

**Next steps**:
- Start Sprint 0 per `docs/roadmap/SPRINT_PLAN.md`
