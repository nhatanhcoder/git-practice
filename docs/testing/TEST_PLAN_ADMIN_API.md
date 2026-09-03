# Test Plan — Admin API

> Scope: the **Admin area backend** — module `01-auth` (shared foundation), module `02-users`,
> and the admin class-read endpoints. Written 2026-09-03 by an agent that did **not** write the
> code (cross-review per `multi-agent-workflow.md` §5).
>
> Code under test: branch `feat/student-hanlu-ui` @ `5e70873` (**unmerged** at writing time).
> The FE wiring commit `132323b` is out of scope here (rendering is covered by the Playwright
> screen matrix, not this plan).

---

## 1. How the tests actually run — authoritative

`TEST_STRATEGY.md` predates the implementation and is **stale on three points**: it says
Jest + Supertest (the code uses `node:test`), its example asserts `res.body.success` (the
envelope is flat — no `success` flag, `API_CONVENTIONS.md`), and it lists scripts that do not
exist (`test:watch`, `test:cov`, `test:e2e`). Until it is rewritten, **this section is the
source of truth**:

```bash
pnpm --filter api test
# = nest build && dotenv -e ../../.env -- node --import tsx --test test/*.test.ts
```

- Real Nest app booted per suite (`NestFactory.create`), listening on **port 0** — no
  collision with a dev server holding 3001.
- Real dev database: Docker `hsk-postgres` (5432) + MongoDB Atlas. Not mocks — the seams
  under test (guard ordering, envelope, citext, Prisma) are exactly what mocks would hide.
- Tests import from `../dist/src/…` — `nest build` runs first; decorator metadata stripping
  is why (see `API-009`).
- Prerequisite: seeded users (`pnpm --filter api db:seed`) — the suites read
  `admin@hsk.local`, `teacher@hsk.local`, `student@hsk.local`, `teacher.pending@hsk.local`,
  `student.suspended@hsk.local`, `mixed.case@hsk.local`.
- **Fresh-worktree gotcha (hit 2026-09-03):** after `pnpm install`, `prisma generate` failed
  with `Cannot find module …@prisma/engines/dist/index.js` — the pnpm store entry shipped
  without that file. `pnpm rebuild -r @prisma/engines` runs the postinstall but does **not**
  restore it. Fix: copy `dist/index.js` (343 bytes) from a healthy checkout, or force-refresh
  the store entry.

## 2. Existing suites (63 tests, 12 suites)

| File | Suites | Tests | Writes to DB? |
|---|---|---|---|
| `test/admin-users.e2e.test.ts` | access control · GET list · GET :id · error envelope | 23 | no (read-only) |
| `test/auth.e2e.test.ts` | register · login · refresh+replay · me · change-password/logout | 16 | yes — own users, cleaned up in `after()`; teacher password restored |
| `test/admin-user-lifecycle.e2e.test.ts` | approval lifecycle (INV-USERS-08..10) | 8 | yes — own `lifecycle.target@hsk.local`, deleted in `after()` |
| `test/teacher-classes.e2e.test.ts` | teacher classes (not admin scope — bonus) | 9 | yes — own teachers, cascade-deleted in `after()` |
| `test/teacher-lessons.e2e.test.ts` | teacher lessons (not admin scope — bonus) | 7 | yes — own teachers, cascade-deleted in `after()` |

All suites mint tokens through real login (lifecycle) or JWT minting against seed users
(read-only suites), and clean up after themselves — verified by three consecutive green runs
(§6).

## 3. Review findings — code vs specs

The specs are `docs/api/modules/01-auth.md` (accepted, 24 invariants) and
`docs/api/modules/02-users.md` (proposed, 18 invariants). Findings, worst first:

### Filed as issues

