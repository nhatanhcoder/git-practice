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

## [2026-08-11] — Resolve HSK 1–6 vs 1–9 conflict — Claude Code

**Done**:
- **HSK level range confirmed = 1–9** (user-confirmed 2026-08-11). Reverted the incorrect 2026-07-27 change: `project-brain.md` and this file now say 1–9, matching all of `docs/`. No `docs/` files needed changing — they were already correct.
- Fixed broken path references to `ai/rules/coding-rules.md` → the file is actually `ai/rules/working-rules.md` (fixed in `CLAUDE.md`, `AGENTS.md`, `project-brain.md`, and the 07-27 entry below).

**Temporary decisions to preserve**:
- None.

**Blocker / needs follow-up**:
- 3 untracked docs are still uncommitted: `docs/entities/postgres/ENTITY_AI_USAGE_LOG.md`, `docs/shared/decisions/005-server-authoritative-exam.md`, `006-external-cron-scheduler.md`. Neither is referenced from `docs/entities/_INDEX.md` / the ADR list yet — check before Sprint 3/4.

**Next steps**:
- Sprint 0 per `docs/roadmap/SPRINT_PLAN.md` — plan presented, awaiting approval. Still no code in the repo.

---

## [2026-07-27] — AI context cleanup & translation to English — manual (Claude.ai)

**Done**:
- Translated all active `ai/` files and root `AGENTS.md` / `CLAUDE.md` to English
- Fixed path mismatch: `HANDOFF.md` now lives at `ai/context/HANDOFF.md` (previously at `ai/HANDOFF.md`, which didn't match the path `AGENTS.md`/`CLAUDE.md` already pointed to)
- Removed the stale reference to `ai/DECISIONS.md` in `AGENTS.md` (that file does not exist anywhere in the repo)
- ~~**Found and fixed a data conflict**: this file and `project-brain.md` said HSK level = 1–9; corrected back to **HSK 1–6**.~~ ❌ **This revert was wrong — undone on 2026-08-11.** The premise ("matches all entity specs") was false: `docs/` says 1–9 in 13 places (all entity specs, `GLOSSARY.md`, `DATABASE_SCHEMA.md`, `CONVENTIONS.md`, `SPRINT_PLAN.md`), and 1–6 appeared *only* in the two `ai/context/` summary files. See the 2026-08-11 entry.
- Moved `feature.md`, `feature-root.md`, `PROJECT_SUMMARY.md` into `archive/` (previous entry claimed this was already done, but the files were still at repo root)
- Added a mandatory workflow rule to `ai/rules/working-rules.md`: Analyze → Create a plan → Wait for approval → Begin work

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
