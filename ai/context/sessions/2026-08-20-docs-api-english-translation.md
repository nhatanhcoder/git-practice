## [2026-08-20] — Full docs/api translation to English + error-code registry fixes — Antigravity — branch `chore/record-enforcement`

**Done**:
- **Translated the entire `docs/api/` corpus to English** (Vietnamese → English, preserving all
  code blocks, SQL, JSON, invariant IDs, error codes, endpoint paths, field names, entity refs,
  emoji status marks, dates, and Vietnamese names inside quoted examples):
  - Modules: `01-auth` · `02-users` · `03-classes-enrollment` · `04-sessions-attendance` ·
    `05-payroll` · `06-billing` (116 KB, largest) · `07-notifications` · `08-dashboard` ·
    `_INDEX` · `_TEMPLATE`
  - Top-level: `API_CONVENTIONS` · `API_ADMIN` · `API_TEACHER` · `API_STUDENT` ·
    `API_ERROR_CODES`
  - Also translated `ai/PROGRESS.md` + `ai/context/HANDOFF.md` (prior session, uncommitted).
- **`API_ERROR_CODES.md`**: registered the two *Fallback Errors* (`DUPLICATE_ENTRY` /
  `INTERNAL_SERVER_ERROR`) that the `GlobalExceptionFilter` emits but the registry was missing,
  plus `TOO_MANY_REQUESTS` + `PAYROLL_PERIOD_DUPLICATE` under *proposed, not agreed*. Runtime
  Vietnamese UI strings inside code samples intentionally kept (product UI language is
  Vietnamese — per the file's own policy note).
- **`pnpm check:docs`** (8 checks) passes locally: `check-docs: all 8 checks passed.`
- Final verification: grep for Vietnamese diacritics across `docs/api/` → only intentional
  remnants: `=1đ` (VND notation in a test-matrix value, billing) and runtime UI strings in
  `API_ERROR_CODES.md` code samples. `07-notifications.md` flag was a stale glob artifact —
  per-file regex confirms 0 hits.

**In progress**: n/a (translation complete).

**Temporary decisions to preserve**:
- **Last edited 2026-08-19 → 2026-08-20** was purely a language pass; **no technical content
  changed**. All invariant IDs, statuses (`defined`/`PROPOSED`), blockers, quotas and unresolved
  tables (C2, Q-BILL-1…17, Q-PAY, INV-…) are byte-identical in meaning.
- Runtime Vietnamese strings **inside code samples remain Vietnamese** (UI copy policy) — the
  translation covers prose, table cells, headings; it does NOT translate user-facing strings.
- Range separators converted to English thousands format (`1.100.000` → `1,100,000`) except
  where the string is a display example inside quotes.

**Blocker / needs follow-up**:
- Working tree has **uncommitted changes** across `docs/api/**`, `ai/PROGRESS.md`,
  `ai/context/HANDOFF.md`, `ai/context/sessions/2026-08-19-claude-cowork.md` (this entry).
  Branch is clean vs origin/main (PR #9 merged → main already contains the spec commits).
- CI gate (docs-check) requires either a `ai/PROGRESS.md` touch **or** a file under
  `ai/context/sessions/` when a PR changes ≥50 lines in `docs/` — covered by this session file.

**Next steps**:
1. Commit everything + push `chore/record-enforcement`.
2. Create a new PR for the translated docs (PR #9 already merged).
3. Keep `ai/known-issues/KNOWN_ISSUES.md` + `ai/rules/working-rules.md` untranslated (out of
   scope) — they remain Vietnamese by design for now.
