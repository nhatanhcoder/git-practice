## [2026-09-08] — Docs batch: config/auth/throttling review findings — claude — branch `docs/config-auth-findings`

**Context**: four external review findings were assigned as a table (items 8–11 of a larger
11-item list; items 1–7 are FE/CI work owned elsewhere — item 1 is another agent's uncommitted
CI work in the shared checkout, untouched):

- Validate configuration centrally; align API prefix and cookie path — High
- Establish shared API transport types — Medium
- Correct stale project status and conflicting Auth documentation — Medium
- Define global throttling contracts and multi-instance storage — High, required before scaling

All four were **verified against code before any edit**. Three touch Auth, so per
`working-rules.md` the docs landed and the auth-code change is held for explicit approval.

**Done**:
1. **`API_CONVENTIONS.md` — new § Rate Limiting** (after Common Headers): the login limiter
   documented exactly as implemented (5 failures/15 min per `(ip, normalized email)`,
   `429 AUTH_TOO_MANY_REQUESTS`, no bcrypt on block, identical for unknown emails, reset on
   success); register/refresh/change-password limits and generic `TOO_MANY_REQUESTS` explicitly
   marked *proposed, not agreed*; the multi-instance limitation written out with its two
   consequences (effective limit 5×N; cross-instance refresh retry → replay branch → family
   revoked → force-logout).
2. **`01-auth.md`**: §9 429 row flipped from "⚠️ no code" to `AUTH_TOO_MANY_REQUESTS` ✅ with the
   instance-local caveat; §13 rate-limit bullet updated likewise + register/refresh proposals
   still open; §16 "no error code for 429" row struck through as resolved (2026-09-08), and the
   grace-window row updated to **as-coded reality: Proposal A, G = 15s** (not the 30s proposal),
   in-memory `rotationCache`, with the owner-ratification gap and multi-instance consequence
   recorded.
3. **`.env.example`** — restored the missing API/auth/Gemini/web blocks (closes **API-005**) by
   reading every `config.get`/`process.env` consumer: `JWT_ACCESS_SECRET` (required, fail-fast),
   `JWT_ACCESS_TTL` (default 15m), `API_PREFIX`, `CORS_ORIGIN`, `GEMINI_API_KEY`,
   `NEXT_PUBLIC_API_URL`. Deliberately documents that `JWT_REFRESH_SECRET`, `JWT_REFRESH_TTL`,
   `BCRYPT_ROUNDS`, `COOKIE_DOMAIN`, `COOKIE_SECURE` are **not read** (opaque refresh tokens,
   fixed TTL/cost, `Secure` from `NODE_ENV`) — so nobody "restores" a dead var.
4. **`ai/context/project-brain.md` § Current Status** — rewritten to verified reality: 7/8 module
   specs accepted (01–06, 08; 07 proposed), 11 implemented API modules (Auth+rotation+rate-limit,
   Users approval, Classes/Enrollment, Lessons, Sessions, Payroll, Billing, Dashboard/Monitoring,
   Question Bank, Flashcards/SRS), last recorded suite 170/170@27, `turbo.json` merged, student
   area mid-migration per A01–A08 slice notes.
5. **`KNOWN_ISSUES.md`**: new **API-015** (no central env validation; `COOKIE_PATH` hardcoded at
   `/api/v1/auth` while the prefix is configurable → latent 15-minute-session-death divergence);
   new **API-016** (login limiter + rotation grace cache instance-local; scaling boundary);
   **API-005 → Resolved**; **DOC-006 narrowed** — ADR-015 settled the column as `nickname`, but
   the live register wire key is `fullName` (`RegisterDto` + FE form, mapped at
   `auth.service.ts:125`) and `API_AUTH.md` still shows `fullName` contra its own ADR; register
   key decision left to the owner with both options laid out.

**In progress** (and why it's unfinished):
- **API-015's code fix is NOT done** — it touches the refresh-token path (cookie path, env
  validation), which per `working-rules.md` needs explicit owner approval. Fix plan is fully
  specced in KNOWN_ISSUES: central fail-fast env validation at bootstrap, `API_PREFIX`
  normalization, `COOKIE_PATH` derived from the prefix constant. Nothing coded on this branch.
- **Finding "shared API transport types" (item 9)**: docs-only status recorded (PROGRESS § Needs
  from the other lane already tracks it); the `packages/types` implementation is its own branch
  by plan, not attempted here.

**Contract/temporary decisions to preserve**:
- `AUTH_TOO_MANY_REQUESTS` is agreed and emitted; generic `TOO_MANY_REQUESTS` remains
  *proposed, not agreed* — do not use it in code.
- Grace window **G = 15s** and **Proposal A** are as-coded facts, not owner-ratified ones; the
  30s in `01-auth.md` §8's original proposal was never what shipped.
- `.env.example` now documents implemented behavior; six vars from API-005's old list are
  intentionally absent because no code reads them. Making one configurable = code change first.
- DOC-006's remaining question is the **register wire key only** (DB column is settled by
  ADR-015).

**Needs from the other lane**:
- Owner decision: register key `fullName` (amend ADR-015) vs `nickname` (rename DTO + FE form +
  fix `API_AUTH.md`). Live wire contract shipped 2026-09-05 — not a silent rename.
- Owner approval + infrastructure decision for API-016's shared store (Redis or equivalent)
  before any multi-instance deployment.

**Blocker / needs follow-up**:
- Auth code (API-015 fix) blocked on owner approval only — nothing technical.
- Working tree hazard logged: the shared checkout carried **another agent's uncommitted CI work**
  (quality.yml, assert-ci-databases.mjs, eslint config, CI.md) when this session started mid-merge
  of PR #48. It was preserved untouched; this session worked in an isolated worktree
  (`../Real-docs-config-findings`) per `multi-agent-workflow.md` §5.

**Next steps**:
- Owner reviews this PR; if the API-015 code change is approved, it lands as its own small PR
  against `apps/api` with the full API suite as the gate.
- `packages/types` (finding 9) as its own follow-up task.
