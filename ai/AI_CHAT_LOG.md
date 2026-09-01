# AI_CHAT_LOG.md — Log of AI chat work (Claude, ChatGPT, Gemini...)

> Unlike **HANDOFF.md** (for coding agents with read/write access to the repo — Claude Code, Antigravity), this file logs pure **chat sessions** (Claude.ai, ChatGPT, Gemini, or Claude Code/Antigravity's chat mode without touching code) — where you brainstorm ideas, ask for architecture advice, debug logic, compare solutions, etc.
>
> **Problem this file solves**: these chat sessions do *not* automatically know about each other. Asking Claude.ai today and ChatGPT tomorrow about the same problem without logging it → you risk getting two different answers and not knowing which one was applied, or repeating a question that already has an answer.
>
> **Most important principle**: any conclusion with lasting value from here must be **moved into PROGRESS.md / KNOWN_ISSUES.md / PROJECT_KNOWLEDGE.md** (`DECISIONS.md` is referenced across the repo but has never existed — DOC-008) — the AI chat tool itself (Claude.ai, ChatGPT...) can't read this file in a later session without persistent memory, so don't let a decision live only here.

---

## How to log an entry

| Date | Tool | Topic | Conclusion / decision | Moved to DECISIONS/PROGRESS? | Link (if shareable) |
|---|---|---|---|---|---|
| 2026-07-18 | Claude.ai | Design a tracking file set for the project | Created AGENTS.md, CLAUDE.md, DECISIONS.md, PROGRESS.md, HANDOFF.md, AI_CHAT_LOG.md ⚠️ **DECISIONS.md was never actually created — see DOC-008** | ✅ (these files themselves) | — |
| 2026-08-31 | Claude Opus 5 (Claude.ai) | Merge F9–F16 learning content into the docs; full conflict review + English translation | Drafted PROJECT_KNOWLEDGE.md §8 (F9–F16) and §9 (conflict register); re-derived HSK 1–9; proposed widening the skill enum 3→7 and 7 new Postgres progress tables. **Ran without repo access** — rewrote 5 tracked files from stale July copies and reused live issue IDs | 🟡 Partly — see the 2026-09-01 row | — |
| 2026-09-01 | Claude Opus 5 (Cowork, device mount) | Verify that session against the real repo and merge what survived | Kept the repo versions of KNOWN_ISSUES/PROGRESS/HANDOFF/working-rules/multi-agent-workflow; merged only new material under new IDs (SCOPE-02, DOC-008…012, API-005, GIT-003, DEBT-003, CR-## register). Closed CR-2 (10 sprints), CR-6 (one backend), CR-19 (`packages/types`), CR-7 (partly false). Found `backend/data/content/` **absent from the repo** → DOC-011 | ✅ PROJECT_KNOWLEDGE.md §9, KNOWN_ISSUES.md, PROGRESS.md Sprint 0 + 5b, working-rules § Conflict Rules | — |
| | | | | | |

**How to fill in the "Tool" column**: include name + version if you remember it (e.g. `Claude Opus 4.8`, `ChatGPT-5.2`, `Gemini 3 Pro`) — since different models can give different answers, this is useful for cross-checking later.

**How to fill in the "Moved to DECISIONS/PROGRESS?" column**:
- `✅` + item number — e.g. `✅ DECISIONS #7` if it was recorded as an official decision
- `🟡 Not yet` — if the conclusion still needs more thought / isn't reliable enough to finalize, but is worth keeping so it isn't lost
- `➖ Not needed` — if it was just a general knowledge question with no impact on project decisions

---

## When you SHOULD log here

- Comparing architecture/library solutions (e.g. "NestJS Guard vs Interceptor for AI rate limiting" asked across multiple tools for cross-checking)
- Asking one AI to review another AI's decision (e.g. giving DECISIONS.md to ChatGPT/Gemini for a cross-review)
- Brainstorming a new feature not yet in features.md/PROJECT_KNOWLEDGE.md
- Debugging a complex logic bug via chat (not a coding agent editing files directly)

## When you do NOT need to log

- General knowledge questions, not specific to this project (e.g. "what's the Prisma migration syntax")
- A coding agent session with direct file-editing rights → use HANDOFF.md instead of this file
