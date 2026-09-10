## [2026-09-09] — Module-status docs sync + audit verification + A09 QC aftermath — claude — branch `docs/module-status-sync`

**Context**: three inputs converged: (1) an external "Comprehensive Audit & Review: Backend
Modules 01→08" the user asked to verify, (2) the independent A09 QC run earlier the same day,
(3) long-known doc drift. This batch landed the documentation corrections the audit got right,
recorded the two real defects it missed, and explicitly did **not** act on its wrong claims.

**Done**:
1. **Audit verification (read-only, reported to user before this batch)**: 5 factual errors
   found — migration timestamp (`20260905094200` → actual `20260905163207`), "Integer VND"
   (ADR-010 actually mandates `Decimal(12,2)` + string serialization), `generate-preview`
   endpoint (actual: `POST /admin/invoices/batch/preview`), "live Redis ping probe" (hardcoded
   literal), `sortBy` filter on `/admin/users` (only `role`/`status`/`q`). Its `_INDEX.md:L46`
   drift claim and A08 merge-conflict claim were confirmed true.
2. **`docs/api/modules/_INDEX.md`**: obsolete "Only Auth is ready to code" line removed and
   replaced with a verified implementation-status paragraph (modules 01–06, 08 implemented,
   13 e2e suites, module 07 the only uncoded one). **02-users status conflict recorded, not
   resolved**: the table has said `accepted` since `41f3ff1` (whose message only names 04/05/
   06/08 but whose diff also flipped rows 02–03), while the spec frontmatter still says
   `proposed`. Row now reads ⚠️ conflict with the evidence; spec frontmatter treated as
   authoritative for contract-locking until the owner picks.
3. **`ai/PROGRESS.md` § Backend module table**: synced to the same reality — 02 marked
   implemented + conflict, 03 accepted (was `⛔ deferred on SCOPE-01` — settled 2026-09-03),
   07 marked `not implemented`, monitoring stub caveat added to 08.
4. **KNOWN_ISSUES `API-017`**: `/admin/monitoring` reports fiction — Redis status is a
   hardcoded `'healthy'`/`'1ms'` literal (no Redis client exists anywhere), Gemini latency
   `45ms` and quota `142000/1000000` are constants (only "key configured?" is real). Same
   defect class as `WEB-011`, on the screen an operator trusts during incidents.
5. **KNOWN_ISSUES `DEBT-006`**: the A09 suite is regex/structural (asserts file strings, not
   behavior) — recorded with the note that today's live QC covered the gap but is not
   repeatable per-PR; fix plan follows the A04 pure-module pattern, to be done when the file
   is next touched.
6. **A08+A09 PR**: `feat/a09-student-leave` (merge-base `99a511c`, contains A08 rebase +
   A09) pushed with PR opened — A08's stale conflict vs `main` was resolved by the earlier
   rebase, QC 7/7 pass evidence in the PR body.

**Contract/temporary decisions to preserve**:
- The 02-users `accepted` vs `proposed` conflict is **recorded and unresolved** — the owner
  either signs off the spec or restores the `_INDEX` row. No agent edits either side to match
  the other (Conflict Rules, `working-rules.md`).
- ID namespace: `API-017` and `DEBT-006` verified free across `main`, `feat/a09-student-leave`,
  and `docs/config-auth-findings` (PR #49 holds API-015/016; highest DEBT is 005).

**Blocker / needs follow-up**:
- Owner: decide the 02-users status; decide ADR-011/`rejected` (DOC-005) — both pre-date this
  session and were re-flagged by the audit's "close ADRs" recommendation.
- `packages/types`, `API-015` code fix (auth-gated), `API-016` shared store: unchanged,
  waiting as before.

**Next steps**:
- Merge order suggestion: PR #49 (docs, no code) → PR #50 (CI, other lane) → A08+A09 PR →
  this PR (tiny, doc-only, rebases trivially if it lands last).
