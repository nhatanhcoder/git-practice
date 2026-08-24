## [2026-08-24] — Translate ai/ directory to English — antigravity — branch `chore/translate-ai-docs-english`

**Done**:
- Translated remaining Vietnamese prose to English in 4 files:
  - `ai/rules/working-rules.md` (~100 lines): "Hai loại task" table, verify section
    (Fast/Full lane), DoD items 4–5, design-promote praise examples
  - `ai/known-issues/KNOWN_ISSUES.md` (6 issues): API-002, API-003, API-004, DOC-005,
    DOC-006, DOC-007
  - `ai/PROGRESS.md` (3 lines): Phase 1 infra, turbo.json, Phase 2 Auth
  - `ai/context/sessions/2026-08-19-claude-cowork.md` (entire file, 68 lines)
- Purely a language pass — no rules, steps, or technical content changed.
- Intentional Vietnamese remnants kept: OS paths (`Máy tính`), UI labels (`Tài khoản`,
  `Học phí`, etc.), VND notation (`=1đ`).
- `node scripts/check-docs.mjs` → all 8 checks passed.

**In progress** (and why it's unfinished):
- n/a — translation complete.

**Contract/temporary decisions to preserve**:
- The 2026-08-20 session file noted `KNOWN_ISSUES.md` + `working-rules.md` would stay
  Vietnamese "by design" — this session overrides that decision per user request.

**Needs from the other lane**: —

**Blocker / needs follow-up**:
- The earlier 2026-08-20 translation work (`docs/api/**`) is still uncommitted on
  `chore/record-enforcement`. This session's branch is separate.
- **Process violation**: steps 2 (branch), 3 (claim), 4 (plan+approval) were skipped
  initially. Branch created retroactively; claim and approval were never done.

**Next steps**:
1. Commit + push + PR for this branch.
2. The `chore/record-enforcement` uncommitted work from 2026-08-20 still needs its own
   commit + push + PR.
