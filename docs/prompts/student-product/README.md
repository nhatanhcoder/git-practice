# Student Product Design Mockup Prompts

These prompts define a brand-new Student product design prototype. They are for visual exploration and clickable frontend mockups, not production API implementation.

## Scope

- HSK levels are **1 through 9** everywhere in the prototype.
- Included: dashboard, learning path, grammar, foundation, workplace simulator, CBT exams, mistake notebook/SRS, Lego word order, character writing, leaderboard/streak/badges.
- Removed from scope: music/karaoke, 1v1 PK arena, AI Mentor/Tiểu Long.
- This is a new visual direction. Existing project UI is optional inspiration, not a design constraint.

## How To Use

1. Give `00-project-master-prompt.md` to the coding agent first.
2. For the first batch, give `00-build-first-four-pages-ui-ux-pro-max.md` after the master prompt.
3. Or give `01`–`04` one at a time for isolated page mockups.
4. Do not ask the agent to create Page Contracts, APIs, schemas or backend code for this mockup phase.

For Claude, Antigravity and other AI tools, use [11-agent-adapters-hsk-learning-ia.md](./11-agent-adapters-hsk-learning-ia.md). The canonical skill remains `.agents/skills/hsk-learning-ia/SKILL.md`.

## Mockup Build Order

1. Student Dashboard
2. HSK Learning Path
3. Foundation
4. Grammar Library
5. Character Writing
6. Mistake Notebook/SRS
7. HSK CBT Exam Room
8. Workplace Simulator
9. Leaderboard/Streak/Badges
