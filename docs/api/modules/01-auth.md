---
module: Auth
status: accepted
blocked_by: - (no business decision blocks the core; open points recorded in §16 — C1 blocks DTO field names, not flows)
owner: -
last_updated: 2026-08-19
---

## 0. Summary

The module owns **identity and login sessions**: account creation (`status=pending`), password
authentication, token issuance/rotation/revocation, and letting the account owner read and edit
their own profile. Boundaries: this module **does not change `User.status`** (approve/suspend/
activate belong to the Users module, `PATCH /admin/users/:id/*`) and **does not read/write other
users' data** — every endpoint only touches `req.user.id`; no endpoint accepts a `:id`. Three
things this module exclusively owns: `User.passwordHash`, the `RefreshToken` table, and the
`refresh_token` cookie. No other module may touch those three.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `User` | Read + Write | INSERT on register (always `status=pending`). UPDATE: `lastLoginAt` (login), `passwordHash` (change-password), `nickname`/`email`/`avatarUrl` (PATCH /me). **Never writes `role`, `status`**. Reads `passwordHash` only inside the authentication function, never outside the service |
| `RefreshToken` | Read + Write | INSERT on login + every rotation; UPDATE `revokedAt` on rotate/logout/password-change/replay detection. ⚠️ **This table has no `ENTITY_*.md` file** in `docs/entities/postgres/` and isn't in `_FACTS.md`; the only definition found is `PROJECT_KNOWLEDGE.md` section 16 (`id · userId · tokenHash unique · expiresAt · revokedAt`). Fields §6/§8 need (`familyId`, `replacedById`, revocation reason) **don't exist** → §12 + §16 |
| `Notification` | Write (INSERT) | Only 2 types: `new_teacher_registration`, `new_student_registration`, sent to admins. Append-only. No reads |
| *(rate-limit counter)* | Read + Write | **No table** in the docs. Don't use a Postgres table for login-failure counting (hot writes, no durability needed) — proposed Redis/in-memory store via `@nestjs/throttler`. Infrastructure not locked → §16 |
| Supabase Storage | Write (outside DB) | Avatar upload for `PATCH /auth/me`. Outside **every transaction** (§7) |

## 2. Endpoints

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | public | Create a new account, always `pending`, awaiting admin approval | defined (API_AUTH.md) |
| POST | `/api/v1/auth/login` | public | Exchange email+password for an access token + `refresh_token` cookie | defined |
| POST | `/api/v1/auth/refresh` | public *(authenticated via cookie)* | Rotate the refresh token, issue a new access token | defined |
| POST | `/api/v1/auth/logout` | authenticated (any role) | Revoke the current session's refresh token, clear the cookie | defined |
| GET | `/api/v1/auth/me` | authenticated (any role) | The currently logged-in user's own profile | defined |
| PATCH | `/api/v1/auth/me` | authenticated (any role) | Edit one's own profile | defined |
| POST | `/api/v1/auth/change-password` | authenticated (any role) | Change password, requires the current password | defined |

Absent: `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`,
`GET /auth/sessions`. **No password-recovery path exists** in the entire API docs → §16.
`/auth/refresh` is the only public endpoint authenticated via cookie instead of a header — that's
why §13 must discuss CSRF.

## 3. DTO

### Request

**POST /auth/register**

| Field | Type | Required | Validation constraint |
|---|---|---|---|
| `email` | string | yes | Email format, ≤ 255 chars, **normalized `trim` + lowercase before saving and before matching** (⚠️ ENTITY_USER only says "unique", nothing about case sensitivity → §16) |
| `password` | string | yes | ≥ 8 chars (API_AUTH). ⚠️ API_ERROR_CODES.md and the FE profile spec also require "uppercase and a number" — **two sources, two rules** → §16. Never logged, never echoed in `details` |
| `fullName` | string | yes | ⚠️ **C1** — the entity field is named `nickname`. The body name per API_AUTH.md is `fullName`. Don't change it yourself, see §16. Constraint: trim, 1–100 chars (matches `nickname`'s `varchar(100)`) |
| `role` | enum string | yes | ∈ `student` \| `teacher`. **`admin` is not a valid value** — no self-registration as admin (INV-AUTH-03) |

Not accepted: `status`, `hskLevelGoal`, `bio`, `avatarUrl`, `id` in the register body — extra
fields must be stripped (whitelist), not silently ignored and saved.

**POST /auth/login** — `email` (string, yes, normalized as above), `password` (string, yes). Don't
validate password length at login (length validation here leaks policy and adds a distinguishing
branch) — a malformed email must produce the same result as a wrong password (§13).

