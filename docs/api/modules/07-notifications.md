---
module: Notifications
status: proposed
blocked_by: NO endpoint of this module is defined in any API_*.md (§2) · no `NOTIFICATION_*` error code exists in API_ERROR_CODES.md (§9) · DEBT-002 60s polling (§16)
owner: -
last_updated: 2026-09-03
---

## 0. Summary

The module owns the `Notification` table and **each user's mailbox**: listing one's own
notifications, marking them read, counting unread ones. The most important boundary: this module
**does not decide when a notification happens** — it is called by other modules (Auth, Users,
Sessions, Billing, Assignments, Grading, Scheduler) to write records into the mailbox. It is the
*destination*, not the *source*. The module owns no display text, no delivery channel (currently
polling only — DEBT-002), deletes nothing, and has no client-facing endpoint to create
notifications.

## 1. Tables touched

| Table | Read/Write | Notes |
|---|---|---|
| `Notification` | Read + Write | Read: only rows with `userId = actor.id`. Write via endpoint: **only** `isRead`, `readAt`. Write via internal service (called by other modules): INSERT. **No UPDATE** of `type`/`referenceId`/`referenceType`/`payload`/`userId`/`createdAt`, **no DELETE** |
| `User` | Read | Only to resolve recipients on fan-out (e.g. `WHERE role='admin' AND status='active'`). This read is done by the **calling module**, not this one. Mailbox-read endpoints **do not join `User`** (the recipient is always the actor) |

The module **does not touch**: `Class`, `ClassSession`, `StudentInvoice`, `PayrollPeriod`…
Notifications only hold `referenceId` + `referenceType` as strings, **no FK** to those tables —
so no join for detail display, and no way to detect dead references (target record deleted/voided).
This is a consequence of the design in ENTITY_NOTIFICATION.md, recorded in §16.

## 2. Endpoints

**This is the first thing to read: none of the endpoints below exist in any document.**

| Method | Path | Role | Description | Status |
|---|---|---|---|---|
| GET | `/api/v1/notifications` | authenticated (any role) | List **one's own** notifications, paginated, newest first | ⛔ **proposed — not defined anywhere** |
| PATCH | `/api/v1/notifications/:id/read` | authenticated (any role) | Mark **one** of one's notifications as read | ⛔ **proposed — not defined anywhere** |
| PATCH | `/api/v1/notifications/read-all` | authenticated (any role) | Mark **all** of one's unread notifications as read | ⛔ **proposed — not defined anywhere** |
| GET | `/api/v1/notifications/unread-count` | authenticated (any role) | One's unread count (red badge on the bell) | ⛔ **proposed — not defined anywhere** |

**What "not defined anywhere" means, verifiably**:
- `API_ADMIN.md` lists 4 endpoint groups (users, payroll, invoicing, dashboard) — **no notification group**.
- `API_ADMIN.md` even has a "⛔ Referenced by FE contracts, not yet defined" section with **7 rows**
  (payroll/:id, pay-rates, tuition-rates, invoices/summary, invoices/batch, invoices/batch/preview,
  monitoring/gemini) — **no notification row**. So notifications aren't even on the "known to be
  missing" list.
- `API_AUTH.md` has none. `API_CONVENTIONS.md`, `API_ERROR_CODES.md` don't mention it.
- `front-end-design-docs/pages/_INDEX.md` lists 13 admin routes — **no notification route**, even
  though `root-design-fe.md` §4.6 describes the bell + badge + "5–6 most recent" dropdown + a
  "**View all**" link. No page exists to receive the "View all" link.
- The `Notification` table is the opposite: **already fully specced** (`ENTITY_NOTIFICATION.md`),
  and **4 other modules have committed to writing to it** (spec 02 §10 INV-USERS-13, spec 04 §10,
  spec 01 §10, ENTITY_STUDENT_INVOICE "On creation → triggers `new_invoice`").

Direct consequence: **the system today has a write side with no read side.** Data will be
produced from Sprint 1 (register → `new_teacher_registration`) and nothing can read it until the
4 endpoints above are approved. The 4 rows in the table are derived from the UI requirements in
`root-design-fe.md` §4.6 + the business rule "Unread count computed from `isRead = false`" of
ENTITY_NOTIFICATION.md — **not** from an agreed API contract. They need a BE owner's sign-off
before coding.

Not proposed: `POST /notifications` (a client must never create its own — RBAC:
`Notification · create (system)` = ❌ for teacher/student), `DELETE /notifications/:id`
(append-only), `PATCH /notifications/:id/unread` (§6 is a one-way gate).

## 3. DTO

### Request

**GET /notifications** — query params (all optional):

