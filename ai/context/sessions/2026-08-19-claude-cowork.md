## [2026-08-19] — Backend module specs for all Admin — claude (Cowork) — branch `chore/fast-verify-rule`

**Done**:
- `docs/api/modules/` — 8 module specs + `_INDEX.md` + `_TEMPLATE.md`, ~3,900 lines
- `docs/BACKEND_PLAN.md` — standalone backend plan for newcomers, went through 3 rounds of critique
- `ai/rules/working-rules.md` — Skill Rules · FE iterate · fast verify lane · 8-step diagram
  with loop 5↔6 and `/design-promote` separated out
- `AGENTS.md` + `CLAUDE.md` — rewrote Skill precedence (identical in both)
- `.agents/skills/design-promote/` + `.agents/skills/build-screen/` — 2 new skills
- `root-design-fe.md` + `pages/_INDEX.md` + 3 specs — bootstrap `design_baseline: v1`
- `KNOWN_ISSUES.md` — 6 new issues: API-002/003/004, DOC-005/006/007
- `PROGRESS.md` — fixed doc drift for 5 decisions + added Backend module spec section

- **Round 2 (after user asked "you're not updating handoff etc?"):**
  - `PROGRESS.md` · `HANDOFF.md` · `KNOWN_ISSUES.md` (6 new issues) · this session file ·
    `AGENTS.md` + `CLAUDE.md` pointing to `docs/api/modules/`
  - Discovered **doc drift**: 5 business decisions approved on 2026-08-16 in HANDOFF but
    PROGRESS still marked them as "unsettled" for 3 days
- **Round 3 (after user asked what rules were missing)**: fixed the very rules that were being skipped —
  "Two task types" table in § The flow · session file added to DoD item 4 · doc index added to item 5 ·
  CI step `Record step was not skipped` · restored the lost fast-verify rule

- **Round 4**: `pnpm check:docs` caught **15 error codes** in specs not present in the registry.
  Three different categories, different fixes:
  - **(a) spec invented names while the correct code already existed** — `CLASS_CODE_INVALID` →
    `CLASS_ENROLL_CODE_INVALID`, `CLASS_ARCHIVED` → `CLASS_ALREADY_ARCHIVED`
  - **(b) real gaps in `API_ERROR_CODES.md`** — `DUPLICATE_ENTRY` and
    `INTERNAL_SERVER_ERROR` were emitted by the `GlobalExceptionFilter` template in §5 from the start but
    the registry §3 had never registered them. Added *Fallback Errors* section
  - **(c) mentioned-to-prohibit, not meant to be used** — `AUTH_TOKEN_REUSED` is a counter-example;
    the checker scans backticks so it misread it. Removing backticks fixed it
  Added `TOO_MANY_REQUESTS` + `PAYROLL_PERIOD_DUPLICATE` under *proposed, not agreed*.

**In progress** (and why it's unfinished):
- `PR_BODY.md` sits at repo root, PR **not yet created** — `device_bash` on the user's machine
  died mid-session, git could not be run from the agent

**Contract/temporary decisions to preserve**:
- Module spec template = **16 fixed sections**, section 4 (invariant) and section 15 (test matrix) are
  a pair — every invariant must have a test. This is the invariant gate, replacing coverage %.
- Specs **do not self-decide** when source documents contradict — record the status quo in section 16.
- Never invent error codes. Error branches without a code are marked ⛔ in section 9.
- Modules are split by **transaction boundary**, not by table.
- Fast verify lane is the default; full lane is mandatory for auth · money · shared components ·
  production/migration.

**Needs from the other lane**: —

**Blocker / needs follow-up**:
- Money representation (ADR-010) has never been asked — blocks modules 05, 06
- SCOPE-01 Classes/Enrollment — blocks modules 03, 04, 05
- API-002 two contradictory rate-reading formulas — blocks all money calculations
- 5 decisions from 16/08 are not yet ADRs
- Working tree still has many uncommitted changes, branch not yet split
- **Lesson 1**: the fast-verify rule was lost because it wasn't committed immediately after writing. Commit incrementally,
  don't batch at end of session.
- **Lesson 2**: when delegating work to a subagent, the "verified facts" file must be **complete**.
  The `_FACTS.md` I prepared did not copy the `Class Errors` section from `API_ERROR_CODES.md`, so the agent
  writing spec `03` invented two codes while the correct ones already existed. The agent wasn't wrong — it had
  no way of knowing. **Incomplete source material means the agent invents, and it invents confidently.**
- **Lesson 3**: `pnpm check:docs` caught all three error categories above in under one second. Run it
  BEFORE committing, don't wait for CI to catch it.

**Next steps**:
1. ADR-010 → ADR-014
2. Lock down SCOPE-01 and API-002
3. Phase 1 infra, then Phase 2 Auth (`01-auth.md` is the only `accepted` module)