**POST /auth/refresh** — **no body**. Sole input: the `refresh_token` cookie. Never accept the
refresh token in the body or header (doing so defeats the httpOnly cookie's protection).

**POST /auth/logout** — no body. `Authorization: Bearer <access_token>` + the `refresh_token`
cookie.

**GET /auth/me** — no parameters.

**PATCH /auth/me** — all fields optional, but an empty body `{}` → `VALIDATION_ERROR` (no
meaningless `updatedAt` bump from an empty PATCH):

| Field | Type | Required | Validation constraint |
|---|---|---|---|
| `fullName` | string | no | ⚠️ C1 as above; trim, 1–100 |
| `email` | string | no | Email format, ≤255, normalized; duplicate of another user's email → `AUTH_EMAIL_EXISTS` |
| `avatarUrl` | string | no | Valid URL, https, pointing to Supabase Storage. `null` = remove avatar (FE has a "Remove image" button) — ⚠️ API_AUTH doesn't say whether `null` is accepted → §16 |

**Not present**: `hskLevelGoal`, `bio`, `role`, `status` in the body → consequence: `hskLevelGoal`
(student's HSK target) and `bio` (teacher intro) **have no endpoint that can write them**, even
though both are `User` fields displayed on the detail screen. Noted; not self-added → §16.

**POST /auth/change-password** — `currentPassword` (string, yes), `newPassword` (string, yes, same
policy as register's `password`, and **must differ** from `currentPassword`). FE has a third
"Confirm new password" field — that's an FE constraint, **not** sent to the API.

### Response

**POST /auth/register** → `201`

```
{ "data": { "message": "Registration successful. Awaiting admin approval." } }
```

No `id`, no token, no user fields of the just-created account. (Returning `id` is unnecessary
leakage; returning a token is wrong — the account is `pending`.)

**POST /auth/login** → `200`, plus header `Set-Cookie: refresh_token=<...>; HttpOnly; ...`
(cookie attributes in §13)

```
{ "data": { "accessToken": "<jwt>",
            "user": { "id": "...", "email": "...", "role": "student", "status": "active" } } }
```

`user` here is **exactly 4 fields** per API_AUTH.md — no extra `nickname`/`avatarUrl`; FE wanting
more calls `GET /auth/me`. No `refreshToken` in the body (INV-AUTH-09). No `expiresIn` (not
defined; FE knows 15 minutes from the docs, or reads `exp` from the JWT).

**POST /auth/refresh** → `200` + a new `Set-Cookie` (token rotated)

```
{ "data": { "accessToken": "<jwt>" } }
```

**POST /auth/logout** → `204`, plus a `Set-Cookie` clearing the cookie (`Max-Age=0`, same
`Path`/`Domain` as when set — a wrong `Path` means the cookie isn't deleted).

**GET /auth/me** · **PATCH /auth/me** → `200` — `{ "data": UserProfile }`

`UserProfile`:

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | no | |
| `email` | string | no | |
| `role` | `admin`\|`teacher`\|`student` | no | |
| `status` | `pending`\|`active`\|`suspended` | no | |
| `nickname` | string | yes | ⚠️ C1 — if resolved per API_AUTH, this key must be `fullName` in both request and response |
| `avatarUrl` | string | yes | |
| `hskLevelGoal` | int | yes | Only meaningful for `student`. ⚠️ C4: ENTITY_USER says 1–9, GLOSSARY/DATABASE_SCHEMA say 1–6 (DOC-004) — this module only reads, doesn't validate |
| `bio` | text | yes | Only meaningful for `teacher` |
| `lastLoginAt` | DateTime UTC ISO 8601 | yes | `null` when never logged in successfully |
| `createdAt` | DateTime UTC ISO 8601 | no | |
| `updatedAt` | DateTime UTC ISO 8601 | no | |

`passwordHash` **never appears** in any response, including error branches and `details`.

**POST /auth/change-password** → `204`, no body. No new token returned (INV-AUTH-17 revokes all
old tokens ⇒ FE must ask the user to log in again; ⚠️ this UX consequence isn't described by any
document → §16).

## 4. Business rules (invariants)

| ID | Statement |
|---|---|
| **INV-AUTH-01** | `passwordHash` never leaves the service layer: not in any response, not in any log, not in any error's `details`, not in any JWT claim. |
| **INV-AUTH-02** | Passwords are only stored as bcrypt **cost 12**; the raw password is never written to disk, logged, or sent anywhere; matching only via bcrypt's comparison function, never string comparison. |
| **INV-AUTH-03** | Every user created by `POST /auth/register` always has `status = pending` and `role ∈ {student, teacher}`; no body value can make register produce `status = active` or `role = admin`. |
| **INV-AUTH-04** | `email` is unique system-wide after normalization (trim + lowercase): two register requests with the same email — including concurrent, including different casing — produce **exactly one** `User` row; the losing request gets `409 AUTH_EMAIL_EXISTS`. |
| **INV-AUTH-05** | Login issues tokens only when `status = active`. `pending` → `403 AUTH_ACCOUNT_PENDING`, `suspended` → `403 AUTH_ACCOUNT_SUSPENDED`; both branches **don't** issue an access token, **don't** set a cookie, **don't** write `RefreshToken`, **don't** touch `lastLoginAt`. |
| **INV-AUTH-06** | Nonexistent email and wrong password produce **the same response**: same HTTP 401, same `code = AUTH_INVALID_CREDENTIALS`, same `message`, same shape (no `details`), and the same response-time distribution (no branch returns early by skipping bcrypt). |
| **INV-AUTH-07** | `AUTH_ACCOUNT_PENDING` / `AUTH_ACCOUNT_SUSPENDED` are only returned **after the password is verified correct**. A wrong password on a `pending`/`suspended` account still returns `AUTH_INVALID_CREDENTIALS`. (Account status is information only the account owner may learn.) |
| **INV-AUTH-08** | Access token lifetime is exactly **15 minutes**, refresh token exactly **7 days**, from issuance; expired tokens are rejected at every endpoint (`AUTH_TOKEN_EXPIRED`), no implicit access-token renewal. |
| **INV-AUTH-09** | The refresh token only travels via the `refresh_token` cookie with the `HttpOnly` flag: not in the response body, not in any other response header, unreadable by JavaScript, and not accepted if a client sends it via body/header. |
| **INV-AUTH-10** | Every successful `/auth/refresh` is a **rotation**: the just-used token is marked revoked in the same transaction as issuing the new one. Outside the grace window (§8), each family has **at most one** usable token. |
| **INV-AUTH-11** | Re-presenting a revoked/rotated refresh token (outside the grace window) is **REPLAY**: the system revokes **the entire family** of that token, issues no new token, returns `401 AUTH_REFRESH_INVALID`. The family revocation **is committed** even though the request ends in error. |
| **INV-AUTH-12** | After a family is revoked, no token in that family works — including the newest, including unexpired ones. The only way forward is logging in again. |
| **INV-AUTH-13** | Refresh tokens are only stored hashed (`tokenHash`, UNIQUE); the raw value never exists in the DB, logs, or backups. Stealing the DB yields no usable token. |
| **INV-AUTH-14** | `lastLoginAt` is updated **after successful token issuance** at `/auth/login` and only there: failed login (all error branches), `/auth/refresh`, `/auth/logout` **don't** change it. |
| **INV-AUTH-15** | Account status is checked **per request** against DB data, not just trusted from the JWT claim: a user `suspended` after receiving an unexpired access token is still rejected at every protected endpoint, and their refresh token can't rotate anymore. |
| **INV-AUTH-16** | `/auth/logout` revokes the current session's refresh token and clears the cookie; calling again (no cookie, or an already-revoked cookie) still returns `204`, no error, no new side effect. Logout **doesn't** make a held access token disappear — it lives out its ≤15 minutes (the known stateless-JWT limitation). |
| **INV-AUTH-17** | `POST /auth/change-password` only succeeds when `currentPassword` is correct; on success, **all** of the user's refresh tokens (every family, every device) are revoked in the same transaction as writing the new `passwordHash`. |
| **INV-AUTH-18** | Writing the new `passwordHash` and revoking tokens is **atomic**: no "password changed but old tokens still rotate" state, and no "tokens revoked but password unchanged" state. |
| **INV-AUTH-19** | `PATCH /auth/me` only writes the `User` row with `id = req.user.id`, and only `nickname`(⚠️C1)/`email`/`avatarUrl` + `updatedAt`. `id`, `role`, `status`, `passwordHash`, `createdAt`, `lastLoginAt` are immutable through this endpoint. |
| **INV-AUTH-20** | Changing email via `PATCH /auth/me` keeps `email` uniqueness (duplicate → `409 AUTH_EMAIL_EXISTS`, nothing written) and **doesn't** change `status` — changing email doesn't put an active account back to `pending`. |
| **INV-AUTH-21** | After **5 failed logins in 15 minutes** for the same counter key, subsequent attempts are blocked with HTTP 429 **without** running the password comparison; the blocking behavior is identical for existing and nonexistent emails (429 must not be usable to enumerate accounts). A **successful** login is not blocked by the previous failures' counter before the threshold is hit. |
| **INV-AUTH-22** | Two concurrent `/auth/refresh` requests carrying **the same** valid refresh token (two tabs of the same browser) are **not** replay: exactly one rotation happens, both requests receive usable access tokens, the family is **not** revoked, and the final cookie value in the browser is a usable token. |
| **INV-AUTH-23** | Every error response of the module follows API_CONVENTIONS.md's flat envelope (`statusCode`/`error`/`code`/`message`/`timestamp`/`path`; no `success` flag, no nested `error` object); `details` **only** appears on `VALIDATION_ERROR`. |
| **INV-AUTH-24** | Every DateTime field returned is UTC ISO 8601; `lastLoginAt = null` (not empty string, not epoch 0) when the user never logged in successfully. |

## 5. Ownership / RBAC

RBAC_MATRIX.md: `User · read own profile` = ✅ Admin / 🔒 Teacher / 🔒 Student;
`User · update own profile` = ✅ Admin / 🔒 Teacher / 🔒 Student. This module has **no
role-restricted endpoint** — any logged-in role can call all 7 endpoints. Hence
`AUTH_INSUFFICIENT_ROLE` doesn't appear in §9.

Ownership here is **structural, not a check**: no endpoint accepts a `:id` or `userId` in the
body/query, so no path points at another user's row. Deliberate — adding `?userId=` to
`/auth/me` would turn a structural invariant into one that must be tested.

Two-layer check (not relying on the guard alone):

| Layer | Condition | On failure |
|---|---|---|
| Guard | Has `Authorization: Bearer`, valid JWT signature, not past `exp` | `401 AUTH_TOKEN_INVALID` / `401 AUTH_TOKEN_EXPIRED` |
| Guard/Service (mandatory) | Re-read `User` by the token's `sub`: the row still exists | `401 AUTH_TOKEN_INVALID` (user deleted — no deletion path exists today) |
| Service (mandatory, non-negotiable) | `user.status === 'active'` — **read from the DB, not from the claim** | `403 AUTH_ACCOUNT_SUSPENDED` (⚠️ 401 vs 403: see §16) |
| Service | Every query uses `id = req.user.id`, no id from input | — (no failure branch) |

**Why read `status` from the DB on every request**: an access token lives 15 minutes. If the
claim were trusted, an account `suspend`ed by an admin would keep working normally for up to 15
minutes — with teacher/admin powers, those 15 minutes are enough to approve a session, record a
payment, or change the account email to retain access. This is a security boundary, not a
performance optimization ⇒ accept one `User` query by primary key per request (a short-lived
cache is possible but the TTL must be locked — §16).

## 6. State machine

Two state machines, owned by two different owners. The Auth module **reads** the first and **owns**
the second.

### 6.1 `User.status` — owned by the Users module, Auth is only the check gate

```
   register (Auth)          approve (Users)          suspend (Users)
        │                        │                        │
        ▼                        ▼                        ▼
   ┌─────────┐             ┌────────┐               ┌───────────┐
   │ pending │ ──────────► │ active │ ────────────► │ suspended │
   └─────────┘             └────────┘ ◄──────────── └───────────┘
        │                             activate (Users)
        │
   login → 403 AUTH_ACCOUNT_PENDING          login → 403 AUTH_ACCOUNT_SUSPENDED
   (no token, no cookie)                     (no token; old tokens also rejected — INV-AUTH-15)
```

Auth only writes the first state (`pending` at register) and has **no path** to change it later.

### 6.2 `RefreshToken` — rotation + family, owned by the Auth module

One successful `login` creates a **family** (one signed-in session on one browser/device) and the
family's first token. Each successful `/auth/refresh` appends a link.

```
login OK
   │  create familyId = f, issue RT1
   ▼
 RT1 ──refresh OK──► RT2 ──refresh OK──► RT3 ──refresh OK──► RT4 (active)
  │                   │                   │                   │
  ▼                   ▼                   ▼                   │
rotated             rotated             rotated               └── the only usable
(revokedAt=t1,      (revokedAt=t2,      (revokedAt=t3,            token of f
 replacedBy=RT2)     replacedBy=RT3)     replacedBy=RT4)          (outside the grace window)
```

States of **a single token**:

```
  active ──(used at /auth/refresh, valid)────────► rotated                [end]
  active ──(POST /auth/logout)───────────────────► revoked:logout         [end]
  active ──(POST /auth/change-password)──────────► revoked:password_change[end]
  active ──(past expiresAt, no DB write needed)──► expired                [end]
  active ──(family revoked due to replay)────────► revoked:replay         [end]

  rotated | revoked:* ──(re-presented at /auth/refresh)──► ┌──────────────────┐
                                                           │ REPLAY DETECTED  │
                                                           └──────────────────┘
```

The REPLAY gate — the part that must be exactly right:

```
  Re-present RT2 (rotated at t2), current time T
        │
        ├─ family f already revoked?          ──► YES ─► 401 AUTH_REFRESH_INVALID (no re-revocation, no second alarm)
        │
        ├─ (T − t2) ≤ G (grace window) AND
        │  RT2's child (RT3) still active?    ──► YES ─► VALID RACE, not replay (§8)
        │                                                return the exact access token/cookie of that rotation
        │
        └─ otherwise                          ──────────► REPLAY
                                                            │
                                                            ├─ revoke the ENTIRE family f
                                                            │   (RT1..RTn, every state, reason = replay)
                                                            ├─ COMMIT the revocation (§7)
                                                            ├─ warn-level log + metric (§14)
                                                            └─ 401 AUTH_REFRESH_INVALID
```

| From | To | Action | Valid? |
|---|---|---|---|
| `active` | `rotated` | `/auth/refresh` | ✅ simultaneously issues the child token |
| `active` | `revoked:logout` | `/auth/logout` | ✅ |
| `active` | `revoked:password_change` | change password | ✅ applies to **every** family of the user |
| `active` | `revoked:replay` | replay detected in the family | ✅ applies to **every** token of that family |
| `rotated` | `active` | — | ❌ no path back |
| `revoked:*` | any usable state | — | ❌ **one-way gate**; revocation is permanent |
| `expired` | any | — | ❌ expiry can't be undone, even inside the grace window |

**One-way gate**: revocation is irreversible. Direct business consequence: one replay detection
**logs out that entire session**, and the real user (if a false positive) is forced to log in
again. So §8 must distinguish "valid race" from "replay" correctly — a false positive here isn't
a minor annoyance, it's a forced logout mid-work.

**Revocation scope on replay**: revoke the **family**, not every family of the user. Reason: an
attacker can only hold one session's token (one cookie theft); revoking every device because one
session leaked is an overly broad punishment and turns every network hiccup into an
account-wide incident. If policy wants "one replay = log out every device", that must be locked
separately — §16.

## 7. Transaction boundary

Default isolation `READ COMMITTED` suffices for every flow; correctness relies on **UNIQUE
constraints** and **guarded UPDATEs with `rowCount` checks**, not on `SERIALIZABLE`.

| Flow | Inside the SAME transaction | Must be OUTSIDE the transaction |
|---|---|---|
| `register` | (1) INSERT `User` (`status=pending`) → (2) INSERT `Notification` `new_teacher_registration`/`new_student_registration` for **every** admin, via **one bulk insert**, no loop | None (no mail/push at current scope) |
| `login` | (1) INSERT `RefreshToken` (new family) → (2) UPDATE `User.lastLoginAt` | JWT signing (pure CPU; do it before opening the transaction), set cookie (after commit) |
| `refresh` — success branch | (1) guarded UPDATE revoking the old token (`... WHERE tokenHash=:h AND revokedAt IS NULL`) → check `rowCount=1` → (2) INSERT child token with the same `familyId` | Sign the new access token, write the cookie (after commit) |
| `refresh` — REPLAY branch | **Separate** transaction containing only: UPDATE revoking the whole family | Throw the 401 error **after the revocation transaction has committed** |
| `logout` | One single UPDATE (no explicit transaction needed) | Clear the cookie (after the UPDATE returns) |
| `change-password` | (1) UPDATE `User.passwordHash` → (2) UPDATE revoking **every** `RefreshToken` of the user | bcrypt the new password (**~250ms at cost 12** — must happen **before** opening the transaction; don't hold the transaction open through the hashing) |
| `PATCH /auth/me` | One single UPDATE; email uniqueness guaranteed by the UNIQUE constraint | Avatar file upload/delete on Supabase Storage — **not rollbackable**, must be treated as an outside side effect (§10) |

**This module's most important trap**: in the REPLAY branch, if the family revocation shares a
transaction with the handling flow and then throws 401, the **transaction rolls back and the
family is never revoked** — the system reports the attack but the token lives, i.e. a defense
that looks real but isn't. Mandatory: open a separate transaction for the revocation, commit,
then throw (INV-AUTH-11).

The second trap: bcrypt cost 12 takes ~200–300ms. Hashing **inside** an open transaction (at
register or password change) holds the connection and row locks for that duration; under load
that's connection-pool exhaustion. Hash first, open the transaction after.

## 8. Idempotency & concurrency

**`register`** — not idempotent by design; the only barrier is `UNIQUE(email)` in the DB
(normalize lowercase before writing, or a unique index on `lower(email)`). Two concurrent requests
with the same email: one INSERT wins, the other hits the unique violation. **Mandatory: catch
P2002 inside AuthService and rethrow `AUTH_EMAIL_EXISTS`** — never let it fall to the global
exception filter, which maps P2002 to **DUPLICATE_ENTRY**, a code **not in API_ERROR_CODES.md**
(§9, §16). The "SELECT if email exists → INSERT" pattern is forbidden unless a unique constraint
backs it: two requests can both pass the SELECT.

**`login`** — two concurrent logins by the same user are valid and create **two independent
families** (two devices). No lock, no session-count limit (⚠️ no concurrent-session cap → §16).
`lastLoginAt` overwrites in commit order — a few milliseconds of skew is acceptable.

**`logout`** — idempotent: guarded UPDATE `... SET revokedAt = now() WHERE tokenHash = :h AND
revokedAt IS NULL`; `rowCount = 0` (no cookie, unknown token, already revoked) still returns
`204`. Never error on logout — an error here just leaves FE stuck in a "half logged out" state.

**`change-password`** — two concurrent requests with the same correct `currentPassword`: both are
business-valid, the end state is one of the two new passwords. To make "the second one must
fail", lock the `User` row `FOR UPDATE` and re-verify `currentPassword` **inside** the lock.
Proposal: lock the row — it's stronger and costs nothing at real traffic.

**`/auth/refresh`** — the module's hardest part.

*Why this is a valid race, not an attack*: the cookie belongs to the browser, not the tab. Two
tabs of the same user see the access token expire at nearly the same moment (very common: one tab
left open, one active; or a page firing several parallel requests that all get 401 and all call
refresh). Both send **the exact same** `refresh_token` value. With a naive rotation setup: tab A
rotates RT2→RT3, tab B arrives later, sees RT2 `rotated` ⇒ concludes REPLAY ⇒ revokes the whole
family ⇒ **the real user is logged out mid-work**, and the cause was two tabs, not a thief.
Rotation without race handling produces random, non-reproducible logouts — exactly the kind of
bug that eats the most debugging time.

*The primitive against two child tokens*: every implementation must start from a **guarded
UPDATE**, not "SELECT then UPDATE":

```
UPDATE "RefreshToken" SET "revokedAt" = now(), reason = 'rotated'
WHERE "tokenHash" = :h AND "revokedAt" IS NULL
```

`rowCount = 1` ⇒ I'm the rotator ⇒ INSERT the child token. `rowCount = 0` ⇒ someone rotated/
revoked first ⇒ **don't conclude replay yet**, continue into the §6.2 decision tree. This
guarantees that no matter how many requests arrive at once, only one child token is born.

*Two ways to handle the race, pick one (proposal: A)*:

| | **A. Grace + return the old result** (proposed) | **B. Grace + allow a sibling token** |
|---|---|---|
| How | After rotating, store **the rotation's result** (the just-signed access token + the raw child refresh token) in a cache outside the DB, keyed by the parent's `tokenHash`, TTL = G. A later request inside window G receives **the exact copy** of that result | A `rotated` parent still inside G may spawn one more child token in the same family; the family temporarily has 2 leaves |
| Result for 2 tabs | Two responses **identical**; cookie written twice with the same value ⇒ no tab overwriting the other's token | Two different responses; the later tab overwrites the earlier tab's cookie ⇒ the other tab's token becomes orphaned (still active but held by nobody) |
| Keeps INV-AUTH-10 | Yes, strictly: each rotation yields exactly one child | Weakened: inside G two usable tokens can exist |
| Cost | Needs a cache outside the DB (Redis) or a temp column; **stores the raw token for a short TTL** — trading correctness for one sensitive short-lived store | No new infrastructure |
| Remaining risk | Cache loss (Redis restart) ⇒ falls back to the replay branch ⇒ logout; acceptable if the cache exists | The window for an attacker to use the parent token widens by exactly G |

A third approach, **combinable with A**: **single-flight** — the second request takes an
advisory lock on `familyId`, waits for the first to commit, then reads the result from cache.
Eliminates the "cache miss" branch but adds wait latency.

*The distinguishing condition (the standard to implement and test)* — a **valid race** when
**and only when** all four hold: (1) the presented token exists, (2) its state is `rotated` (not
`revoked:logout`/`revoked:password_change`/`revoked:replay`), (3) `now − revokedAt ≤ G`, (4) the
family isn't revoked and the child token is still `active`. Missing any one ⇒ **REPLAY** ⇒ revoke
the family. In particular: a token revoked by `logout` being re-presented is **not** a race — the
user deliberately ended the session; there's no legitimate reason for it to come back.

*The value of G*: proposal **30 seconds** (enough for tab races including slow networks; short
enough to not meaningfully widen the attack window). No document specifies it ⇒ §16. G must be
configurable and must have a metric counting grace-branch hits (§14) for tuning.

**`change-password` concurrent with `refresh`** — an in-flight refresh will find the token
revoked with reason `password_change`. This is **not** replay and **must not** trigger an alarm:
return `401 AUTH_REFRESH_INVALID`, log at info level. This is exactly why the "revocation reason"
column must exist in the table (§12) — without it, every password change creates a false replay
alarm, and enough false alarms make real ones ignored.

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| register: malformed/missing fields, `role='admin'` | 400 | `VALIDATION_ERROR` | in registry + `_FACTS` |
| register: email already exists (including via race, caught from the unique violation) | 409 | `AUTH_EMAIL_EXISTS` | exists |
| login: email doesn't exist | 401 | `AUTH_INVALID_CREDENTIALS` | exists |
| login: wrong password (any `status`) | 401 | `AUTH_INVALID_CREDENTIALS` | exists — **must be identical to the row above** (INV-AUTH-06) |
| login: correct password, `status=pending` | 403 | `AUTH_ACCOUNT_PENDING` | exists |
| login: correct password, `status=suspended` | 403 | `AUTH_ACCOUNT_SUSPENDED` | exists |
| login: over 5 failures/15 min | 429 | ⚠️ **no code** | API_ERROR_CODES.md lists HTTP 429 in the status table but has **no code** for rate limiting (`AI_QUOTA_EXCEEDED` is 429 but belongs to the AI group and is *proposed*). **Don't invent** → §16 |
| refresh: no cookie / token doesn't exist / revoked / **replay** | 401 | `AUTH_REFRESH_INVALID` | exists |
| refresh: token still in DB but past `expiresAt` | 401 | `AUTH_TOKEN_EXPIRED` | exists |
| protected endpoint: missing/broken signature/malformed token | 401 | `AUTH_TOKEN_INVALID` | ⚠️ in API_ERROR_CODES.md but **not** in `_FACTS.md`'s "Existing error codes" list → §16 |
| protected endpoint: access token past 15 min | 401 | `AUTH_TOKEN_EXPIRED` | exists |
| protected endpoint: user `suspended` after token issuance | 403 | `AUTH_ACCOUNT_SUSPENDED` | exists — ⚠️ ENTITY_USER.md says "all JWT tokens rejected (401)" → 401/403 conflict, §16 |
| `PATCH /auth/me`: email duplicate of another user | 409 | `AUTH_EMAIL_EXISTS` | exists |
| `PATCH /auth/me`: empty body / malformed field | 400 | `VALIDATION_ERROR` | exists |
| `PATCH /auth/me`: avatar upload failed | 500 | `USER_AVATAR_UPLOAD_FAILED` | exists |
| change-password: `currentPassword` wrong | 401 | `AUTH_INVALID_CREDENTIALS` | exists |
| change-password: `newPassword` fails policy / same as old | 400 | `VALIDATION_ERROR` | exists |
| logout: every situation | 204 | — | no error branch (INV-AUTH-16) |

**Three points to note**:
1. **REPLAY has no dedicated code, deliberately.** Returning a dedicated code (like
   AUTH_TOKEN_REUSED — deliberately **not** registered) tells the attacker the system detected
   them and which token was used. Distinguishing replay from other branches must only happen in
   **logs/metrics** (§14), not in the response.
2. **P2002 must be caught in the service.** The global filter maps P2002 → **DUPLICATE_ENTRY**, a
   code in no group of API_ERROR_CODES.md; if it leaks, FE receives a `code` it has no branch for
   and falls into the default toast.
3. **`AUTH_INSUFFICIENT_ROLE` isn't used in this module** — no endpoint is role-restricted.

## 10. Side effects & notifications

| Action | Notification `type` | `userId` (recipient) | `referenceId` / `referenceType` | `payload` |
|---|---|---|---|---|
| `POST /auth/register` with `role='teacher'` | `new_teacher_registration` | **every** user with `role='admin'` (fan-out of N rows) | new `user.id` / ⚠️ `referenceType` has no `user` value in the enum (`assignment`/`attempt`/`invoice`/`session`) ⇒ `null` | ⚠️ not locked; the deep-link to `/admin/users/[id]` needs `referenceId` so it's still written |
| `POST /auth/register` with `role='student'` | `new_student_registration` | **every** admin | as above | as above |

Actions that **don't** produce notifications, because ENTITY_NOTIFICATION.md's enum has no
matching type: `login`, `failed login`, `logout`, `refresh`, **`change-password`**,
`PATCH /auth/me` (including email changes). Notable consequence: **a password change isn't
reported to the account owner** — if an attacker takes over a session and changes the password,
the owner gets no signal (and there's no forgot-password flow to recover it). Noted; no type
self-added → §16.

Other side effects (not notifications):

| Action | Side effect | Notes |
|---|---|---|
| `login` | `Set-Cookie: refresh_token`, INSERT `RefreshToken`, UPDATE `lastLoginAt` | `lastLoginAt` is input for the "Last login" column of `GET /admin/users` (spec 02) |
| `refresh` | New `Set-Cookie`, revoke old token, INSERT child token | |
| `logout` / `change-password` | Revoke token (one family / all) | |
| `PATCH /auth/me` with avatar | Upload/delete file on Supabase Storage | **Not rollbackable.** Mandatory order: upload first → UPDATE DB after; if the UPDATE fails, the file is orphaned on storage (garbage, not a data error). The reverse order produces an `avatarUrl` pointing at a nonexistent file — worse |
| Registration with many admins | N Notification rows | One bulk insert, no loop (§11) |

Admin fan-out shares the transaction rule with the Notifications module (spec 07 §7): the
`Notification` row is INSERTed in the **same** transaction as the business action; everything
leaving the DB (push, email) is outside, after commit.

## 11. Index & query

```
User:         UNIQUE (email)                          -- or UNIQUE (lower(email)) if case-insensitivity is locked
User:         (primary key id)                        -- re-read status per request (§5)
RefreshToken: UNIQUE ("tokenHash")                     -- token lookup on refresh/logout; the barrier against two rows with the same token
RefreshToken: INDEX ("userId", "revokedAt")            -- revoke all of a user's tokens on password change
RefreshToken: INDEX ("familyId")                       -- revoke the whole family on replay   [field proposed, §12]
RefreshToken: INDEX ("expiresAt")                      -- expired-token cleanup job
Notification: INDEX ("userId", "createdAt")            -- owned by the Notifications module (spec 07 §11)
```

**The module's real cost is CPU, not I/O**: bcrypt cost 12 takes ~200–300ms per comparison and
**can't** be parallelized within a single-threaded Node process if the synchronous build is used.
The async build (thread pool) is mandatory. Consequence to know in advance: each worker serves
only a few concurrent logins — the §13 rate limit is both a security measure and a capacity
protector.

**Per-flow queries — mandatory counts, no more**:

| Flow | Queries |
|---|---|
| `login` | 1 SELECT `User` by email (select the exact fields needed: `id, email, passwordHash, role, status`) + 1 INSERT `RefreshToken` + 1 UPDATE `User` |
| `refresh` | 1 guarded UPDATE of the old token + 1 INSERT child token (+ 1 SELECT only when `rowCount=0`, to walk the §6.2 decision tree) |
| `GET /auth/me` | 1 SELECT by primary key |
| `register` | 1 INSERT `User` + 1 SELECT of the admin list (`WHERE role='admin' AND status='active'`) + 1 bulk INSERT `Notification` |

**The only N+1 risk**: the `for (admin of admins) createNotification(...)` loop at register. With
3 admins it's harmless, but it sits in the same transaction as the `User` INSERT — the statement
count scales with the admin count and lengthens the transaction. Use one multi-row insert.

**Cleanup**: the `RefreshToken` table grows monotonically (each refresh adds a row — a user
active continuously for 7 days with 15-minute access tokens produces ~670 rows). A job deleting
rows with `expiresAt < now() - <retention>` is needed (proposal: keep 30 days for investigation
purposes). No document specifies it → §16.

## 12. Migration & seed

**`User` table**: this module adds/changes no column (owned by the Users module / base
migration). It only **requires** one thing: the case-insensitive email-uniqueness decision must be
reflected in the migration (`citext`, or a unique index on `lower(email)`, or app-layer lowercase
normalization + a plain unique). Three options, three different behaviors with legacy mixed-case
data → must be locked before real data exists.

**`RefreshToken` table**: **doesn't exist yet and has no ENTITY spec.** The migration must create
it, including the documented part and the part that must be added for §6/§8 to work:

| Column | Source | Notes |
|---|---|---|
| `id` | PROJECT_KNOWLEDGE.md #16 | uuid, primary key |
| `userId` | PROJECT_KNOWLEDGE.md #16 | FK → `User`, `ON DELETE CASCADE` |
| `tokenHash` | PROJECT_KNOWLEDGE.md #16 | UNIQUE, one-way hash of the raw token |
| `expiresAt` | PROJECT_KNOWLEDGE.md #16 | = issuance + 7 days |
| `revokedAt` | PROJECT_KNOWLEDGE.md #16 | `null` = usable |
| `familyId` | **proposed** — needed for INV-AUTH-11/12 | uuid, generated at login, stable across every rotation |
| `replacedById` | **proposed** — needed for the §8 grace window | self-referencing FK, `null` when not rotated |
| `revokedReason` | **proposed** — needed to avoid false alarms (§8) | enum `rotated` \| `logout` \| `password_change` \| `replay` |
| `createdAt` | **proposed** | for investigation and the cleanup job |

The three columns `familyId`/`replacedById`/`revokedReason` **aren't in any source document** —
this spec states them as mandatory technical requirements, and approving the `RefreshToken` table
(plus an `ENTITY_REFRESH_TOKEN.md`) is an item in §16. No coding before the table is locked.

**Seed to make the module testable**:
- 1 `active` admin, 1 `active` teacher, 1 `active` student, 1 `pending` teacher, 1 `suspended`
  student — known passwords, hashed with **exactly cost 12** (seeding with a low cost makes the
  performance and cost tests wrong).
- 1 `active` user who never logged in (`lastLoginAt = null`) to lock INV-AUTH-24.
- 1 user with mixed-case email to test normalization.
- At least 2 admins to test register's notification fan-out (bulk insert, no loop).
- Rotation/grace tests need an **injectable clock** to jump past G and past the 15-min/7-day
  lifetimes without waiting for real time.

## 13. Security & rate limit

**Data that must never leave**

| Thing | Rule |
|---|---|
| `passwordHash` | Not in any DTO, log, `details`, or JWT claim. Enforcement: the repository uses an explicit `select` list; the only function allowed to read `passwordHash` is the authentication function, and it returns a boolean, never the hash |
| Raw password | Not logged, not in `VALIDATION_ERROR`'s `details` (the error message describes the rule, doesn't echo the value), not in APM/breadcrumbs |
| Raw refresh token | Not logged, not stored in the DB (only hashed), not returned in the body. If option A in §8 is chosen, the raw value sits in a cache with TTL = G — it must be a dedicated store, not a log, not a shared table |
| `Authorization` and `Cookie` headers | Must be in the logger/APM redaction list |
| JWT claims | Only `sub`, `role`, `jti`, `iat`, `exp` (+ `status` if wanted, but the DB **must** still be re-checked — §5). No `email`, `nickname`, `passwordHash`, no business data |

**Rate limit login: 5 attempts/15 minutes**
- Only **failures** count; a successful login doesn't count against the counter and (proposal)
  clears that key's counter.
- Two counters run in parallel: by **normalized email** (blocks password guessing against one
  account) and by **IP** (blocks password spraying across many accounts). IP-only is useless
  against someone with many IPs; email-only is useless against password spraying.
- The email counter **must behave identically for nonexistent emails** — if an unknown email isn't
  counted (or counted differently), an attacker distinguishes real accounts by the rate-limit
  behavior itself. This is a subtle variant of the account-enumeration vulnerability.
- Over threshold → HTTP 429, **no** bcrypt comparison (CPU protection), **no** per-account
  remaining-time disclosure. ⚠️ No `code` for 429 yet → §16.
- Proposal to apply broader rate limits (no doc, leaving for §16): `register` (blocks mass
  junk-signup flooding the admin approval queue) and `change-password`/`refresh` (blocks abuse).

**Anti user-enumeration — mandatory**
1. **Wrong email and wrong password return the SAME error code**: `401 AUTH_INVALID_CREDENTIALS`,
   same `message`, same shape, no `details`, no differing extra field (INV-AUTH-06).
2. **Timing equalization**: when the email doesn't exist, still run one bcrypt comparison against
   a fixed dummy hash before replying. Without this, the "unknown email" branch returns ~250ms
   faster and becomes a remotely measurable oracle.
3. **Account status only leaks after the password is correct** (INV-AUTH-07). Returning
   `AUTH_ACCOUNT_PENDING` as soon as the email is seen to exist makes points 1 and 2 pointless.
4. **Rate limiting must not discriminate** (point above).
5. **Known limitation, not self-fixed**: `POST /auth/register` returns `409 AUTH_EMAIL_EXISTS` —
   i.e. **register is by design an account-enumeration oracle per API_AUTH.md**. This spec doesn't
   change that behavior itself (changing breaks signup UX and the FE contract); recorded as a
   consciously accepted risk, which is also why `register` needs rate limiting. → §16.

**The `refresh_token` cookie** — `HttpOnly` (mandatory, per API_AUTH), `Secure` (mandatory in
production), `Max-Age` 7 days matching `expiresAt` in the DB, the narrowest possible `Path`
(proposal `/api/v1/auth` — the cookie won't be sent with every business request), `SameSite`
**not specified by any document** → §16. The `SameSite` choice determines the CSRF surface:

**CSRF** — `/auth/refresh` is a POST endpoint authenticated **entirely by cookie**, no header
needed. That's the classic CSRF target shape: any page can make the victim's browser call
`/auth/refresh`. The damage is bounded (the attacker can't read the response due to CORS, so
can't get the access token) but **the real consequence is continuously rotating the token**, and
if the attacker forces two calls it can trigger the replay branch ⇒ **remotely log the victim
out**. Minimum defense: `SameSite=Lax` or stricter (blocks cross-site POSTs) plus an
`Origin`/`Referer` check on the refresh endpoint. Must be locked together with whether FE/API are
same-site in production → §16.

**Other**: `bcrypt` cost 12 fixed, not environment-configurable (tests running at a lower cost
won't catch a wrong production cost — if the cost must be lowered for tests, a dedicated test must
lock the production configuration's cost). No `AuditLog` table anywhere in the docs ⇒ **no durable
place recording "who logged in when, from where, how many failures"** beyond application logs ⇒
security incident investigation depends on log retention → §16.

## 14. Observability

**Logs** (never containing raw tokens, passwords, or hashes; only `jti`/`tokenHash` prefixes/
`familyId`):

| Event | Level | With |
|---|---|---|
| Successful login | info | `userId`, `role`, IP, user-agent |
| Failed login | info | **reason group** (`invalid_credentials` / `pending` / `suspended`), hashed or truncated email, IP. No passwords; no full email if privacy policy requires |
| Rate-limit hit | warn | counter key (hashed email / IP), count |
| Successful refresh rotation | debug | `userId`, `familyId`, `jti` old → new |
| **Grace-window hit** (valid race) | info | `familyId`, latency since the original rotation — **used to tune G** |
| **REPLAY detected** | **warn/alert** | `userId`, `familyId`, revoked token count, IP + user-agent of both the original rotation and the re-presentation (two different UAs = a real cookie theft signal) |
| Revocation due to `logout` / `password_change` | info | Must be clearly distinguished from replay, or every password change creates a false alarm (§8) |
| Successful password change | info | `userId`, revoked token count |
| Successful email change | info | `userId`, old → new email (a sensitive event: account takeover usually starts with an email change) |

**Measure**:
- Login success/failure ratio over time; a failure spike on one email = password-guessing attack.
- **Replay detections/day** — the alert threshold is **> 0 sustained**: either being attacked, or
  the grace window is too short (false positives). The two causes are distinguished by the
  "grace" metric above.
- Grace-branch requests / total refreshes — abnormally high means FE is firing refresh in bursts
  (missing single-flight in the interceptor).
- p95/p99 of bcrypt and `/auth/login` time — cost 12 makes login the system's slowest endpoint;
  track to know when to add workers.
- `RefreshToken` row count and growth rate — tracks the cleanup job (§11).
- 401 ratio on business endpoints — a sudden spike usually means FE's refresh flow is broken.

## 15. Test matrix

This is the **invariant gate**: every INV in §4 must have at least one row here. A missing row =
no merge.

| INV | Test type | Description |
|---|---|---|
| INV-AUTH-01 | integration | Serialize the responses of all 7 endpoints (success and 400/401/403/409 branches) to strings → assert no `passwordHash` key and no seed hash strings. Decode JWT payloads → assert no `passwordHash`. Capture logs during the run → assert no hash |
| INV-AUTH-02 | real DB | After register, read `passwordHash` directly from the DB → assert the bcrypt prefix and **cost = 12**; assert the value ≠ the raw password; login with the exact password → 200 |
| INV-AUTH-03 | integration | register with `role='admin'` → 400; adding `status='active'` to the body → field stripped, DB still `pending`; every valid register → DB `status='pending'` |
| INV-AUTH-04 | real DB (concurrency) | Fire 2 concurrent registers with the same email → exactly 1 `User` row, 1 request 201 and 1 request **409 `AUTH_EMAIL_EXISTS`** (not 500, not **DUPLICATE_ENTRY**). Repeat with `A@x.com` vs `a@x.com` |
| INV-AUTH-05 | integration + real DB | Login a `pending` user (correct password) → 403 `AUTH_ACCOUNT_PENDING`; `suspended` → 403 `AUTH_ACCOUNT_SUSPENDED`. Assert: no `Set-Cookie`, no `accessToken`, `COUNT(RefreshToken)` unchanged, `lastLoginAt` unchanged |
| INV-AUTH-06 | integration | Byte-compare the responses of (nonexistent email) and (existing email + wrong password): same `statusCode`, `error`, `code`, `message`, no `details`. Add a timing test: run N of each branch, assert the time distributions don't separate (no branch faster by a threshold) |
| INV-AUTH-07 | integration | Wrong password on a `pending` account → `AUTH_INVALID_CREDENTIALS` (**not** `AUTH_ACCOUNT_PENDING`); repeat for `suspended` |
| INV-AUTH-08 | integration (fake clock) | Advance 14 minutes → access token still usable; 15 min + 1 s → 401 `AUTH_TOKEN_EXPIRED`. Advance 7 days + 1 min → refresh token expired → 401 `AUTH_TOKEN_EXPIRED` |
| INV-AUTH-09 | integration | Login/refresh responses contain no refresh-token string; the `Set-Cookie` header has `HttpOnly` (and `Secure` in production config). Sending the refresh token via body/header instead of cookie → 401, no token issued |
| INV-AUTH-10 | real DB | After each refresh: the old token has `revokedAt ≠ null`, the new one `revokedAt = null`, same `familyId`; `COUNT(* WHERE familyId=f AND revokedAt IS NULL) = 1` (measured outside the grace window). A chain of 5 consecutive refreshes all correct |
| INV-AUTH-11 | real DB | Refresh with RT1 (rotated long ago, outside G) → 401 `AUTH_REFRESH_INVALID`, **and** `COUNT(* WHERE familyId=f AND revokedAt IS NULL) = 0`, **and** the revocation persists after the failing request ends (re-read from another connection — catches the §7 rollback bug) |
| INV-AUTH-12 | integration | After a family is revoked, using that family's newest token → 401; the old access token lives out its 15 minutes (known limitation) but can't rotate anymore; logging in again → new family, works normally |
| INV-AUTH-13 | real DB | `SELECT` the whole `RefreshToken` table → no column contains the raw token value the client holds; `tokenHash` is UNIQUE (try inserting a duplicate → constraint violation) |
| INV-AUTH-14 | real DB | Successful login → `lastLoginAt` updated (after token issuance). Failed login (3 branches) → unchanged. `/auth/refresh`, `/auth/logout` → unchanged |
| INV-AUTH-15 | integration | Login → hold an unexpired access token → admin `suspend`s that user → call `GET /auth/me` with the old token → rejected; call `/auth/refresh` → rejected. (Lock the HTTP code after §16 resolves the 401/403 conflict) |
| INV-AUTH-16 | integration + real DB | Logout → 204, token revoked in the DB, cookie cleared with the right `Path`. Second logout (no cookie) → still 204, revoked token count unchanged. Logout with a garbage cookie → 204 |
| INV-AUTH-17 | real DB | Wrong `currentPassword` → 401, `passwordHash` unchanged, no tokens revoked. Correct → 204, login with the new password succeeds, old password fails, **every** refresh token of the user (created from 2 different logins = 2 families) revoked |
| INV-AUTH-18 | real DB | Force the token-revocation step to fail → assert `passwordHash` **is still the old value** (rollback); reverse: force the `passwordHash` UPDATE to fail → assert no token revoked |
| INV-AUTH-19 | real DB | Snapshot the `User` row before/after `PATCH /auth/me` → only `nickname`(⚠️C1)/`email`/`avatarUrl`/`updatedAt` change. Sending `role`/`status`/`id`/`passwordHash` in the body → stripped, DB unchanged, no 500 |
| INV-AUTH-20 | real DB | PATCH email duplicate of another user → 409 `AUTH_EMAIL_EXISTS`, DB unchanged (including `updatedAt`). Valid email change → `status` stays `active`, login with the new email succeeds |
| INV-AUTH-21 | integration (fake clock) | 5 consecutive failures → the 6th returns 429 **and** doesn't run bcrypt (measured via response time or a spy). Repeat identically with a **nonexistent** email → assert identical behavior and code. Advance 15 min → login works again. 4 failures then 1 success → 200 |
| INV-AUTH-22 | real DB (concurrency) | Fire 2 concurrent `/auth/refresh` requests with **the same** cookie → both 200 with usable access tokens; exactly **1** child token created (`COUNT(WHERE parent=RT_n) = 1`); the family **not** revoked; the final cookie value is usable. Repeat 50 times to catch rare races. Out-of-G variant: the second request after G → 401 and the family revoked (correctly, it's replay) |
| INV-AUTH-23 | integration | Every error branch of the 7 endpoints: the response has `statusCode`/`error`/`code`/`message`/`timestamp`/`path`, **no** `success`; `error` is a string not an object; `details` only on `VALIDATION_ERROR` and shaped `Record<field, string[]>` |
| INV-AUTH-24 | integration | Every DateTime in `GET /auth/me` matches the UTC ISO 8601 regex (ends with `Z`); the never-logged-in seed user → `lastLoginAt === null` |

Beyond the invariant gate (not replacing the rows above): test that register's P2002 **doesn't**
leak **DUPLICATE_ENTRY**; test the cookie has the right `Path` on both set and clear; test avatar
upload failure → 500 `USER_AVATAR_UPLOAD_FAILED` and `avatarUrl` in the DB unchanged.

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| **C1 — `nickname` or `fullName`?** ENTITY_USER.md + `_FACTS.md` define the field as `nickname` (`varchar(100)`, nullable, "Display name (student); full name (teacher/admin)"). API_AUTH.md uses `fullName` in **both** the `POST /auth/register` body **and** the `PATCH /auth/me` body. API_ERROR_CODES.md's validation example also uses the `fullName` key. But FE spec `admin-profile.spec.md` section 6 returns sample data with the `nickname` key. Three documents, two names, one field | Blocks **the DTO keys of 3 of 7 endpoints** (register, PATCH /me, and GET /me's response) — i.e. the FE–BE contract on the signup and profile screens. If `fullName` is locked, a **column rename** migration `nickname → fullName` is needed and ripples to every module reading `nickname` (spec 02 §3 user list, spec 04 §11 teacher include). If `nickname` is locked, API_AUTH.md and the FE form must change. **No side chosen here** — both are cited by currently-valid documents | - | before coding `POST /auth/register` (the first endpoint of Sprint 1) |
| **The `RefreshToken` table isn't approved.** No `ENTITY_REFRESH_TOKEN.md`; the only definition is PROJECT_KNOWLEDGE.md #16 with 5 columns. The three columns `familyId`, `replacedById`, `revokedReason` are **mandatory** for §6/§8 but exist nowhere | Blocks the whole module's migration; blocks INV-AUTH-11/12/22 (no `familyId` → families can't be revoked; no `revokedReason` → every password change creates a false replay alarm) | - | before Sprint 1 |
| **Grace window G value, and option A or B in §8?** Proposal A + G = 30s | Blocks INV-AUTH-22's behavior and its test row; A requires Redis (infrastructure dependency), B requires loosening how INV-AUTH-10 is stated | - | before coding `/auth/refresh` |
| **No error code for HTTP 429.** API_ERROR_CODES.md lists 429 in the HTTP-status table but the registry has no rate-limit code (`AI_QUOTA_EXCEEDED` is 429 but in the AI group and *proposed, not agreed*) | Blocks §9 and the INV-AUTH-21 test row (currently only HTTP 429 can be locked, not `code`); FE has no handling branch | - | before coding rate limiting |
| **Is `AUTH_TOKEN_INVALID` approved?** In API_ERROR_CODES.md but **not** in `_FACTS.md`'s "Existing error codes" list | Blocks asserting `code` for every non-refresh 401 branch (§9) | - | together with the row above |
| **Token of a `suspended` user rejected with 401 or 403?** ENTITY_USER.md: "status = suspended → all JWT tokens rejected (401)". API_ERROR_CODES.md: `AUTH_ACCOUNT_SUSPENDED = 403` | Blocks §5, §9 and the INV-AUTH-15 test. Not a small difference: FE usually treats 401 as "try refresh then log out" and 403 as "show a message" — the wrong choice makes FE loop refreshes forever | - | before coding the guard |
| **`SameSite` of the `refresh_token` cookie and CSRF defense for `/auth/refresh`.** No document specifies it. Depends on whether FE (`:3000`) and API (`:3001`) are same-site in production | Blocks cookie configuration; if cross-site, `SameSite=None; Secure` is forced ⇒ default CSRF defense lost ⇒ an `Origin` check or CSRF token must be added — i.e. more FE–BE contract surface | - | before going to an environment with a real domain |
| **Password policy: just "≥ 8 chars" or also "uppercase + number"?** API_AUTH.md says `min8chars`; API_ERROR_CODES.md and the FE profile spec show a stronger rule | Blocks §3 DTO, the `details` messages, seed and tests | - | before coding register |
| **Is email case-sensitive?** ENTITY_USER only says "unique" | Blocks the migration (`citext` / unique on `lower(email)` / app normalization), INV-AUTH-04, and the login flow | - | before the first migration |
| **No forgot/reset-password flow.** No `POST /auth/forgot-password`, `/auth/reset-password`, no `PATCH /admin/users/:id/reset-password` | A user who forgot their password **has no way to recover the account**; combined with no password-change notification (§10), a taken-over account is permanently lost. Blocks operations planning, not Sprint 1 code | - | before go-live |
| **Does an email change revoke tokens / verify the new email?** Currently `PATCH /auth/me` changes the email immediately, no verification, no session revocation | Blocks INV-AUTH-20 (currently stated as "no status change, no revocation"). The classic account-takeover step: a session thief changes the email and keeps control forever | - | before go-live |
| **`hskLevelGoal` and `bio` have no endpoint that can write them.** Not in `PATCH /auth/me`'s body, not in the Users module (status-only) | Both fields will always be `null` in practice; blocks the student "HSK goal" feature and the teacher "bio" feature | - | before Sprint 2 |
| **Envelope of `/auth/me`: `data` or `data.user`?** API_CONVENTIONS.md says `{ "data": {...} }`; FE `admin-profile.spec.md` §3 writes `data.user` for both GET and PATCH | Blocks response parsing on FE for 2 endpoints; the same kind of drift already recorded in spec 02 §16 ⇒ should be locked once for the whole system | - | before coding the profile screen |
| **Max concurrent sessions and `RefreshToken` cleanup policy.** No family/user limit; no expired-token cleanup job | The table grows monotonically (~670 rows/user/week when active); blocks DB operations planning, not code | - | before go-live |
| **Register is a by-design account-enumeration oracle** (`AUTH_EMAIL_EXISTS` 409). Accept, or switch to a neutral "if the email is unused, the account has been created" response? | If accepted: all login anti-enumeration work only reduces part of the risk; if changed: breaks the current API_AUTH.md contract and the signup form UX | - | before go-live |
| **No `AuditLog` table.** No durable place recording who logged in/out/changed password when | Blocks the §13/§14 traceability requirements; incident investigation depends entirely on application log retention | - | before go-live |
| **Cache `User.status` for the guard, and what TTL?** §5 requires a DB read per request | With a cache, INV-AUTH-15 is only true after the TTL ⇒ the invariant must be restated with a max lag; without, each request pays one primary-key query | - | before performance optimization |

*(C2 and C3 in `_FACTS.md` don't touch this module: C2 belongs to the rate/payroll group; C3
touches indirectly — if `status='rejected'` is added, §6.1 and INV-AUTH-05 must add a login error
branch for the new state, for which no error code currently exists. C4 only affects
`hskLevelGoal` at the read level; this module doesn't validate it.)*
