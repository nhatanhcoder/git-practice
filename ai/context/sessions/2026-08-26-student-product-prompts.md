## [2026-08-26] — student product coding prompts — codex

**Done**:
- Added `docs/prompts/student-product/` with README, master prompt and 10 page prompts.
- Added a combined `ui-ux-pro-max` implementation prompt for the first four Student pages.
- Reworked the prompt folder into a frontend-only, new-design mockup system with local mock data.
- Added `.agents/skills/hsk-learning-ia/SKILL.md`, adapted from the supplied TID/IELTS IA skill.
- Added copy-paste adapters for Claude Code, Antigravity and other AI coding agents.
- Normalized HSK scope to levels 1–9.
- Explicitly removed music/karaoke, 1v1 PK arena and AI Mentor/Tiểu Long.
- Added route, RBAC, persistence, API, state, acceptance and testing guidance per page.

**In progress** (and why it's unfinished):
- No Student page or backend feature was implemented; these files are implementation prompts only.

**Contract/temporary decisions to preserve**:
- Student features must be built as real API-backed flows, not local mock state.
- HSK 1–9 is the canonical level range for all new Student work.

**Needs from the other lane**:
- Page Contracts and shared transport types must be created before implementing each new route.

**Blocker / needs follow-up**:
- Auth, content datasets, API modules and persistence are still absent from the current repo.

**Next steps**:
- Start with Auth + Student shell, then implement prompts in the documented build order.
