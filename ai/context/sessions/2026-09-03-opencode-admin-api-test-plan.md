## [2026-09-03] — Admin API review, test plan and independent 63/63 verification — opencode — branch `docs/admin-api-test-plan`

**Context**: owner asked to "review bên admin, lên test plan các thứ test rồi log lại". The
main checkout (occupied by a parallel Antigravity session doing FE teacher wiring) had just
landed the admin-area backend on `feat/student-hanlu-ui`: foundation `924f7fe`, auth
`a905fd7`, FE admin wiring `132323b`, teacher classes/lessons + admin approval `3984781`,
lifecycle tests `61f2db8`, HANDOFF "64/64" `5e70873`. All review work on that code was
**read-only**; the test run happened in my own worktree at `5e70873` (detached, then a docs
branch off `origin/main`).

**Done**:
- **Review** of the admin surface (auth module, admin users list/detail, lifecycle
  approve/suspend/activate, admin class-read endpoints) against `01-auth.md` (24 INV) and
  `02-users.md` (18 INV), both extracted verbatim by a research subagent.
- **Independent verification**: 3 consecutive full-suite runs in a cold worktree —
  `ℹ tests 63 · suites 12 · pass 63 · fail 0` each time (~13–16s; Docker `hsk-postgres` +
  Atlas). HANDOFF's "64/64" is a miscount (auth suite = 16 tests, not 17). Cleanup verified
  idempotent by the repeat runs.
- **Test plan written**: `docs/testing/TEST_PLAN_ADMIN_API.md` — how tests actually run
  (TEST_STRATEGY.md is stale), suite inventory, findings, both invariant coverage matrices
  (auth: 8 C / 9 P / 4 M / 3 B; users: 8 C / 3 P / 4 M / 3 B), prioritized backlog, run log.
  Plus `docs/testing/_INDEX.md` (the doc set had none).
- **Issues filed**: API-011 (lifecycle accepts invalid source states — approve-on-suspended,
  suspend-on-pending, activate-on-pending/active all 200; also no conditional update →
  concurrent double-approve race; High), API-012 (replay throws AUTH_TOKEN_INVALID, spec +
  registry say AUTH_REFRESH_INVALID — the constant exists in error-codes.ts, unused),
  API-013 (account_approved/account_suspended notifications not implemented; no
  Notification table), API-014 (GET /admin/classes + /:id in code, in no doc; superset of
  both the RBAC-matrix ❌ and module-03 👁️ readings), DOC-015 (TEST_STRATEGY.md stale:
  Jest/success-flag/nonexistent scripts).
- Not filed, recorded in the plan: rate limiting absent (deliberate — TOO_MANY_REQUESTS is
  *proposed*), no concurrent-refresh grace window (2 live children on a race), replacedById
  written outside the tx, logout 200 vs 204, PATCH /auth/me field set (C1-adjacent).

**Method notes**:
- Fresh-worktree gotcha hit and documented: `pnpm install` left `@prisma/engines` without
  `dist/index.js`; `pnpm rebuild -r` did not restore it; copying the 343-byte file from a
  healthy checkout did. In the plan §1 so the next cold worktree doesn't rediscover it.
- The review credits good patterns explicitly (per-request DB status check in the guard,
  dummy bcrypt on unknown email, email normalization in the DTO, pagination tx + id
  tie-breaker) — a review that only lists sins teaches the wrong lessons.

**In progress** (and why it's unfinished):
- Nothing of this task. Related follow-ups live in the issue list (see below).

**Contract/temporary decisions to preserve**:
- KNOWN_ISSUES numbering across branches: API-008/009/DOC-013 on `feat/student-hanlu-ui`
  (unmerged), API-010/DOC-014 on PR #29, API-011..014/DOC-015 here. No ID reused; a
  numbering note sits in the file.
- Process deviation, stated: claim-before-code was skipped — the work was read-only review +
  a docs branch; no lane was contested (Antigravity owns apps/web FE wiring, this PR touches
  only docs + ai/).

**Needs from the other lane**:
- (opencode → owner) API-011's fix needs registry codes for "suspend a pending user" /
  "activate an active user" (same sign-off style as API-010's three).
- (opencode → BE owner) API-012 one-line fix + API-014 scope decision (document or remove
  the admin class-read endpoints).

**Blocker / needs follow-up**:
- API-011 (High) — invalid lifecycle transitions are live on the unmerged branch; fix before
  merge if possible.
- The teacher classes/lessons implementation (3984781) has NOT been reviewed against the
  teacher spec set (PR #29) — different scope, needs its own pass.

**Next steps**:
1. Merge PR #29 (teacher specs) and this PR.
2. Owner decides API-011's codes → fix + P0 tests from the plan's backlog.
3. Reconcile the teacher classes/lessons code with the teacher specs (separate review).
