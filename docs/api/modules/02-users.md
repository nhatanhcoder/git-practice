---
module: Users / Admin Users
status: proposed
blocked_by: C1 (nickname vs fullName) · C3 (missing `rejected` state → needs account-lifecycle ADR + migration)
owner: -
last_updated: 2026-08-19
---

## 0. Summary

Account management from the Admin side: list / view user details and control the `User.status`
lifecycle through 3 actions: approve · suspend · activate. Boundary: this module **only reads**
other users' profiles and **writes exactly one field**, `status` (+ `updatedAt`); every
self-service action (rename, avatar, password) belongs to the Auth module (`PATCH /auth/me`,
`POST /auth/change-password`), not here. The module does not create users — registration is
self-service; it does not delete users — no DELETE endpoint.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `User` | Read + Write | Writes **only** `status`, `updatedAt`. Reads: `id, email, role, status, nickname, avatarUrl, hskLevelGoal, bio, lastLoginAt, createdAt, updatedAt`. **Never select `passwordHash`** |
| `Notification` | Write (INSERT) | `account_approved`, `account_suspended`. Append-only, no update/delete |
| `Class` | Read (blocked) | "Classes teaching" panel on the teacher detail page — shape not locked, see §16 |
| `ClassEnrollment` | Read (blocked) | "Classes joined" panel on the student detail page — not locked |
| `ClassSession` | Read (blocked) | "Sessions" panel on the teacher detail page — not locked |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/api/v1/admin/users` | admin | User list, filter by `role` + `status` + search, paginated | defined (API_ADMIN.md) |
| GET | `/api/v1/admin/users/:id` | admin | Single user detail | defined (path) / **proposed (response shape)** — the embedded history part is not defined in API_ADMIN.md |
| PATCH | `/api/v1/admin/users/:id/approve` | admin | Approve an account in `pending` → `active` | defined |
| PATCH | `/api/v1/admin/users/:id/suspend` | admin | Lock an account in `active` → `suspended` | defined (path) / **proposed (request body)** — FE mandates a "Lock reason" input, API_ADMIN.md defines no body |
| PATCH | `/api/v1/admin/users/:id/activate` | admin | Unlock an account in `suspended` → `active` | defined |

There is no `POST /admin/users`, no `PATCH /admin/users/:id` (profile edit), no
`DELETE /admin/users/:id`. The three PATCH routes above are **all** of the Admin's write
capability over other accounts.

## 3. DTO

### Request

**GET /admin/users** — query params:

| Field | Type | Required | Validation constraint |
|---|---|---|---|
| `role` | enum string | no | ∈ `admin` \| `teacher` \| `student`. Any other value → `VALIDATION_ERROR`. Not sent = no role filter |
| `status` | enum string | no | ∈ `pending` \| `active` \| `suspended`. Any other value → `VALIDATION_ERROR`. Not sent = no status filter |
| `q` | string | no | trim, length 1–100 after trim; empty after trim ⇒ treated as not sent. Case-insensitive substring match on `nickname` OR `email`. ⚠️ Param name not locked: FE contract uses `q`, API_ADMIN.md describes it as "search" — see §16 |
| `page` | int | no | ≥ 1, default `1` |
| `limit` | int | no | ≥ 1, default `20`, cap `100` (**proposed** — API_CONVENTIONS.md specifies no cap) |
| `sortBy` | enum string | no | **proposed** — ∈ `createdAt` \| `lastLoginAt`, default `createdAt`. FE only allows sorting by these 2 columns |
| `order` | enum string | no | **proposed** — ∈ `asc` \| `desc`, default `desc` |

**GET /admin/users/:id** · **PATCH .../approve** · **PATCH .../activate** — path param `id`
(uuid, `VALIDATION_ERROR` if malformed). No body.

**PATCH /admin/users/:id/suspend** — path param `id` (uuid). Body: **not locked**. The FE spec
mandates a "Lock reason" textarea (submit disabled when empty) but (a) API_ADMIN.md defines no
body, (b) `User` has no field to store a reason. Don't invent a field name here — see §16.

### Response

**GET /admin/users** → `200`

```
{
  "data": [ AdminUserListItem, ... ],
  "meta": { "total": 150, "page": 1, "limit": 20, "totalPages": 8 }
}
```

`AdminUserListItem`:

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | no | |
| `email` | string | no | |
| `role` | `admin`\|`teacher`\|`student` | no | |
| `status` | `pending`\|`active`\|`suspended` | no | |
| `nickname` | string | yes | ⚠️ C1 — see §16 |
| `avatarUrl` | string | yes | |
| `createdAt` | DateTime UTC ISO 8601 | no | |
| `lastLoginAt` | DateTime UTC ISO 8601 | yes | `null` when never logged in |

**GET /admin/users/:id** → `200` — `{ "data": AdminUserDetail }`. `AdminUserDetail` =
`AdminUserListItem` + `hskLevelGoal` (int, nullable, only meaningful for `student`) + `bio`
(text, nullable, only meaningful for `teacher`) + `updatedAt`.
⚠️ The role-scoped history (`enrollments[]`/`attempts[]` for student, `classes[]`/`sessions[]`
for teacher) that FE asks for **is not in the API spec** → not defined here, currently blocking (§16).

**PATCH .../approve|suspend|activate** → `200` — `{ "data": AdminUserDetail }`.
⚠️ The FE contract records the envelope as `data.user` (one extra wrapper layer).
API_CONVENTIONS.md says `{ "data": {...} }`. This spec follows API_CONVENTIONS.md (the normative
source) and records the discrepancy in §16.

`passwordHash` **never appears** in any response DTO above.

## 4. Business rules (invariants)

| ID | Statement |
|---|---|
| **INV-USERS-01** | Every endpoint of the module runs only when the actor has `role = admin` **and** `status = active`; every other actor is refused before any user data is queried. |
| **INV-USERS-02** | No response, no log, no error `details` of the module contains `passwordHash`. |
| **INV-USERS-03** | The `data[]` of `GET /admin/users` contains only users satisfying **all active filters at once** (`role` AND `status` AND `q`); no record outside the filter set leaks into the result. |
| **INV-USERS-04** | A `role`/`status` value outside the enum fails the request with `VALIDATION_ERROR`; the system **does not** silently ignore the bad filter and return a broader set. |
| **INV-USERS-05** | `q` matches case-insensitive substrings on `nickname` **or** `email`; `q` not sent or empty after trim ⇒ no keyword filter. |
| **INV-USERS-06** | `meta.total` = number of records matching the filters **before** pagination; `meta.totalPages = ceil(total / limit)`; `data.length ≤ limit`. |
| **INV-USERS-07** | Sort order is total and stable (always has an `id` tie-breaker), so walking all pages yields each record exactly once — no duplicates, no gaps. |
| **INV-USERS-08** | `approve` only succeeds when the current `status` is `pending`; on success the resulting `status` is always `active`. |
| **INV-USERS-09** | `suspend` only succeeds when the current `status` is `active`; on success the resulting `status` is always `suspended`. |
| **INV-USERS-10** | `activate` only succeeds when the current `status` is `suspended`; on success the resulting `status` is always `active`. |
| **INV-USERS-11** | No path exists that returns `status` to `pending` after leaving it — `pending` is a one-way gate. |
| **INV-USERS-12** | `User.status` always belongs to `{pending, active, suspended}`; no fourth value is ever written to the DB through this module. |
| **INV-USERS-13** | Each successful status transition produces **exactly one** `Notification` for **exactly the affected user**: `approve` → `account_approved`, `suspend` → `account_suspended`. `activate` produces no Notification (no matching type). |
| **INV-USERS-14** | The `status` change and the `Notification` INSERT are in **the same transaction**: if either part fails, both roll back — no "status changed but notification missing" state or the reverse. |
| **INV-USERS-15** | Duplicate or concurrent requests on the same `:id`: `status` changes exactly once and a Notification is created exactly once; the second request ends in a conflict error, not a second side effect. |
| **INV-USERS-16** | The module only writes `status` and `updatedAt`; `email`, `role`, `nickname`, `avatarUrl`, `hskLevelGoal`, `bio`, `passwordHash`, `createdAt`, `lastLoginAt` are immutable across every endpoint of the module. |
| **INV-USERS-17** | A nonexistent `:id` always yields `404 USER_NOT_FOUND`; never `200` with an empty/null body. |
| **INV-USERS-18** | Every DateTime returned is UTC ISO 8601; `lastLoginAt = null` when the user has never logged in successfully. |

## 5. Ownership / RBAC

RBAC_MATRIX.md: `User · list all` = ✅ Admin, ❌ Teacher, ❌ Student. `User · approve / suspend` =
✅ Admin, ❌ Teacher, ❌ Student. **No ownership rule** — Admin sees every user, every role.

Two-layer check (guard **and** service), not just `@Roles`:

| Layer | Condition | On failure |
|---|---|---|
| Guard | `req.user.role === 'admin'` | `403 AUTH_INSUFFICIENT_ROLE` |
| Service (mandatory, non-negotiable) | `actor.status === 'active'` — a suspended admin with a still-live token must still be blocked | `403 AUTH_ACCOUNT_SUSPENDED` |
| Service | `target = SELECT ... WHERE id = :id` — exists? | `404 USER_NOT_FOUND` |
| Service | `target.status` matches the valid source state of the action (§6) | §9 |

**Filtering by `status`/`role` is a data boundary, not a UI convenience → MUST BE TESTED.** A
wrong filter here is not a display bug but a data-set leak: a silently ignored filter pushes
`pending`/`suspended` accounts into a list the Admin believes is filtered, and the Admin will act
on the wrong rows (wrong approvals, wrong locks). Two layers must be tested: (a) a correct filter
returns **only** the correct set (INV-USERS-03); (b) an out-of-enum filter **fails rather than
widening** the set (INV-USERS-04).

## 6. State machine

`User.status` — three states, exactly three valid transitions.

```
   register (Auth module, outside this spec's scope)
        │
        ▼
   ┌─────────┐   approve    ┌────────┐   suspend    ┌───────────┐
   │ pending │ ───────────► │ active │ ───────────► │ suspended │
   └─────────┘              └────────┘ ◄─────────── └───────────┘
        │                              activate
        └── (no other way out — see C3 in §16)
```

| From | To | Action | Valid? |
|---|---|---|---|
| `pending` | `active` | approve | ✅ |
| `active` | `suspended` | suspend | ✅ |
| `suspended` | `active` | activate | ✅ |
| `pending` | `suspended` | — | ❌ No endpoint. `suspend` requires source `active` |
| `pending` | `pending` | approve repeat | ❌ Conflict, not a no-op |
| `active` | `active` | approve / activate | ❌ Conflict |
| `active` | `pending` | — | ❌ Does not exist. Approval is a **one-way gate** |
| `suspended` | `pending` | — | ❌ Does not exist |
| `suspended` | `suspended` | suspend repeat | ❌ Conflict |
| any | `rejected` | — | ❌ **State `rejected` DOES NOT EXIST** in the enum |

**One-way gate**: `pending` only exits, never re-enters. Direct consequence: an account approved
by mistake **cannot** go back to the review queue; the only correction path is
`active → suspended`, i.e. stamping the "locked for violation" meaning onto the "wrongly
approved" case. The spec records this consequence; it does not fix it itself.

**⚠️ Contradiction C3 — the enum has no `rejected`.** `User.status` only has
`pending | active | suspended` (ENTITY_USER + _FACTS). Since `pending → suspended` is invalid and
`rejected` does not exist, the system currently **has no way to represent "reject a
registration"**: a rejected profile can only sit in `pending` forever and stay in the Admin queue
permanently. "Decision 5" proposes adding `rejected` but needs an enum migration + ADR. This spec
**does not add the state itself and does not pick a workaround** — see §16.

## 7. Transaction boundary

**GET** (list + detail): read-only, no explicit transaction needed. `READ COMMITTED` (PostgreSQL
default) is enough. The `total` counting query and the `data[]` fetch run in the same read
snapshot so `meta.total` does not drift from the page being returned (a small drift is acceptable
if not wrapped — if you choose not to wrap, record that this is accepted).

**PATCH** (approve / suspend / activate): **a single transaction**, `READ COMMITTED` + row lock
(no `SERIALIZABLE` needed), exactly 4 steps:

1. `SELECT ... FROM "User" WHERE id = :id FOR UPDATE` (or the guarded UPDATE in §8) — lock the target row.
2. Check `status` source is valid per §6 → if not, throw, transaction rolls back, no side effects.
3. `UPDATE "User" SET status = <target>, "updatedAt" = now() WHERE id = :id`.
4. `INSERT INTO "Notification" (...)` — for approve/suspend. For activate: skip step 4.

Constraint: **steps 3 and 4 must not be split across transactions** (INV-USERS-14). Every
side effect outside the DB (push/websocket/email if added later) must run **after commit**, not
inside the transaction.

## 8. Idempotency & concurrency

**Duplicate requests** — this module is **deliberately non-idempotent** and that is a conscious
choice: a second `approve` on an already-`active` user returns `409 USER_ALREADY_APPROVED` (per FE
contract), not a `200` no-op. Reason: Admin needs to know someone else already handled this row.
Good consequence: Notifications are never duplicated because the second request never reaches the
INSERT step. No `Idempotency-Key` header (not in API_CONVENTIONS.md).

**Two concurrent requests on the same `:id`** — no unique constraint protects the status
transition (`UNIQUE(email)` is unrelated), so **locking is mandatory**; the unlocked
read-then-write pattern is forbidden:

- **Mandatory**: guarded UPDATE — `UPDATE "User" SET status='active', "updatedAt"=now() WHERE
  id=:id AND status='pending'` then check `rowCount`. `rowCount = 1` ⇒ we won the race, proceed
  to INSERT Notification. `rowCount = 0` ⇒ either the user does not exist or someone else already
  changed the status ⇒ re-read to distinguish `404` from conflict, roll back, **do not** INSERT
  Notification.
- Acceptable equivalent: `SELECT ... FOR UPDATE` then check inside the transaction.
- **Forbidden**: `findUnique` → status check at the service layer → `update` without any
  lock/guard. This pattern lets two requests both win and produce two `account_approved`.

**Lock**: row lock on `User.id`, held for the whole §7 transaction. No table lock, no advisory
lock.

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| Missing/broken access token | 401 | `AUTH_TOKEN_EXPIRED` | in API_ERROR_CODES.md |
| Actor not admin | 403 | `AUTH_INSUFFICIENT_ROLE` | exists |
| Actor is admin but `suspended` | 403 | `AUTH_ACCOUNT_SUSPENDED` | exists |
| `role`/`status`/`page`/`limit`/`id` malformed or out of enum | 400 | `VALIDATION_ERROR` (+ `details`) | exists |
| `:id` does not exist | 404 | `USER_NOT_FOUND` | exists |
| `approve` when user already `active` (or `suspended`) | 409 | `USER_ALREADY_APPROVED` | ⚠️ present in API_ERROR_CODES.md §User Errors and in the FE contract, **but missing from the verified list of `_FACTS.md`** → needs confirmation before coding |
| `suspend` when user is `pending` or already `suspended` | 409 | **NO CODE YET** | ⛔ blocking — see §16 |
| `activate` when user is `pending` or already `active` | 409 | **NO CODE YET** | ⛔ blocking — see §16 |
| Unforeseen error | 500 | (no dedicated code) | — |

**Do not invent new codes.** The two ⛔ rows above are real gaps in the registry:
`USER_ALREADY_APPROVED` only covers the approve branch; no symmetric code exists for
suspend/activate. Do not reuse `VALIDATION_ERROR` as a stopgap (this is a business-rule
violation, not a DTO error) and do not reuse `USER_ALREADY_APPROVED` for the suspend branch (wrong
semantics; FE would show the wrong message).

Error envelope per API_CONVENTIONS.md — flat, with `statusCode`, `error` (string reason phrase),
`message`, `code`, `timestamp`, `path`; `details` **only** appears on `VALIDATION_ERROR`; no
`success` flag.

## 10. Side effects & notifications

| Action | Notification.type | Recipient (`Notification.userId`) | Record count | Notes |
|---|---|---|---|---|
| `PATCH .../approve` succeeds | `account_approved` | the user just approved | 1 | Same transaction as the status UPDATE |
| `PATCH .../suspend` succeeds | `account_suspended` | the user just locked | 1 | Same transaction. `payload` **may** hold the lock reason — but the request body is not locked (§16), so the key name is not locked either |
| `PATCH .../activate` succeeds | **none** | — | 0 | The Notification enum has no "unlock" type. Do not reuse `account_approved` (wrong semantics: this user was never re-approved). Recorded as a gap; no type added on our own |
| New registration, `role = teacher` | `new_teacher_registration` | **every** user with `role = admin` and `status = active` (fan-out of N records) | N | Produced by the **Auth module** (`POST /auth/register`), not this module. Recorded here because it is the source feeding the `status = pending` queue that `GET /admin/users?status=pending` serves |
| New registration, `role = student` | `new_student_registration` | as above | N | as above |

**GET** produces no side effects (no read-marking, no audit written to Notification).

`referenceId` / `referenceType`: purpose is deep-linking. For `account_approved` /
`account_suspended` the referenced object is the user itself. But ENTITY_NOTIFICATION lists
`referenceType` ∈ `assignment`/`attempt`/`invoice`/`session` — **no `user`**. Not locked (§16);
for now leaving both `null` is the only safe option that doesn't invent an enum value.

**Side effects beyond Notification**: `suspend` must make every live token of that user get
rejected (ENTITY_USER: "`status = suspended` → all JWT tokens rejected"). Mechanism = status check
per request in the Auth module's guard, not a write responsibility of this module.
⚠️ ENTITY_USER says the return code is `401`, while API_ERROR_CODES.md says
`AUTH_ACCOUNT_SUSPENDED = 403` — mismatch, recorded in §16.

## 11. Index & query

| Purpose | Proposed index | Notes |
|---|---|---|
| Filter `status` + `role` + sort `createdAt` | `INDEX ("role", "status", "createdAt" DESC)` | Covers the most common filter combo of the screen (review queue: `status=pending`) |
| Filter only `status` | prefix of the above (if column order flipped to `("status","role","createdAt" DESC)` it optimizes the `pending` queue) | Choose column order by the real queries; measure before locking |
| Sort `lastLoginAt` | `INDEX ("lastLoginAt" DESC NULLS LAST)` | FE allows sorting by this column |
| Search `q` | `pg_trgm` + `GIN INDEX ON lower(nickname) gin_trgm_ops`, `GIN INDEX ON lower(email) gin_trgm_ops` | `ILIKE '%q%'` has a leading wildcard ⇒ **B-tree is useless**. Without trgm every search is a full-table seq scan |
| Unique email | already exists (`UNIQUE(email)`) | Not part of this change |

**Queries & risks**

- Pagination: `COUNT(*)` + `SELECT ... LIMIT/OFFSET` with **`ORDER BY <sortBy> <order>, id ASC`**
  — the `id` tie-breaker is mandatory (INV-USERS-07); without it, records sharing a `createdAt`
  jump between pages.
- `SELECT` must **list columns explicitly**, no `SELECT *` / no raw entity return — this is the
  technical barrier for INV-USERS-02.
- **N+1**: the list endpoint joins nothing extra (no class counts, no submission counts) ⇒ no
  N+1. The N+1 risk sits in `GET /admin/users/:id` if role-scoped history is embedded — it must
  be fetched with a fixed number of queries (1 query/panel), never looped per row. That part is
  currently blocked (§16).
- Large `OFFSET` gets slow on a big user table; accepted at current scale, recorded as tech debt.

## 12. Migration & seed

**Migration**: this module **needs no new schema migration** — the `status` enum
(`pending|active|suspended`) and every used field already exist. One migration **only adding
indexes** (§11) is needed, including `CREATE EXTENSION IF NOT EXISTS pg_trgm` and the
composite/GIN indexes; use `CREATE INDEX CONCURRENTLY` when running against a populated DB.

Two migrations **may arise but are blocked** — must not be written before an ADR:
- Adding the `rejected` value to the `User.status` enum (C3) — enum change + updating every guard
  that reads status.
- Adding storage for the lock reason (suspend reason) — `User` has no field today;
  `Notification.payload` is a candidate but nobody has locked it.

**Seed for testing**:
- ≥ 1 `active` admin (the API actor, also a recipient of `new_*_registration`).
- Full `role × status` matrix coverage: teachers/students in each of `pending`, `active`,
  `suspended` (≥ 6 records) + 1 `suspended` admin to test INV-USERS-01's locked-actor branch.
- ≥ 1 user with `lastLoginAt = null` (INV-USERS-18) and ≥ 1 with a non-null `lastLoginAt`.
- ≥ 25 users total to test real pagination (page 2, `totalPages`, `limit` boundaries).
- A pair of users with **identical** `createdAt` to test the tie-breaker (INV-USERS-07).
- A set of `nickname`/`email` values with Vietnamese diacritics and mixed case to test `q`
  case-insensitivity (INV-USERS-05).

## 13. Security & rate limit

**Sensitive data — NEVER exposed:**

- **`passwordHash` NEVER appears in any response of this module** — not in the list, not in the
  detail, not in approve/suspend/activate responses, not in error `details`, not in logs, not in
  traces/APM spans. This is INV-USERS-02 and a merge-blocking condition, not a recommendation.
- How to guarantee (mandatory, not optional): the query layer uses **explicit column lists**; raw
  entity objects are never returned to the controller; response DTOs are an allow-list, not a
  deny-list (a new field added to `User` must not auto-leak into the API).
- Same principle for any future secret added to `User` (refresh-token hash, MFA secret...).

**Permissions**: Admin has **no** path to change another user's password, email or profile — the
module deliberately has no such endpoint (INV-USERS-16). No account-deletion endpoint.

**Rate limit**: API_CONVENTIONS.md doesn't prescribe one (only `429 Too Many Requests` in the HTTP
status table). **Proposed**, needs locking: GET list/detail ~60 req/min/admin; PATCH ~30
req/min/admin. These figures are suggestions, not approved.

**Audit**: every status change must be traceable as "who did it, when, from which state to which
state". Currently **no AuditLog table** exists in the entity list ⇒ only application logs (§14)
remain, no durable DB evidence. Recorded as a gap in §16.

## 14. Observability

**Logs** (structured, one line per successful PATCH): `requestId`, `actorUserId`, `targetUserId`,
`action` (approve|suspend|activate), `fromStatus`, `toStatus`, `notificationCreated` (bool),
`durationMs`. Also log **failure branches** with `code` (especially conflict branches — they
indicate two admins processing the same row). Never log raw bodies/entities (§13).

**Metrics**: count by `action` × outcome (success/conflict/not_found/forbidden); p95 latency of
`GET /admin/users` split by "with `q`" / "without `q`" (the trgm query is the expected slow
point); queue size `COUNT(*) WHERE status='pending'` (business indicator: a growing queue = Admin
not keeping up, or a symptom of C3 — rejected profiles stuck forever).

**Alerts**: conflict rate spike; list p95 over threshold; any 500 on the PATCH branch (suspected
transaction rollback).

## 15. Test matrix

This is the **invariant gate**: every INV in §4 must have at least one row here. A missing row =
no merge.

| INV | Test type | Description |
|---|---|---|
| INV-USERS-01 | integration | Call all 5 endpoints with a teacher token → 403 `AUTH_INSUFFICIENT_ROLE`; with a student token → 403; no token → 401. Plus: an admin with `status=suspended` but a valid token → 403 `AUTH_ACCOUNT_SUSPENDED` |
| INV-USERS-02 | integration | Serialize every response of all 5 endpoints to a string, assert it **does not contain** the `passwordHash` key or the seed's hash string. Repeat for error branches (404/409) and assert logs contain no hash |
| INV-USERS-03 | real DB | Seed the full `role × status` matrix; for each filter combo (`role`, `status`, `role+status`, `+q`) assert every `data[]` element matches the filter **and** the element count matches a control query run directly on the DB |
| INV-USERS-04 | integration | `?role=teachers`, `?status=rejected`, `?status=REJECTED`, `?role=` → 400 `VALIDATION_ERROR`, `details` names the right field. Assert **no** 200 with an unfiltered list |
| INV-USERS-05 | real DB | `q` with different casing still matches; matches on both `nickname` and `email`; a mid-string substring still matches; `q=""`/`q="  "` ⇒ result identical to sending no `q` |
| INV-USERS-06 | real DB | Seed 25 users; `limit=10` → `total=25`, `totalPages=3`, `data.length=10`; last page `data.length=5`; with a filter on, `total` reflects the filtered set, not the table total |
| INV-USERS-07 | real DB | Seed records with duplicate `createdAt`; walk all pages, collect `id`s → assert the collected set = the seeded set, no duplicates, no gaps. Repeat for `sortBy=lastLoginAt` (with null values) |
| INV-USERS-08 | service + integration | approve on `pending` → 200, `status='active'` in DB. approve on `active` → 409, DB unchanged. approve on `suspended` → 409, DB unchanged |
| INV-USERS-09 | service + integration | suspend on `active` → 200, `status='suspended'`. suspend on `pending` → conflict error, DB unchanged. suspend on `suspended` → conflict error *(⚠️ no error code yet — test locks HTTP 409 + DB unchanged; lock `code` after §16 is resolved)* |
| INV-USERS-10 | service + integration | activate on `suspended` → 200, `status='active'`. activate on `pending` → conflict. activate on `active` → conflict. DB unchanged in the last two branches *(same error-code note as above)* |
| INV-USERS-11 | integration | Exercise all 5 endpoints × every source state; assert **no** combination yields `status='pending'` after the user left `pending` |
| INV-USERS-12 | real DB | After the full test suite, `SELECT DISTINCT status FROM "User"` ⊆ `{pending, active, suspended}`. Try writing `rejected` via the API → no path can do it |
| INV-USERS-13 | real DB | approve → exactly 1 `Notification` type `account_approved`, `userId` = the affected user (not the admin). suspend → exactly 1 `account_suspended`. activate → **0** new Notifications. Assert both count and recipient |
| INV-USERS-14 | real DB | Force the Notification INSERT to fail (mock/constraint) → assert `User.status` **is still the old value** after rollback and no orphan Notification. Reverse: force the UPDATE to fail → no Notification written |
| INV-USERS-15 | real DB (concurrency) | Fire 2 concurrent approve requests on the same `:id` → exactly 1 returns 200, the other returns conflict; `COUNT(Notification WHERE type='account_approved' AND userId=:id) = 1`. Repeat for suspend and activate. Sequential test: calling again the 2nd time → 409, no second Notification |
| INV-USERS-16 | real DB | Snapshot the full `User` row before/after each PATCH; assert **only** `status` and `updatedAt` differ; `email`, `role`, `nickname`, `avatarUrl`, `hskLevelGoal`, `bio`, `passwordHash`, `createdAt`, `lastLoginAt` stay unchanged |
| INV-USERS-17 | integration | Valid uuid that doesn't exist → 404 `USER_NOT_FOUND` on all 4 endpoints with `:id`; assert never a 200 with `data: null`. Malformed uuid → 400 `VALIDATION_ERROR` (clearly distinguish the two branches) |
| INV-USERS-18 | integration | Every DateTime field in the response matches the ISO 8601 UTC regex (ends with `Z`); a user who never logged in → `lastLoginAt === null` (not empty string, not epoch 0) |

Beyond the invariant gate (not replacing the rows above): test the error envelope has the flat
shape of API_CONVENTIONS.md (`details` only on `VALIDATION_ERROR`, no `success` flag).

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| **C1 — `nickname` or `fullName`?** ENTITY_USER + _FACTS define the field as `nickname`; API_AUTH `POST /auth/register` and `PATCH /auth/me` accept `fullName`. Are these two names of one field, or two different fields? | Blocked: locking the response DTO of **all 5 endpoints** (the "User" column of the table and the detail-page header read this field), the `q` search field (INV-USERS-05 currently assumes searching on `nickname`), the FE-BE contract. If `fullName` is locked, a column-rename migration + every DTO update follows | - | before coding `GET /admin/users` |
| **C3 — missing `rejected` state.** `User.status` only has `pending\|active\|suspended`. "Decision 5" proposes adding `rejected` → needs enum migration + ADR | Blocks §6 (the state machine has no way out for rejected profiles — they sit in `pending` forever and bloat the Admin queue), the migration, the valid values of the `?status=` filter, INV-USERS-12. Do not add the state ourselves, do not substitute `suspended` | - | before coding the approve endpoint |
| **Body of `PATCH .../suspend`.** FE mandates a "Lock reason" input but API_ADMIN.md defines no body and `User` has no field to store the reason (`Notification.payload` is a candidate) | Blocks the suspend request DTO, the `payload` of `account_suspended` (§10), possibly the migration | - | before the suspend coding sprint |
| **Missing error codes for wrong suspend/activate transitions.** The registry only has `USER_ALREADY_APPROVED`; no symmetric code for "suspend a pending user" / "activate an active user" | Blocks §9 and the 2 test rows INV-USERS-09 / INV-USERS-10 (currently only HTTP 409 can be locked, not `code`) | - | before coding suspend/activate |
| **Is `USER_ALREADY_APPROVED` approved?** Present in API_ERROR_CODES.md and the FE contract, but **not** in the verified code list of `_FACTS.md` | Blocks asserting the `code` of test INV-USERS-08 | - | together with the row above |
| **Search query param name: `q` or `search`?** FE contract uses `?q=`, API_ADMIN.md describes "filter: role, status, search" | Blocks the URL contract (FE deep-links with `?q=`), blocks the §3 DTO | - | before coding the list |
| **PATCH envelope: `data` or `data.user`?** API_CONVENTIONS.md says `{ "data": {...} }`; the FE contract of both admin screens records `data.user` | Blocks FE response parsing for all 3 PATCHes + GET detail | - | before coding |
| **Does `GET /admin/users/:id` embed role-scoped history?** FE asks for `enrollments[]`+`attempts[]` (student) / `classes[]`+`sessions[]` (teacher); API_ADMIN.md doesn't define it | Blocks the `AdminUserDetail` DTO, the N+1-safe query design (§11), the decision of whether to split a dedicated endpoint | - | before Sprint 3 |
| **`Notification.referenceType` has no `user` value.** The enum lists `assignment`/`attempt`/`invoice`/`session` | Blocks deep-linking of `account_approved`/`account_suspended`; temporarily `null` (§10) | - | before coding notifications |
| **Are a `suspended` user's tokens rejected with 401 or 403?** ENTITY_USER says 401; API_ERROR_CODES.md says `AUTH_ACCOUNT_SUSPENDED = 403` | Blocks the guard behavior after suspend (§10) and how FE handles it (401 usually triggers the refresh/logout flow, 403 does not) | - | before coding suspend |
| **No AuditLog table.** No durable place recording "who approved/locked whom, when" | Blocks the traceability requirement of §13; only application logs remain, not queryable | - | before go-live |
| **Can Admin lock themselves / the last remaining admin?** No document says | Risk of locking out all administrative access. No rule set on our own ⇒ nothing covered by an invariant yet | - | before go-live |

*(C2 and C4 in `_FACTS.md` do not touch this module: C2 belongs to the rate/payroll family; C4
only affects `hskLevelGoal` at the read-only display level — this module does not validate that
value.)*
