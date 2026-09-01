# 2026-09-01 — Add PR-title rule to working-rules.md — Claude Code

**Context**: user asked to add a standing rule: PR titles must carry their own meaning so a
reader understands the PR's objective from the title alone, without reading the diff or the
conversation that produced it. Prompted by this session's own PR titles (#13, #14) needing to
stay outcome-focused as the branch/commit convention this repo already has
(`docs/shared/CONVENTIONS.md` § Git Conventions) doesn't say anything about *quality* of the
description, only its `<type>(<scope>): <description>` shape.

**Done**:
- Added a "PR title must carry its own meaning" rule to
  `ai/rules/working-rules.md` § MANDATORY: Definition of Done, right after the
  `pnpm check:docs` paragraph (i.e. it applies at the point an agent is about to open a PR).
  Ties into the existing Conventional Commits format from `CONVENTIONS.md` rather than
  inventing a new one; includes bad/good examples and a note that a PR bundling unrelated
  work is a sign it should be split, not a reason to write a vaguer title.

**Temporary decisions to preserve**:
- Placed in `working-rules.md`, not `docs/shared/CONVENTIONS.md` — `working-rules.md` is one
  of the 5 always-loaded files agents actually read every session; `CONVENTIONS.md` is
  older-generation and not on that list (see `HANDOFF.md`'s note on the two doc generations).
  `CONVENTIONS.md`'s Git Conventions section was left untouched — it still describes a
  `develop` branch this repo doesn't use, which is a separate stale-doc issue, out of scope here.

**Next steps**:
- Review/merge this PR.
