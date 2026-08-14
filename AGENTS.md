# AGENTS.md — HSK Learning Platform

> **Mandatory reading before starting any work on this project.**
> Shared entry point for all AI coding agents (Antigravity, Claude Code via CLAUDE.md, Cursor, etc.).

Project context lives in `ai/context/project-brain.md` (shared by every AI agent).

## Always loaded

These are small and apply to every task. They are `@`-referenced on purpose.

- @ai/context/project-brain.md — what this project is, stack, current status
- @ai/rules/working-rules.md — mandatory rules when AI modifies code (workflow order, RBAC, DB, API, Auth, testing, naming)
- @ai/known-issues/KNOWN_ISSUES.md — known bugs / technical debt
- @ai/context/HANDOFF.md — notes from the most recent session; read this first if continuing unfinished work
- @ai/PROGRESS.md — sprint checklist, what's done vs. not started

## Read on demand — open the file, do not preload

**These are deliberately NOT `@`-referenced.** Together they are ~15k tokens; loading
them on every turn crowds out the actual work. `@` forces a file into context before the
first message — it is not what makes a file readable. Open whichever one the task calls
for.

| Read this | When |
|---|---|
| `.agents/skills/flow-mapper/SKILL.md` | **Before building any screen.** Turns one feature into a Page Contract (route, RBAC, 7 states, data, endpoints). Always runs before page-designer. |
| `.agents/skills/page-designer/SKILL.md` | Building a page from an existing Page Contract. Holds the effort ladder — when a screen is pure composition vs. when to reach for `ui-ux-pro-max` / `taste-skill`. |
| `ai/rules/multi-agent-workflow.md` | **Another agent (Codex / a second Claude / Antigravity) is working in parallel.** Lane ownership, task claiming, contract-first, git worktrees, who updates which doc. |
| `docs/roadmap/SPRINT_PLAN.md` | Planning, estimating, or asking what belongs in which sprint (S0–S9). |
| `ai/AI_CHAT_LOG.md` | Looking for a decision that came out of chat brainstorming (Claude.ai, ChatGPT, Gemini) outside a coding agent. |
| `docs/shared/decisions/` | Need the reasoning behind an architecture decision. Accepted ADRs only. |

> **Where skills live.** All project skills are single files at
> `.agents/skills/<name>/SKILL.md`. That path **is** the skill — there is no second copy,
> no pointer, no `ai/skills/` directory (removed 2026-08-14). Antigravity discovers them
> automatically and loads a skill only when its `description` matches the task; Claude Code
> and Codex reach them through the table above. Never split a skill across two files again.

## Skill precedence

If a general-purpose skill pack (superpowers `writing-plans` / `brainstorming`, or any
equivalent) proposes its own planning flow for a **UI screen**, this project's pipeline
wins:

```
flow-mapper → Page Contract → page-designer → spec → mockup → code in apps/web/**
```

`taste-skill` / `design-taste-frontend` is for **public pages only** (landing, pricing,
login). Never for dashboard or admin screens — those take tokens from
`docs/front-end-design-docs/root-design-fe.md` and follow the specs in
`docs/front-end-design-docs/specs/`. Two design systems in one app is the failure mode
this rule exists to prevent.

⚠️ Ignore `archive/` — contains stale, outdated documents (`feature.md`, `feature-root.md`, `PROJECT_SUMMARY.md`) that do not reflect the current `docs/` structure.