| ID | Severity | Finding |
|---|---|---|
| **API-011** | High | **Lifecycle transitions accept invalid source states.** `users.service.ts` `approve` blocks only `active` (so `suspended → active` via approve succeeds); `suspend` and `activate` have **no source-state check at all** — `pending → suspended`, `pending → active` (activate), and `active → active` (silent no-op) all return 200. Spec `02-users.md` §6 allows exactly `pending→active→suspended→active` and §15 locks "approve on suspended → 409, DB unchanged". The `pending → suspended` path is the worst: it gives Admin a way to remove pending accounts from the approval queue that the spec explicitly forbids (C3 story). Also unguarded: two concurrent approves both succeed (INV-USERS-15 wants exactly-once) — the fix is the same conditional `UPDATE … WHERE status = <expected>` for both problems. Blocked on the registry: there is no code for "suspend a pending user" / "activate an active user" (only `USER_ALREADY_APPROVED` exists). |
| **API-012** | Low | **Replay returns the wrong error code.** Spec INV-AUTH-11 + the registry say replay → `401 AUTH_REFRESH_INVALID`; `auth.service.ts` throws `AUTH_TOKEN_INVALID`. `AUTH_REFRESH_INVALID` is even defined in `error-codes.ts` — it is never used. The e2e test asserts the code's behavior (`AUTH_TOKEN_INVALID`), i.e. the test follows the code, not the spec. |
| **API-013** | Medium | **No `account_approved` / `account_suspended` notifications.** INV-USERS-13/14 require exactly-one notification per transition, in the same transaction. Nothing is implemented — the `Notification` table does not exist in the schema at all yet (module 07 is `proposed`). The two invariants are currently false in the running system. |
| **API-014** | Medium | **Admin class-read endpoints exist in code but in no doc.** `admin-classes.controller.ts` adds `GET /admin/classes` (list **all** classes system-wide) + `GET /admin/classes/:id` (any class + roster). `API_ADMIN.md` has no Class section; `RBAC_MATRIX.md` says Admin ❌ on Class read while module 03 §5 says 👁️ display-only — the code is a superset of both readings. Contract-first violation: endpoints before docs. |
| **DOC-015** | Low | **`TEST_STRATEGY.md` is stale** — Jest/Supertest vs actual `node:test`, `res.body.success` example contradicting the flat envelope, nonexistent scripts. This plan's §1 is the interim truth. |

### Deviations recorded, not filed (documented trade-offs or open decisions)

- **Rate limiting (INV-AUTH-21) absent, deliberately** — `error-codes.ts` documents why:
  `TOO_MANY_REQUESTS` is *proposed, not agreed* in the registry. The invariant is unenforced
  until the code is approved.
- **Concurrent-refresh grace window (INV-AUTH-22) absent** — two concurrent refreshes with
  the same cookie both succeed (good) but create **two** live child tokens (spec: exactly
  one). No family revocation happens (good). The race is unhandled.
- **`replacedById` written outside the transaction** (`auth.service.ts` refresh) — the audit
  link can be lost on a crash between the tx and the follow-up update. Bookkeeping only.
- **Logout returns `200 {message}`**, spec says `204` (INV-AUTH-16). Behavior (idempotent,
  clears cookie) matches; the status code does not.
- **`PATCH /auth/me` writes `nickname/avatarUrl/bio`**, spec INV-AUTH-19 says
  `nickname/email/avatarUrl` — email change absent (so INV-AUTH-20 trivially holds), `bio`
  added. All C1-adjacent (`register` likewise takes `fullName`, stores `nickname`).
- **Seed count discrepancy in HANDOFF** — claims "64/64 verified tests"; the suite is
  **63** tests (auth suite has 16, not 17). Cosmetic, but numbers in handoff docs should be
  paste-from-output.

### What the review found **good** (worth keeping as patterns)

- `jwt-auth.guard.ts` re-reads the caller's DB row per request with an explicit `select` —
  INV-AUTH-15 done properly, with the reasoning in a comment.
- Login runs a dummy bcrypt hash on unknown email — INV-AUTH-06 timing, done right.
- Register DTO `@Transform`s email to trim+lowercase before validation (INV-AUTH-04) and
  `@IsIn(['student','teacher'])` blocks admin self-registration (INV-AUTH-03).
- List endpoint: count + page in one `$transaction`, `id` tie-breaker on sort (INV-USERS-06/07).
- `whitelist + forbidNonWhitelisted` everywhere — unknown query params 400, not ignored.

## 4. Invariant coverage matrix

C = covered · P = partial · M = missing (testable now) · B = blocked (needs a decision/table)

### 01-auth (24 invariants) — 8 C · 9 P · 4 M · 3 B

