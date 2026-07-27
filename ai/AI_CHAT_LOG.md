# AI_CHAT_LOG.md — Log of AI chat work (Claude, ChatGPT, Gemini...)

> Unlike **HANDOFF.md** (for coding agents with read/write access to the repo — Claude Code, Antigravity), this file logs pure **chat sessions** (Claude.ai, ChatGPT, Gemini, or Claude Code/Antigravity's chat mode without touching code) — where you brainstorm ideas, ask for architecture advice, debug logic, compare solutions, etc.
>
> **Problem this file solves**: these chat sessions do *not* automatically know about each other. Asking Claude.ai today and ChatGPT tomorrow about the same problem without logging it → you risk getting two different answers and not knowing which one was applied, or repeating a question that already has an answer.
>
> **Most important principle**: any conclusion with lasting value from here must be **moved into DECISIONS.md / PROGRESS.md** — the AI chat tool itself (Claude.ai, ChatGPT...) can't read this file in a later session without persistent memory, so don't let a decision live only here.

---

## How to log an entry

| Date | Tool | Topic | Conclusion / decision | Moved to DECISIONS/PROGRESS? | Link (if shareable) |
|---|---|---|---|---|---|
| 2026-07-18 | Claude.ai | Design a tracking file set for the project | Created AGENTS.md, CLAUDE.md, DECISIONS.md, PROGRESS.md, HANDOFF.md, AI_CHAT_LOG.md | ✅ (these files themselves) | — |
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
