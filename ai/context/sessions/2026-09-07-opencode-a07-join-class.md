## [2026-09-07] — A07: join-class modal wired to the real API — opencode — branch `codex/a07-student-join-class`

**Context**: task A07 from `docs/prompts/student-integration-checklist.md`. Dependencies
checked first: A07 needs A06 — A06 is coded (`codex/a06-student-classes-list` @ `2f12310`,
PROGRESS ✅) but has **no PR and is not merged**, so this branch stacks on it with the
stack explicitly reported (same precedent as A05 stacking on A04). A08 (detail) and A09
(leave) are untouched — the user's initial "Làm A09" was stopped at the dependency check
and redirected here per the checklist's dependency rules.

**Done** — `commit abf6def`, FE only, no backend/schema/Auth/RBAC change:

- `classes-rules.ts`: `normalizeJoinCode` (trim + uppercase, exactly JoinClassDto's
  Transform), `validateJoinCode` (charset before length; the DTO's own Vietnamese
  messages via `JOIN_CODE_MESSAGES`), `joinFailureMessage` (registry code → message for
  the 4 codes the contract lists; unknown codes get a generic failure, never a borrowed
  cause).
- `classes-service.ts`: `joinClassByCode` → `POST /student/classes/join`, payload exactly
  `{ enrollmentCode: normalizeJoinCode(rawCode) }` (userId never travels — it is the
  token's job); `describeJoinFailure` (ApiError.code → registry message; no HTTP answer →
  network wording). `JoinResult` typed from the server's real `toEnrollmentResult`.
- `/student/classes` page: the A06 "connecting in A07" placeholder modal is now the real
  form — uppercase input, Enter submits, ref lock (`joinLock`) against double-submit,
  success only after the server confirms (toast + close + refetch), failure keeps the
  input with the mapped message inline, no local fake class. Rejoin (server §8.1 rule)
  is plain success to the FE.
- Fixed the two TEST A06 findings that live on this page: modal CSS literals with
  nonexistent tokens (`--surface-muted`/`--fg-muted` slate fallbacks breaking dark theme)
  are gone along with the placeholder; the `PageHead` sub no longer shows empty-state
  copy while the list failed.
- Tests: 17 new in `student-join.test.mjs` (normalization, shape incl. Cyrillic
  look-alike and interior-space cases, registry mapping incl. unknown-code fallback,
  payload/wiring, no-fake-success, ref-lock); the stale A06 "join unavailable pending
  A07" assertion now checks the real wiring instead.

**Environment note**: `ts-resolution-loader.mjs` (needed to import `api-client` from
node tests) exists only on codex's unmerged A02-followup branch, so `describeJoinFailure`
glue is file-asserted while its delegate logic is runtime-tested — noted in the test file.

**Verification**: `node --test apps/web/scripts/*.test.mjs` **101/101** ·
`node scripts/check-docs.mjs` **8/8** · `pnpm --filter web build` clean
(`/student/classes` 7.86 kB).

**Blocker / needs follow-up**:
- **Live self-test BLOCKED**: Docker engine down → no local Postgres → API cannot start.
  NOT RUN (not PASS): join with a valid fixture code → enrollment survives reload →
  teacher roster shows the student; double-click in a real browser; offline handling.
  Re-run when Docker is up. Network mocks were NOT used to claim any of these.
- A06 still has no PR — whoever merges must merge A06 first (this PR is stacked on it).

**Next steps**:
- Review/merge A06's branch, then this PR, then A08 (detail — where A09's leave lives).