| INV | St | Gap |
|---|---|---|
| 01 passwordHash never leaks | C | — |
| 02 bcrypt cost 12 | C | — |
| 03 register pending + role gate | C | — |
| 04 email unique after normalize | P | concurrent register + casing variants untested |
| 05 login only when active | C | — |
| 06 identical 401 both branches | C | timing distribution untested (acceptable) |
| 07 status only after password verified | M | wrong-password-on-pending not tested (code order correct by inspection) |
| 08 TTLs 15m/7d | P | expired access token tested; refresh expiry + fake clock not |
| 09 refresh via HttpOnly cookie only | P | body/header transport rejection not tested |
| 10 rotation atomic, one live token | P | rotation verified behaviorally; `COUNT(live)=1` + 5-chain not |
| 11 replay revokes family | P | replay 401 ✓; **code asserts wrong constant (API-012)**; family-dead not verified in DB |
| 12 family dead after revocation | M | newest-token-unusable not tested |
| 13 tokens stored hashed only | P | by inspection + UNIQUE; no direct test |
| 14 lastLoginAt only on login | M | no assertion anywhere |
| 15 per-request status check | C | guard tests (suspended token 403) |
| 16 logout idempotent | P | 200 vs 204 deviation; second-logout not tested |
| 17 change-password revokes all sessions | P | password swap ✓; second-device family revocation not |
| 18 atomicity of 17 | M | no forced-failure rollback test |
| 19 PATCH me whitelist | P | nickname ✓; stripping + field-set deviation (C1) |
| 20 email change rules | B | email not writable — blocked on C1 |
| 21 rate limit 5/15min | B | `TOO_MANY_REQUESTS` proposed, not agreed |
| 22 concurrent refresh ≠ replay | B | no grace window; race yields 2 live children |
| 23 flat envelope everywhere | C | — |
| 24 UTC ISO, null lastLoginAt | C | asserted in users suites |

### 02-users (18 invariants) — 8 C · 3 P · 4 M · 3 B

| INV | St | Gap |
|---|---|---|
| 01 admin + active only | C | — |
| 02 no passwordHash | C | — |
| 03 filters AND-combine | C | — |
| 04 out-of-enum filter → 400 | C | — |
| 05 q semantics | C | — |
| 06 total before pagination | C | — |
| 07 stable paging | C | — |
| 08 approve only from pending | P | happy + active→409 ✓; **suspended→active bug (API-011)** |
| 09 suspend only from active | P | happy ✓; pending→? **bug (API-011)** |
| 10 activate only from suspended | P | happy ✓; pending/active→? **bug (API-011)** |
| 11 no path back to pending | M | not exhaustively probed |
| 12 status ∈ 3 values | M | no DISTINCT sweep |
| 13 notification per transition | B | **not implemented (API-013)** |
| 14 status+notification same tx | B | same |
| 15 transitions exactly-once | M | no concurrency test; **no conditional update (API-011)** |
| 16 only status+updatedAt written | M | no before/after row snapshot |
| 17 404 vs malformed-uuid 400 | C | — |
| 18 UTC ISO | C | — |

## 5. Test backlog (prioritized)

**P0 — with the API-011 fix** (needs the registry owner to add codes for
"suspend a pending user" / "activate an active user", same style as API-010's three):
lifecycle negative branches for all three endpoints × invalid source states, each asserting
409 + DB unchanged; concurrent double-approve → one 200 one 409.

**P1 — testable against current code:**
INV-AUTH-11/12 (assert `AUTH_REFRESH_INVALID` after API-012 fix; verify family dead in DB),
INV-AUTH-14 (lastLoginAt: read before/after login/refresh/logout), INV-USERS-16 (row
snapshot around each PATCH), INV-AUTH-04 (concurrent register), INV-AUTH-17 (second-device
family revocation), INV-AUTH-19 (whitelist stripping probe).

**P2 — needs infrastructure:** fake-clock expiry tests (INV-AUTH-08), timing-distribution
test (INV-AUTH-06), grace-window design then test (INV-AUTH-22).

## 6. Results log

| Date | Commit | Environment | Result (verbatim) |
|---|---|---|---|
| 2026-09-03 | `5e70873` (`feat/student-hanlu-ui`, unmerged) | fresh worktree `D:\PersonalProject\Real-opencode`, Docker `hsk-postgres` (healthy), Atlas; agent independent of the code author | run 1: `ℹ tests 63 · suites 12 · pass 63 · fail 0 · duration_ms 16199` |
| 2026-09-03 | same | same | run 2: `ℹ tests 63 · pass 63 · fail 0` — cleanup verified idempotent |
| 2026-09-03 | same | same | run 3: `ℹ tests 63 · suites 12 · pass 63 · fail 0 · duration_ms 13078` |

Three consecutive green runs from a cold worktree. The author's HANDOFF entry says "64/64" —
the suite is 63 tests; the delta is one miscounted auth test.

## 7. FE note (out of scope, recorded so it is not forgotten)

`132323b` wired `/admin/users`, `/admin/users/[userId]` and `/admin/profile` to the real
API. The Playwright screen matrix (70/70, 2026-09-03) covers rendering only — real-API flows
(approve → user can log in, suspend → token dies mid-session) have no browser-level test yet;
the lifecycle e2e suite covers the API half.
