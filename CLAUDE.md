# CLAUDE.md

Project context lives in `ai/context/project-brain.md` (shared by every AI agent).

## Before you commit UI code — read this, it is not optional

**A green `next build` is not verification.** It compiles; it does not render. Do not report a
screen as working, and do not commit it, on the strength of a build.

Every commit that touches `apps/web/**` runs, in this order, and **pastes the real output** into
the PR and the session file:

```bash
pnpm --filter web build
PW_ROUTES=<paths you changed> pnpm --filter web test:screens   # or PW_AREA=<area> / PW_ALL=1
node --test apps/web/scripts/*.test.mjs
pnpm check:docs
```

`test:screens` is Playwright. It loads each screen in a **production** build at desktop 1280 and
at 375px, asserts it mounted and did not fall into a "not found" or error branch, fails on any
console error or horizontal scroll, and writes a screenshot per screen per viewport to
`apps/web/test-results/screens/`. **Open those screenshots and look at them** — that is the
point, not a by-product.

Scope is the routes this commit touched. Touching anything shared — a shell, `status.ts`,
anything in `components/` — makes the scope the whole area (`PW_AREA=student|teacher|admin`).

New screen? Add it to `apps/web/tests/routes.ts` with a **valid** id if the route is dynamic, and
do not draw every fixture from one level or one curriculum. A level-1-only fixture is exactly how
a broken id parser passed while every other lesson rendered "Không tìm thấy chặng".

If you cannot run the browser check, say so plainly in the report and name what went unverified.
Substituting the build for it, or describing a screen you never rendered, is the specific failure
this rule exists to stop — it has happened here more than once. Full rule, including the four
cases that demand more: `ai/rules/working-rules.md` § Verify.

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
| `.agents/skills/ui-ux-pro-max/SKILL.md` | Layout, interaction, typography, colour reasoning, chart types, a11y checks. Vendored (3.7MB, Python + CSV data) so **all three agents** see it, not just Claude. Needs Python 3 on PATH. Take layout and craft from it; its palette never ships — see § Skill precedence. |
| `.agents/skills/design-promote/SKILL.md` | The human ran `/design-promote <screen>`. Do not open this file otherwise — it is not a step in your task. |
| `docs/api/modules/_INDEX.md` | **Thiết kế backend.** 8 module spec cho phần Admin, template 16 mục, 168 invariant. Đọc `_INDEX.md` trước rồi mở đúng module đang làm. Chỉ `01-auth` ở trạng thái `accepted`. |
| `ai/rules/multi-agent-workflow.md` | **Another agent (Codex / a second Claude / Antigravity) is working in parallel.** Lane ownership, task claiming, contract-first, git worktrees, who updates which doc. |
| `docs/roadmap/SPRINT_PLAN.md` | Planning, estimating, or asking what belongs in which sprint (S0–S9). |
| `ai/AI_CHAT_LOG.md` | Looking for a decision that came out of chat brainstorming (Claude.ai, ChatGPT, Gemini) outside a coding agent. |
| `docs/shared/decisions/` | Need the reasoning behind an architecture decision. Accepted ADRs only. |

> **Where skills live.** Every project skill has its entry point at
> `.agents/skills/<name>/SKILL.md`. That path **is** the skill — no second copy, no pointer,
> no `ai/skills/` directory (removed 2026-08-14). Antigravity discovers them automatically
> and loads one only when its `description` matches the task; Claude Code and Codex reach
> them through the table above.
>
> Skills we write are a single file. A **vendored** skill (`ui-ux-pro-max`) may ship its own
> `scripts/` and `data/` alongside `SKILL.md` — that is fine, but the rule still holds: one
> entry point, and we never hand-edit a vendored skill's contents. To update it, re-run its
> installer (`npx ui-ux-pro-max-cli init --ai universal`, which targets `.agents/skills/`
> and therefore serves all three agents — `--ai claude` would only serve Claude Code).
> Never split a skill **we** wrote across two files.

## Skill precedence

**Use skills freely — any skill, any screen, no permission needed.** Installing a new skill
into `.agents/skills/` still needs approval; using one does not. Full rules in
`ai/rules/working-rules.md` § Skill Rules.

Two limits, and only two:

1. For a **UI screen**, this project's pipeline wins over any planning flow a skill pack
   (superpowers `writing-plans` / `brainstorming`, or equivalent) proposes:

   ```
   flow-mapper → Page Contract → page-designer → spec → mockup → code in apps/web/**
   ```

   Skills supply layout, interaction and craft *inside* that pipeline — they do not replace it.

2. **A skill's palette / fonts / tokens never enter shipped code directly.** Iterate on the FE
   as long as it takes; `root-design-fe.md` and `_DESIGN-SYSTEM.md` stay untouched until the
   human runs `/design-promote <screen>` after the code is pushed
   (`.agents/skills/design-promote/SKILL.md`). That single gate is what keeps one design
   system instead of two — not a ban on which skills may be opened.

⚠️ Ignore `archive/` — contains stale, outdated documents (`feature.md`, `feature-root.md`, `PROJECT_SUMMARY.md`) that do not reflect the current `docs/` structure.