| Field | Type | Required | Validation constraint |
|---|---|---|---|
| `page` | int | no | ≥ 1, default `1` (API_CONVENTIONS.md) |
| `limit` | int | no | ≥ 1, default `20`, proposed cap `50` — the bell dropdown only needs `limit=6` (⚠️ cap is **proposed**, API_CONVENTIONS doesn't prescribe) |
| `isRead` | boolean | no | **proposed**. Not sent = both read and unread. `false` = unread only |
| `type` | enum string | no | **proposed**. ∈ the 11 enum values of ENTITY_NOTIFICATION.md. Out-of-enum value → `VALIDATION_ERROR`, not silently ignored |

**PATCH /notifications/:id/read** — path param `id` (uuid, malformed → `VALIDATION_ERROR`). No body.

**PATCH /notifications/read-all** — no params, no body. (Consider `?type=` for "read this whole
group" — **not proposed** for v1; adds surface the UI doesn't need yet.)

**GET /notifications/unread-count** — no parameters.

### Response

**GET /notifications** → `200`

```
{ "data": [ NotificationItem, ... ],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 } }
```

`NotificationItem`:

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | no | |
| `type` | enum (11 values) | no | Full list in §10 |
| `referenceId` | string | yes | ID of the referenced entity |
| `referenceType` | string | yes | ∈ `assignment` \| `attempt` \| `invoice` \| `session`. ⚠️ **no `user` value** → the 4 `account_*`/`*_registration` types must use `null` |
| `isRead` | bool | no | |
| `readAt` | DateTime UTC ISO 8601 | yes | `null` when `isRead=false` |
| `payload` | object (jsonb) | yes | Extra data, e.g. `{ "rejectionReason": "..." }` |
| `createdAt` | DateTime UTC ISO 8601 | no | Primary sort key |

**No `message`, no `title`, no `senderId`.** ENTITY_NOTIFICATION.md defines no column holding
display text ⇒ **notification text has no source in the DB**; FE must build the sentence itself
from `type` + `payload` + `referenceId`. This contradicts `PROJECT_KNOWLEDGE.md` section 15 (that
one has `message`, `data`, `recipientId`, `senderId`) → §16. This spec follows
ENTITY_NOTIFICATION.md + `_FACTS.md`, the verified sources.

**PATCH /notifications/:id/read** → `200` — `{ "data": NotificationItem }` (returns the record
after update, so FE can update `readAt` without re-fetching the list). ⚠️ This shape is
**proposed**; `204` is also valid per API_CONVENTIONS but leaves FE without the `readAt` value.

**PATCH /notifications/read-all** → `200` — `{ "data": { "updated": 7 } }`. ⚠️ **proposed**.
`204` would be simpler but loses the marked count, which FE needs to update the badge without
re-calling `unread-count`.

**GET /notifications/unread-count** → `200` — `{ "data": { "unreadCount": 3 } }`. ⚠️ Field name
**proposed**. Don't use `meta` for this number (`meta` per API_CONVENTIONS.md is reserved for
pagination).

## 4. Business rules (invariants)

| ID | Statement |
|---|---|
| **INV-NOTIF-01** | `Notification` is **append-only**: no endpoint, no job deletes an existing row. A user's row count only grows over time. |
| **INV-NOTIF-02** | After creation, the content fields (`userId`, `type`, `referenceId`, `referenceType`, `payload`, `createdAt`) are **immutable**; the only remaining write path is the `isRead`/`readAt` pair. |
| **INV-NOTIF-03** | `isRead` is a **one-way gate**: `false → true`. No endpoint, parameter, or business path moves `true` back to `false`. |
| **INV-NOTIF-04** | `readAt` is non-null **if and only if** `isRead = true`, and is set exactly once at the first transition; a second read-marking **does not** move `readAt`. |
| **INV-NOTIF-05** | Every query of every endpoint is constrained by `userId = actor.id` at the repository layer; no parameter (query, path, body, header) allows reading or modifying someone else's mailbox. |
| **INV-NOTIF-06** | `unreadCount` **always equals** the count `GET /notifications?isRead=false` reports (`meta.total`) at the same instant — the two endpoints derive from **the same** `userId = me AND isRead = false` condition; there are no two definitions of "unread". |
| **INV-NOTIF-07** | After `PATCH /notifications/read-all` returns, every notification **existing at the time the statement ran** for that user has `isRead = true`; notifications created afterwards remain `false` and that is correct behavior, not a bug. |
| **INV-NOTIF-08** | No path lets a client create a `Notification`: no POST endpoint, and the create service is only callable server-side by business modules. Teacher/Student can never create a notification for anyone. |
| **INV-NOTIF-09** | `type` always belongs to exactly the 11 enum values of ENTITY_NOTIFICATION.md; no value outside the list is ever written to the DB (in particular **no** `payroll_*`, `password_changed`, `account_activated`, `invoice_paid`). |
| **INV-NOTIF-10** | `referenceType` ∈ `{assignment, attempt, invoice, session}` or `null`; no invented value is written. When `referenceType = null`, FE must not infer a deep-link from `referenceId`. |
| **INV-NOTIF-11** | Each row belongs to **exactly one** recipient (`userId` NOT NULL, valid FK); no "broadcast to all" row. Sending to N admins = **N separate rows**. |
| **INV-NOTIF-12** | A business event produces **at most one** notification per **each** recipient: a repeated or retried operation of the same event creates no second row. |
| **INV-NOTIF-13** | The notification INSERT and the business action producing it are in **the same transaction**: no "account approved but no notification" and no "notification for something that never happened". |
| **INV-NOTIF-14** | `payload` only carries auxiliary display data; no system behavior (routing, authorization, counting) depends on `payload` content. Deep-links use only `referenceId` + `referenceType`. |
| **INV-NOTIF-15** | `payload` never contains sensitive data: no `passwordHash`, no tokens, no passwords, no API keys. |
| **INV-NOTIF-16** | List sorted `createdAt DESC` with `id` tie-breaker ⇒ total and stable order: walking all pages yields each row exactly once — no duplicates, no gaps. |
| **INV-NOTIF-17** | `meta.total` is the row count matching the conditions **before** pagination; `meta.totalPages = ceil(total / limit)`; `data.length ≤ limit`. |
| **INV-NOTIF-18** | Every DateTime returned is UTC ISO 8601; `readAt = null` (not empty string) when unread. |

## 5. Ownership / RBAC

RBAC_MATRIX.md has exactly two relevant rows:

| Resource | Action | Admin | Teacher | Student |
|---|---|---|---|---|
| Notification | read own | ✅ | 🔒 | 🔒 |
| Notification | create (system) | ✅ (system) | ❌ | ❌ |

⚠️ **The first row contradicts itself**: the action label is "read **own**" but the Admin cell is
✅ = "Full access (own + others)" per that document's own legend. Read literally, admin can read
anyone's mailbox. This spec **picks the narrow reading** — admin only reads their own mailbox
(INV-NOTIF-05) — because (a) no endpoint accepts someone else's `userId`, (b) notifications carry
other people's business data (invoice amounts, session rejection reasons), (c) widening rights
later is backward compatible while narrowing them isn't. The discrepancy is recorded in §16;
RBAC_MATRIX is not self-corrected.

Two-layer check:

| Layer | Condition | On failure |
|---|---|---|
| Guard | Valid, unexpired token | `401 AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` |
| Service (mandatory) | `actor.status === 'active'` (read from DB — spec 01 §5) | `403 AUTH_ACCOUNT_SUSPENDED` |
| Repository (mandatory, non-negotiable) | **Every** query has `WHERE "userId" = :actorId` — even when `id` is already in the path | see below |
| Service | The `:id` record exists **and** belongs to the actor | 404 (⚠️ no error code yet — §9) |

**The `userId` constraint must live in the repository, not the service.** If the service is left
to remember to add the condition, one forgotten function leaks everyone's mailbox. Safe approach:
the repository function **does not accept** an optional `userId` parameter — it is always
mandatory.

**Someone else's record returns 404, not 403.** Returning 403 confirms "this id exists, it's
just not yours" — enough to probe for the existence of others' notifications. 404 reveals
nothing. (⚠️ Meanwhile, **no error code exists** for 404 in this module — §9.)

## 6. State machine

The module has no complex business state machine; it has exactly **one one-way gate**, and the
notable part is the transitions that **don't exist**.

```
   Business event in another module
   (approve user / reject session / create invoice / register / ...)
              │  INSERT in the SAME transaction as that action (§7)
              ▼
      ┌───────────────────────┐
      │  unread               │   isRead = false, readAt = null
      └───────────┬───────────┘
                  │  PATCH /notifications/:id/read
                  │  PATCH /notifications/read-all   (batch, same gate)
                  ▼
      ┌───────────────────────┐
      │  read                 │   isRead = true,  readAt = <first time>   [END]
      └───────────────────────┘

      ✗ read → unread        : no endpoint, no parameter  (INV-NOTIF-03)
      ✗ * → deleted          : no DELETE, no soft-delete, no archive (INV-NOTIF-01)
      ✗ * → edit content     : type/referenceId/referenceType/payload immutable (INV-NOTIF-02)
```

| From | To | Action | Valid? |
|---|---|---|---|
| — | `unread` | another module calls the create service | ✅ the **only** creation path |
| `unread` | `read` | `PATCH /:id/read` | ✅ sets `readAt = now()` |
| `unread` | `read` | `PATCH /read-all` | ✅ sets `readAt = now()` for every unread row |
| `read` | `read` | `PATCH /:id/read` second time | ✅ **successful no-op** — `readAt` unchanged, no error (§8) |
| `read` | `unread` | — | ❌ doesn't exist |
| any | *deleted* | — | ❌ doesn't exist |
| — | `read` | created already-read | ❌ every notification is born unread |

**Consequence of having only a one-way gate and no deletion**: mailboxes only ever grow. A
teacher teaching 3 sessions/week receives ~150 `session_approved` notifications/year; admins get
one per registration and one per pending session. No archive, no expiry, no retention policy in
any document ⇒ the "View all" page will paginate over an ever-growing set. Recorded in §16.

## 7. Transaction boundary

This is the module's biggest design decision, and it affects **every** module that calls it.

**Question**: is the `Notification` row INSERTed in the same transaction as the business action
that produces it, or after that action commits?

| | **A. Same transaction** | **B. Outside transaction (after commit)** |
|---|---|---|
| Consistency | Absolute: action exists ⇔ notification exists | Can drift: action committed, process dies before writing the notification ⇒ **notification permanently lost, nobody knows** |
| Business risk | A notification-write error **rolls back the business action**: admin's "Approve" click fails just because of a notification bug | Business is safe: a broken notification doesn't affect approval |
| Transaction hold time | Longer; fan-out to N admins sits inside the transaction, holding row locks longer | Shortest |
| Retryability | Not needed: either both happen or neither | Needs a separate retry queue, otherwise a loss stays lost |
| Failure detection | Immediate (request errors) | **Silent** — users only notice when they ask "why wasn't I told" |

**Recommendation: outbox (transactional outbox), which at current scope collapses into A.**

Why the collapse: the current delivery channel is **polling — clients read the `Notification`
table directly** (DEBT-002). That means **the table row itself IS the outbox**: writing the row =
delivering the notification. There is no outbound send step that needs retrying. So today's
specific rules:

1. **INSERT `Notification` sits in the same transaction as the business UPDATE/INSERT.** (Already
   committed to in spec 02 §7 INV-USERS-14 and spec 04 §10 — this spec confirms the general rule,
   doesn't break it.)
2. **Everything leaving the DB sits outside the transaction, running after commit**: push, email,
   webhook, WebSocket when it exists (future). Never call HTTP inside a transaction.
3. **The notification-create service does not open its own transaction** — it **receives** the
   transaction handle from the calling module. If it opens its own, we fall straight into option B
   without anyone noticing.
4. **Reduce A's risk** (business rollback caused by the notification): keep the INSERT step
   trivial — no network, no extra table reads, no computation; validate `type`/`referenceType`
   **before** opening the transaction; fan-out with **one** multi-row insert, not a loop. When an
   INSERT can only fail because the DB is broken, "rollback due to notification" becomes a
   situation where rollback is exactly what we want.

**When to upgrade to a real outbox** (separate `NotificationOutbox` table + worker): as soon as
an outbound channel appears (email/push/WebSocket in Sprint 6 if DEBT-002 is addressed), or when
fan-out grows large enough that the INSERT measurably slows the business transaction. Then:
INSERT the outbox row inside the transaction (keeping atomicity), worker reads and sends outside
the transaction with **at-least-once** semantics + anti-duplicate lock (§8) — because
at-least-once plus duplicate sends is acceptable, while a lost notification is not.

**Isolation level**: `READ COMMITTED` suffices for all flows.
- `PATCH /:id/read`: one conditional UPDATE, **no** explicit transaction needed.
- `PATCH /read-all`: **one** `UPDATE ... WHERE "userId" = :me AND "isRead" = false` — a single
  statement is already atomic; never replace it with "SELECT the list then UPDATE each one"
  (that's both N+1 and opens a race).
- `GET`: read-only. `unread-count` and the list called from the same screen are still two
  independent requests ⇒ **they may legitimately differ by a few seconds**; INV-NOTIF-06 says "at
  the same instant", it doesn't demand two different requests match absolutely.

## 8. Idempotency & concurrency

**`PATCH /:id/read` — idempotent by design.** Guarded UPDATE:

```
UPDATE "Notification" SET "isRead" = true, "readAt" = now()
WHERE id = :id AND "userId" = :me AND "isRead" = false
```

- `rowCount = 1` ⇒ just transitioned.
- `rowCount = 0` ⇒ either already read, or doesn't exist/isn't yours. Re-SELECT to distinguish:
  exists and yours ⇒ return **200 with the current record** (successful no-op, `readAt` **not**
  overwritten — INV-NOTIF-04); otherwise ⇒ 404.
- **No 409 when already read.** Unlike the Users module (second approve = 409 because admin needs
  to know someone handled it first), here clicking a notification twice is normal user behavior
  (click, open tab, click again). Erroring on that is gratuitous annoyance.

**Two concurrent `read` requests on the same `:id`**: only one UPDATE sees `isRead = false`, so
only one sets `readAt`; the other gets `rowCount = 0` → no-op. No extra locking needed.

**`PATCH /read-all` running concurrently with a new notification being created**: the UPDATE only
affects rows visible in its snapshot. A notification committing afterwards **stays unread**, and
the badge may show `1` right after the user clicked "Mark all as read". This is **correct**
behavior (INV-NOTIF-07), not a bug to patch — "fixing" it by table locks or re-scans blocks
business flow just to prettify a badge.

**`read-all` called twice in a row**: the second returns `{ "updated": 0 }` — idempotent, no
error.

**Duplicate prevention on create (INV-NOTIF-12)**: currently **no DB constraint** prevents two
identical rows. Three duplicate sources: (a) the calling module retried at the HTTP layer,
(b) user double-clicking a button, (c) a future at-least-once outbox worker. Current protection:
all calling modules use guarded UPDATEs so the second attempt never reaches the INSERT step
(spec 02 §8 INV-USERS-15) — **uniqueness is currently guaranteed by the caller, not by this
module**. Proposed addition of a local barrier: a **partial** unique on `(userId, type,
referenceId)` for the types tied to a **one-time** event (`account_approved`, `session_approved`,
`session_rejected`, `new_invoice`, `new_teacher_registration`, `new_student_registration`) —
**excluding** the legitimately repeatable types (`deadline_reminder` re-fires, `graded` re-fires
on regrade, `new_assignment` fires once per assignment so it stays safe). This is **proposed**;
the type list must be locked before writing the migration → §16.

**No `Idempotency-Key`**: API_CONVENTIONS.md doesn't define this header.

## 9. Error → code mapping

| Error branch | HTTP | code | Code status |
|---|---|---|---|
| No token / broken token | 401 | `AUTH_TOKEN_INVALID` | in API_ERROR_CODES.md (⚠️ not in `_FACTS.md` — spec 01 §16) |
| Access token expired | 401 | `AUTH_TOKEN_EXPIRED` | exists |
| Actor currently `suspended` | 403 | `AUTH_ACCOUNT_SUSPENDED` | exists |
| `:id` malformed uuid; `page`/`limit`/`type`/`isRead` invalid | 400 | `VALIDATION_ERROR` | exists |
| **`:id` doesn't exist, or belongs to another user** | 404 | ⛔ **no code** | **API_ERROR_CODES.md has no `NOTIFICATION_*` group.** Don't invent → §16 |

**This is the only module in the system with not a single error code of its own.** The registry
has 10 groups (`AUTH_*`, `USER_*`, `CLASS_*`, `QUESTION_*`, `ASSIGNMENT_*`, `ATTEMPT_*`,
`FLASHCARD_*`, `PAYROLL_*`, `SESSION_*`, `INVOICE_*`, `RATE_*`, `AI_*`, `VALIDATION_*`) — none
for notifications. Concrete consequence: the 404 branch (the bulk of this module's error
branches) **can't be coded to a correct contract yet**, and tests can only lock the HTTP status,
not the `code`. This is additional evidence for the §2 conclusion — this module was never
designed on the API side.

Note: `AUTH_INSUFFICIENT_ROLE` is **not** used here (every role reads its own mailbox; the
constraint is ownership, not role).

## 10. Side effects & notifications

Reversed versus other modules: **this module produces no side effects — it IS another module's
side effect.** No mail, no webhook, no business table touched.

### 10.1 Full table: who produces, which type, sent to whom

Source: `ENTITY_NOTIFICATION.md` § Notification Types (11 types) + business rules of the related
entities.

| # | `type` | Module / producing action | Recipient (`userId`) | `referenceId` / `referenceType` | `payload` | Producer path status |
|---|---|---|---|---|---|---|
| 1 | `account_approved` | **Users** — `PATCH /admin/users/:id/approve` | the user just approved (teacher or student) | `user.id` / ⚠️ `null` (enum has no `user`) | — | ✅ endpoint defined; spec 02 §10 |
| 2 | `account_suspended` | **Users** — `PATCH /admin/users/:id/suspend` | the user just locked | `user.id` / ⚠️ `null` | ⚠️ candidate holds the lock reason (FE forces input, `User` has no storage column) — not locked, spec 02 §16 | ✅ endpoint defined |
| 3 | `new_teacher_registration` | **Auth** — `POST /auth/register` with `role='teacher'` | **every** admin (fan-out of N rows) | new `user.id` / ⚠️ `null` | — | ✅ endpoint defined; spec 01 §10 |
| 4 | `new_student_registration` | **Auth** — `POST /auth/register` with `role='student'` | **every** admin (fan-out of N rows) | new `user.id` / ⚠️ `null` | — | ✅ endpoint defined |
| 5 | `new_invoice` | **Billing** — `POST /admin/invoices` (ENTITY_STUDENT_INVOICE: "On creation → triggers `new_invoice`") | `invoice.studentId` | `invoice.id` / `invoice` | ⚠️ not locked (amount? due date? — §16) | ⚠️ endpoint defined but the `INVOICE_*` group and the tuition model are *proposed* |
| 6 | `session_submitted_for_review` | **Sessions (Teacher lane)** — teacher submits a session (`→ completed_pending`) | Admin — ⚠️ **which admin? all?** not locked | `session.id` / `session` | — | ⛔ **no endpoint exists** for teacher submission (API-004) |
| 7 | `session_approved` | **Sessions** — `PATCH /admin/sessions/:id/approve` | `session.teacherId` | `session.id` / `session` | — | ✅ endpoint defined; spec 04 §10 |
| 8 | `session_rejected` | **Sessions** — `PATCH /admin/sessions/:id/reject` | `session.teacherId` | `session.id` / `session` | `{ "rejectionReason": "<verbatim>" }` | ✅ endpoint defined; spec 04 §10 |
| 9 | `new_assignment` | **Assignments (Teacher lane)** — teacher publishes an assignment | **every** `active` student in the class (fan-out by class size) | `assignment.id` / `assignment` | — | ⛔ no `API_TEACHER.md`, no endpoint |
| 10 | `deadline_reminder` | **Scheduler** — cron fires at `dueDate − 24h` | students who haven't submitted that assignment | `assignment.id` / `assignment` | — | ⛔ **no module owns the scheduler**; no doc on cron, on the "not submitted" filter, or on duplicate-send prevention |
| 11 | `graded` | **Grading (Teacher lane)** — teacher finishes grading | `attempt.studentId` | `attempt.id` / `attempt` | — | ⛔ no endpoint yet (T-GRADE-*, Sprint 4) |

**Read this table over time**: 6 of 11 types have a defined producer path (1,2,3,4,7,8), the rest
depend on lanes with no API docs. Meaning: even if the 4 endpoints in §2 get approved and coded,
the **student** mailbox is almost empty (only `account_approved`/`account_suspended`/
`new_invoice`), because the 3 student-facing types (`new_assignment`, `deadline_reminder`,
`graded`) all lack a source.

### 10.2 Actions that **don't** produce notifications (checked, not an omission)

| Action | Why none |
|---|---|
| `PATCH /admin/users/:id/activate` (unlock) | The enum has no type for unlocking — a wrongly-locked user being unlocked **gets no notice** (spec 02 INV-USERS-13) |
| Password/email change (`/auth/*`) | No type; no security signal to the account owner (spec 01 §10) |
| Finalize/pay payroll period (`payroll/:id/finalize`, `/pay`) | No `payroll_*` — teachers aren't told when payroll is finalized or paid (spec 05 §10, Q-PAY-8) |
| Set/change pay rate, tuition rate (`pay-rates`, `tuition-rates`) | No type; plus RBAC `TeacherPayRate read = ❌` for teachers ⇒ teachers **have no way** to know their rate changed |
| Record payment, void invoice (`invoices/:id/payments`, `/void`) | No type — students aren't told when a payment is recorded or an invoice voided |
| Student joins/leaves class | No type — teachers aren't told about new students |

⚠️ `PROJECT_KNOWLEDGE.md` section 15 additionally lists `grading_required`, `weak_student_alert`,
`payroll_finalized`, `invoice_created` — **not** in ENTITY_NOTIFICATION.md's enum. The spec
follows ENTITY_NOTIFICATION.md; the difference is recorded in §16.

### 10.3 The interface called (contract for other modules)

- The calling module **passes its transaction handle in**; the create service does not open its
  own transaction (§7).
- The calling module is responsible for resolving the recipient list (e.g. querying active
  admins); this module only writes.
- Fan-out: **one** multi-row insert for N recipients, no loop (§11).
- The calling module **must not** read/modify created `Notification` rows, even for its own
  events.

## 11. Index & query

```
Notification: INDEX ("userId", "createdAt" DESC, id)                    -- list + stable pagination (INV-NOTIF-16)
Notification: INDEX ("userId") WHERE "isRead" = false   [partial]       -- unread-count + list?isRead=false  ← hottest path
Notification: INDEX ("userId", type, "createdAt" DESC)   [proposed]     -- only if the ?type= filter gets locked
Notification: UNIQUE ("userId", type, "referenceId")     [proposed,
              partial per the type list in §8]                        -- anti-duplicate INV-NOTIF-12
```

**`unread-count` is the highest-frequency query in the whole system, and that's because of
polling.** DEBT-002 sets a 60-second cadence ⇒ every user with an open tab produces
**1 request/minute, forever, even when idle**. 100 online users = ~1.7 req/s continuously just to
display a number; 500 users = ~8.3 req/s. Compare: all admin business (approvals, grading,
payment recording) is tens of requests per hour. Therefore:

- `unread-count` **must** use the **partial index** `WHERE "isRead" = false`. The index only
  holds unread rows — a set that's always small (a few rows/person) while the full table grows
  unbounded (§6). Without it, `COUNT(*)` scans the user's entire history.
- The query must be a DB `COUNT`. `findMany(...).length` is forbidden.
- If it's still heavy later: per-user cached counter with a short TTL (< polling cadence) or a
  denormalized count column — **both make INV-NOTIF-06 only "eventually" true**, so the invariant
  must be restated with its lag before doing either. Don't optimize before measuring.
- If FE calls both `unread-count` and `GET /notifications?limit=6` every cycle, that's
  **2 requests/min/person** — consider dropping `unread-count` entirely and taking the number from
  `meta.total` of `?isRead=false&limit=6` (one request instead of two). That's an API design
  choice to lock → §16.

**N+1 — risks and avoidance**:
1. **Don't join `User`.** The recipient is always the actor; no need to fetch the recipient's
   name. If FE wants to show "**Admin Tuấn** approved your session", it needs the name of the
   **event triggerer** — and `Notification` has **no `senderId`** (§3). Getting that name requires
   joining the business table by `referenceId`, but `referenceId` is a `varchar` with no FK ⇒ no
   relational join ⇒ it becomes **one query per notification**. The only correct way:
   **denormalize the name into `payload`** at creation time. This is the technical reason
   `payload` exists, and it needs locking in §16 together with the "where does notification text
   live" question.
2. **Don't resolve `referenceId` details per row.** 20 notifications across 4 types ⇒ resolving
   each one is 20 queries into 4 different tables. If it's mandatory, group by `referenceType`
   then `WHERE id IN (...)` — one query per type. v1 proposal: **resolve nothing**, FE deep-links
   via `referenceType` + `referenceId`.
3. `meta.total` via a separate `COUNT` with the same `WHERE` clause.

**Table growth**: append-only + fan-out (every registration spawns N rows for N admins; every
assignment spawns N rows for N students) ⇒ this will be one of the two largest tables in the
system alongside `RefreshToken`. No retention policy yet → §16. When needed: partition by
`createdAt` or move old read rows to an archive table — **never delete** (INV-NOTIF-01).

## 12. Migration & seed

**Migration creating the `Notification` table** exactly per ENTITY_NOTIFICATION.md: `id` uuid PK ·
`userId` uuid NOT NULL FK → `User` · `type` enum (11 values; create the Postgres enum type) ·
`referenceId` varchar NULL · `referenceType` varchar NULL · `isRead` bool NOT NULL DEFAULT false ·
`readAt` DateTime NULL · `payload` jsonb NULL · `createdAt`/`updatedAt` DateTime NOT NULL.

Constraints and indexes included:
- FK `userId` — `ON DELETE CASCADE` (no user-deletion path exists so it never fires in practice,
  but it must be declared definitively).
- CHECK `("isRead" = false AND "readAt" IS NULL) OR ("isRead" = true AND "readAt" IS NOT NULL)` —
  turns INV-NOTIF-04 into a DB constraint instead of an app-layer promise. **Proposed, not in any
  doc.**
- CHECK `referenceType IN ('assignment','attempt','invoice','session') OR referenceType IS NULL` —
  locks INV-NOTIF-10 at the DB layer. **Proposed.**
- The two indexes in §11 (main index + partial index for unread).
- Partial unique anti-duplicate: **proposed**, awaiting the type-list decision (§8).

**Migration order**: this table must exist **before** the Auth and Users modules can run, because
register and approve both INSERT into it in the same transaction (§7). So even though the
Notifications module itself is `proposed`, **its table is a hard dependency of Sprint 1**.

**Seed**:
- One mailbox per role (admin/teacher/student) with: ≥1 unread row, ≥1 read row (`readAt` differs
  from `createdAt`), to exercise `unreadCount` and the filter.
- 1 `session_rejected` row with `payload = { rejectionReason: ... }` — exercises the jsonb read
  path.
- 1 `account_approved` row with `referenceType = null` — **mandatory**, so FE can prove it handles
  empty deep-links (§3).
- ≥ 25 rows for one user to test pagination and tie-breaker, including several rows with **the
  same `createdAt`** (INV-NOTIF-16).
- 2 admins + 1 register in the seed to prove fan-out produces 2 rows.
- An **empty** mailbox for at least one user (FE empty state, `unreadCount = 0`, `total = 0`).

## 13. Security & rate limit

**The module's security boundary is exactly one WHERE clause.** Notifications carry other
people's business data: `new_invoice` ties to one student's invoice, `session_rejected` contains
the verbatim reason an admin rejected one teacher's session, `new_*_registration` reveals someone
just signed up. Forgetting `WHERE "userId" = :me` in **one** function leaks the whole system's
mailboxes through an endpoint nobody considers sensitive. Hence §5 puts that constraint in the
repository as a **mandatory** parameter, and §15 tests it as an invariant, not a convenience.

| Topic | Rule |
|---|---|
| Data never exposed | `payload` contains no `passwordHash`, tokens, passwords, API keys (INV-NOTIF-15). Think hard before putting amounts/personal data into `payload` — it will sit unencrypted in the DB and in every request log |
| No existence leak | Someone else's record returns **404**, not 403 (§5) |
| Rate limit | 60s polling is normal behavior, but a broken (or malicious) client can hammer `unread-count`. Proposed **per-user** limit, ~60 req/min for this endpoint group — wide enough for polling + real actions, tight enough to stop an error loop. ⚠️ **proposed**, no doc; and **no 429 error code** (spec 01 §16) |
| Write surface | No create/delete endpoint for clients (INV-NOTIF-08, INV-NOTIF-01) ⇒ the module's write surface is a single one-way boolean — the smallest possible attack surface |
| Audit | No `AuditLog` table. But the `Notification` table is **append-only**, so it is itself a faint trace of business events ("someone was approved at t"). Not a substitute for real audit: it doesn't record **who** caused the event (no `senderId`) |

## 14. Observability

**Logs**:
- Notification creation: `type`, recipient `userId`, `referenceType`/`referenceId`, calling
  module. Debug/info level. Fan-out logs **one line for the whole batch** with the count, not one
  line per recipient.
- Abnormal fan-out (recipient count over a threshold, e.g. > 50) — warn level: sign of a wrong
  loop or a gigantic class.
- 404s on `PATCH /:id/read` — info level with `actorId`: a user hitting many 404s in a row may be
  probing others' ids.
- **Never** log the full `payload` into shared logs (may contain rejection reasons, amounts).

**Measure**:
- **QPS and p95 of `unread-count`** — the hot path (§11); expected p95 < 10ms thanks to the
  partial index. Over threshold = wrong index or the table already needs a retention policy.
- Daily notification count **split by `type`** — detects types never produced (no producer path,
  §10.1) and types produced too much.
- **Read latency**: distribution of `readAt − createdAt`. If p50 vastly exceeds 60s, the badge
  isn't driving action.
- **Never-read ratio**: rows with `isRead = false` and `createdAt` older than 7 days. High =
  notifications being ignored (a product problem, not technical).
- Table size and growth rate (§11) — input for the retention decision in §16.
- **Actual delivery latency = row write time + up to 60s polling.** The 60 seconds is the constant
  of DEBT-002; every SLA claim of "instant notification" is wrong until realtime arrives.

## 15. Test matrix

This is the **invariant gate**: every INV in §4 must have at least one row here. A missing row =
no merge.

| INV | Test type | Description |
|---|---|---|
| INV-NOTIF-01 | integration | Walk every registered route of the app → assert no `DELETE /notifications*` route. Run the whole test suite then assert `COUNT(Notification)` only ever grows, never shrinks |
| INV-NOTIF-02 | real DB | Snapshot the row before/after `PATCH /:id/read` and `/read-all` → only `isRead`, `readAt`, `updatedAt` change; `userId`/`type`/`referenceId`/`referenceType`/`payload`/`createdAt` stay byte-identical |
| INV-NOTIF-03 | integration | No endpoint/parameter returns `isRead` to `false`: try `PATCH /:id/read` with body `{isRead:false}` → body ignored, DB stays `true` |
| INV-NOTIF-04 | real DB | Mark read → `readAt` non-null and near `now()`. Call again 2s later → 200, `readAt` **unchanged**. Assert the CHECK constraint: try a direct DB UPDATE `isRead=true, readAt=null` → constraint violation |
| INV-NOTIF-05 | real DB | Seed mailboxes for user A and user B. With A's token: `GET /notifications` → no element has B's `userId` (verified directly against the DB); `PATCH /:idOfB/read` → 404 **and** B's row in the DB **unchanged**; `PATCH /read-all` with A's token → B's rows stay `isRead=false`; `GET /unread-count` with A's token ≠ the whole system's total |
| INV-NOTIF-06 | real DB | Across several datasets (0 / 1 / 25 unread, mixed with read): `unreadCount` == `meta.total` of `?isRead=false` == `COUNT` run directly on the DB. Repeat **after** each read-marking operation |
| INV-NOTIF-07 | real DB (concurrency) | Seed 10 unread → call `read-all` → `updated=10`, `unreadCount=0`, every row `isRead=true`. Race variant: while `read-all` runs, create 1 new notification → assert the new one **stays unread** and no error. Call `read-all` a second time → `updated=0` |
| INV-NOTIF-08 | integration | Walk registered routes → no `POST /notifications`. Try `POST` → 404/405. Assert the create service is wired to no controller |
| INV-NOTIF-09 | real DB | After running all modules' integration suites: `SELECT DISTINCT type FROM "Notification"` ⊆ exactly the 11 enum values. Try creating with a made-up type via the service → rejected by the DB enum |
| INV-NOTIF-10 | real DB | `SELECT DISTINCT "referenceType"` ⊆ `{assignment, attempt, invoice, session, NULL}`. An `account_approved` notification → `referenceType IS NULL` and the response suggests no deep-link |
| INV-NOTIF-11 | real DB | Register with 2 admins present → **exactly 2** rows, each with a different `userId`, same `type`, same `referenceId`; no row with `userId IS NULL` |
| INV-NOTIF-12 | real DB (concurrency) | Fire 2 concurrent approve requests on the same `:userId` → exactly **1** `account_approved` row. Call approve a second time (sequential) → no second row. Repeat for session reject and invoice creation |
| INV-NOTIF-13 | real DB | Force the `Notification` INSERT to fail (mock/constraint) in the approve flow → assert `User.status` **is still the old value** (rollback) and no orphan notification row. Reverse: force the business UPDATE to fail → no notification written |
| INV-NOTIF-14 | integration | Create two notifications with the same `type`/`referenceId` but different `payload` (one `payload=null`) → all endpoint behavior (list, count, read-marking, deep-link) is identical; `payload=null` causes no error anywhere |
| INV-NOTIF-15 | integration | Serialize every `payload` in the DB after the full suite → assert no `passwordHash`/`token`/`password` keys and no seed hash strings |
| INV-NOTIF-16 | real DB | Seed 25 rows with several **sharing `createdAt`** → walk all pages, collect `id`s → collected set == seeded set, no duplicates, no gaps. Repeat with `limit=6` (bell-dropdown size) |
| INV-NOTIF-17 | real DB | Seed 42 rows, `limit=20` → `total=42`, `totalPages=3`, `data.length=20`; page 3 has 2 elements; with `?isRead=false` on, `total` reflects the filtered set, not the whole mailbox |
| INV-NOTIF-18 | integration | Every DateTime matches the ISO 8601 UTC regex (ends with `Z`); an unread row → `readAt === null` (not empty string, not epoch 0) |

Beyond the invariant gate: test the error envelope has the flat shape of API_CONVENTIONS.md;
test the empty mailbox → `data: []`, `total: 0`, `unreadCount: 0` (not 404, not null); test
`limit` above the cap → `VALIDATION_ERROR` rather than silently truncating.

## 16. Unresolved

| Question | What it blocks | Owner | Decide by |
|---|---|---|---|
| **⛔ All 4 endpoints are undefined in every API document** (§2). They aren't even in API_ADMIN.md's 7-row "not yet defined" list — i.e. never recorded as missing | Blocks the **entire** module: without a contract FE can't wire the header bell (`root-design-fe.md` §4.6), and the data Auth/Users/Sessions/Billing produce is **unreadable by anyone**. Also blocks the "View all" link — no notification route exists in `pages/_INDEX.md` | - | before Sprint 2 (data starts being produced in Sprint 1) |
| **⛔ No `NOTIFICATION_*` error code in API_ERROR_CODES.md** (§9) | Blocks the 404 branch (the bulk of the module's error branches); tests can only lock the HTTP status, not `code`; FE has no dedicated handling branch | - | together with the row above |
| **DEBT-002 — notifications are 60s polling, not realtime.** Status: *Won't Fix (Sprint 6 scope)*, severity Low. No WebSocket, no SSE, no push | (a) Max delivery latency 60s + jitter — every "instant alert" promise is wrong; (b) `unread-count` becomes the system's highest-frequency query (§11) and shapes the whole index strategy; (c) the badge can lag up to 60s after a user acts in another tab; (d) if Sprint 6 enables realtime, §7 must upgrade to a real outbox and §11/§14 must be rewritten. **Do not** design the module as if realtime is imminent | - | acknowledged; revisit at Sprint 6 |
| **Where does notification text live?** ENTITY_NOTIFICATION.md has **no `message`/`title` column**; `PROJECT_KNOWLEDGE.md` section 15 has `message`, `data`, `recipientId`, `senderId` — two different models for the same table | Blocks §3 DTO and all display: either FE builds sentences from `type`+`payload` (i18n keys on FE; BE can't change wording without an FE deploy), or add a column (migration + change every write site). Also blocks the `senderId` question right below | - | before coding the list |
| **No `senderId`** — unknown **who** caused the event | "Which admin approved", "which teacher submitted" can't be derived. Showing the triggerer's name forces denormalizing into `payload` at creation (§11), so this decision locks the `payload` shape for many types | - | together with the row above |
| **`referenceType` has no `user` value** (enum only `assignment`/`attempt`/`invoice`/`session`) | Blocks deep-linking of 4 types: `account_approved`, `account_suspended`, `new_teacher_registration`, `new_student_registration` — exactly the types admins need to click through to `/admin/users/[id]`. Temporarily `null` (§10.1), i.e. the admin bell has items that can't be clicked | - | before coding deep-links |
| **RBAC contradicts for admin**: "Notification · read own" row but Admin cell ✅ (= own + others) | Blocks asserting INV-NOTIF-05. The spec currently picks the narrow reading (admin reads only theirs); if the wide reading is locked, an endpoint accepting `userId` must be added, leak tests added, and §13 rewritten | - | before coding |
| **Admin fan-out: all admins or one admin?** Applies to `new_teacher_registration`, `new_student_registration`, `session_submitted_for_review` | Blocks §10.1: with 3 admins, every registration spawns 3 rows and **all 3 see the same todo item** — no "already handled" mechanism, so 2 people click approve and 1 gets a 409 (spec 02 §8). Also blocks table-size estimates | - | before coding register |
| **No retention/archive policy.** Append-only, no delete, no expiry (§6) | The table grows unbounded; "View all" paginates over an ever-growing set; unknown when partitioning or an archive table is needed | - | before go-live |
| **Which types get UNIQUE anti-duplicate protection** (§8) — `deadline_reminder` and `graded` can legitimately repeat, the rest can't | Blocks the partial-unique migration; without it INV-NOTIF-12 is only indirectly guaranteed by the callers' guarded UPDATEs | - | before migration |
| **Response shape of `read-all` and `unread-count`** (`{updated}` / `{unreadCount}`), and whether to **drop** `unread-count` for `meta.total` from the list (§11) | Blocks the FE contract; directly affects per-person polling requests/min | - | before coding |
| **`PATCH /:id/read` returns 200 with the record or 204?** | Blocks §3 DTO; 204 loses `readAt` on FE and forces a list refetch | - | before coding |
| **Who owns the scheduler for `deadline_reminder`?** No document defines the cron, the "student hasn't submitted" filter, or duplicate prevention on job re-runs | Blocks 1 of 11 types; also the only type not produced by a user action ⇒ needs different infrastructure (job runner, anti-parallel-run lock) | - | before Sprint 4 |
| **6 of 11 types have no producer path** (§10.1: `new_assignment`, `deadline_reminder`, `graded`, `session_submitted_for_review` + `new_invoice`'s dependencies) | The **student** mailbox is almost empty in the early phase; if FE designs the dropdown assuming all kinds of notifications exist, the empty state must be redone | - | before designing the bell UI |
| **What's in the `payload` of `new_invoice` and `account_suspended`?** (amount/due date; lock reason — FE forces input but `User` has no storage column, spec 02 §16) | Blocks §10.1 and INV-NOTIF-15 (putting amounts into `payload` is putting financial data into unencrypted jsonb) | - | before coding Billing/suspend |
| **Rate limit for the polling endpoint group** and the 429 error code | Blocks §13; currently unlimited — a broken client can loop `unread-count` forever | - | before go-live |

*(C1 touches this module indirectly: if `nickname → fullName` is locked, any `payload`
denormalizing a user name must change. C2/C3/C4 don't touch.)*
