# HSK Learning IA — Agent Adapters

The canonical skill is:

```text
.agents/skills/hsk-learning-ia/SKILL.md
```

Do not create a second, conflicting version of the skill. The following prompts tell different AI tools how to load and apply the same rules.

## Claude Code

```text
Use the project skill at .agents/skills/hsk-learning-ia/SKILL.md.

You are working on the HSK Student learning product. Read the skill before designing or changing any Student learning flow. Apply its HSK 1–9 scope, two-curriculum model, navigation hierarchy, learning-mode distinctions, progress-loop rules and review checklist.

Current task:
[DESCRIBE THE PAGE OR FLOW]

Mode:
- For a visual mockup: use local mock data/state, do not require backend, API, database, auth, RBAC, flow-mapper or Page Contracts. Use ui-ux-pro-max freely.
- For production functionality: follow the repository's normal contracts, API, RBAC and testing rules after applying the IA rules.

Do not add Music/Karaoke, PK Arena or AI Mentor/Tiểu Long.
Keep HSK levels 1–9 everywhere.
Before finishing, review the result against the skill checklist and report any remaining mock or placeholder behavior.
```

## Antigravity

```text
Load and follow this project skill:
.agents/skills/hsk-learning-ia/SKILL.md

Use it as the source of truth for the HSK Student information architecture. The product supports HSK 1–9 and two curricula: HSK Standard Course and Giáo trình Hán ngữ.

Task:
[DESCRIBE THE PAGE OR FLOW]

If this is a new-design mockup:
- Build frontend only.
- Use local mock data and local state.
- Do not wait for API contracts or backend implementation.
- Do not create Page Contracts, migrations, auth or RBAC.
- Use ui-ux-pro-max for layout, visual direction, responsive behavior and accessibility.

If this is production work, explicitly switch to implementation mode and follow the repository's backend/API/RBAC rules.

Do not create navigation or routes for Music/Karaoke, PK Arena or AI Mentor/Tiểu Long. Validate HSK 1–9 selectors, URL navigation, back behavior, learning modes and next actions before delivery.
```

## Generic AI coding agent

```text
Read this file first:
.agents/skills/hsk-learning-ia/SKILL.md

Apply the HSK Student IA rules to this task:
[DESCRIBE THE PAGE OR FLOW]

Product constraints:
- HSK levels 1–9, never 1–6.
- Curricula: HSK Standard Course and Giáo trình Hán ngữ.
- Student areas include Dashboard, Learning Path, Grammar, Foundation, Workplace, Exams, Mistakes/SRS, Lego, Writing and Progress/Leaderboard.
- Exclude Music/Karaoke, PK Arena and AI Mentor/Tiểu Long.

Choose the mode explicitly:
1. MOCKUP: frontend-only, local mock data/state, free visual design, no backend/API/database/auth/RBAC requirements.
2. PRODUCTION: real persistence and integration, using the repository's API, auth, RBAC and testing rules.

In either mode, preserve the IA rules: two clicks to a learning action, URL-based primary states, one clear hub axis, predictable back navigation, honest Học bài/Luyện tập/Thi HSK labels, and a clear next action after completion.
```

## Cursor / Windsurf / Cline / Roo Code

```text
Before editing, open and follow:
.agents/skills/hsk-learning-ia/SKILL.md

Treat it as the canonical HSK Student learning IA specification. Do not invent an IELTS/TID band model. Use HSK 1–9 and the two HSK curricula. For a mockup, use local data and frontend-only implementation; for production, use the repository's real contracts and APIs. Keep removed features out of the route tree and navigation.

Task:
[DESCRIBE THE PAGE OR FLOW]

Use ui-ux-pro-max for UI work when requested. At the end, verify URL navigation, mobile behavior, empty/loading/error states, learning-mode labels and the next-action loop.
```

## When handing off between agents

Always include:

- The canonical skill path.
- Whether the task is `MOCKUP` or `PRODUCTION`.
- The exact routes being changed.
- HSK level scope: `1–9`.
- Features explicitly excluded: Music/Karaoke, PK Arena, AI Mentor/Tiểu Long.
- Any local mock data that is intentionally temporary.
