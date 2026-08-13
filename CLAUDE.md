# CLAUDE.md

Project context lives in `ai/context/project-brain.md` (shared by every AI agent).

See @ai/context/project-brain.md for project context and doc map.

Read further depending on the situation:
- @ai/rules/working-rules.md — mandatory rules when AI modifies code (workflow order, RBAC, DB, API, Auth, testing, naming)
- @ai/rules/multi-agent-workflow.md — **read this first if another agent (Codex / a second Claude / Antigravity) is working in parallel**: lane ownership, task claiming, contract-first, git worktrees, who updates which doc
- @ai/skills/flow-mapper.md — **read before building any screen**: turns one feature into a Page Contract (route, RBAC, states, data, endpoints). Run this before page-designer, always.
- @ai/skills/page-designer.md — builds a page from a Page Contract; effort ladder deciding when a screen is pure composition vs. when to reach for `ui-ux-pro-max` / `taste-skill`
- @ai/known-issues/KNOWN_ISSUES.md — known bugs / technical debt
- @ai/context/HANDOFF.md — notes from the most recent session; read this first if continuing unfinished work
- @ai/PROGRESS.md — sprint checklist, what's done vs. not started
- @ai/AI_CHAT_LOG.md — decisions/ideas that came out of chat brainstorming (Claude.ai, ChatGPT, Gemini) outside of a coding agent
- @docs/shared/decisions/ — Architecture Decision Records (ADR), Accepted only
- @docs/roadmap/SPRINT_PLAN.md — plan + status per sprint (S0–S9)

⚠️ Ignore `archive/` — contains stale, outdated documents (`feature.md`, `feature-root.md`, `PROJECT_SUMMARY.md`) that do not reflect the current `docs/` structure.
