---
title: Backend Module Specs — Admin
status: active
last_updated: 2026-08-19
---

# Backend Module Specs — Admin

> Backend specifications for **the entire Admin area**. 8 modules, ~5,000 lines.
> These are **specs, not code**.
>
> ⚠️ **Scope: Admin only.** The folder name says `modules/`, but every file here specs the Admin
> surface. **The Teacher area has no module spec at all** — see § 11 for what is missing.
>
> **Code status (verified 2026-09-01):** `apps/api` exists — NestJS scaffold, `prisma/schema.prisma`,
> `seed.ts`, health module and migration `20260820000000_init_users` (PR #12). It **implements no
> module**. `packages/` does not exist. So: the scaffold is real, the modules are not.
> (This line previously read *"No backend line has been written yet"* — stale since PR #12.)
>
> Project context: read `docs/BACKEND_PLAN.md` first if you know nothing about the system.

---

## 1. Module map

Module boundaries follow the **transaction boundary**, not tables. Invoice + payment + rate
must share one transaction, so they share one module; session + attendance share one state
machine, so they share one module.

| # | Module | File | Status | Invariants | Blocked by |
|---|---|---|---|---|---|
| 1 | Auth | `01-auth.md` | ✅ `accepted` | 24 | — |
| 2 | Users / Admin Users | `02-users.md` | 🔶 `proposed` | 18 | account lifecycle (C3) |
| 3 | Classes + Enrollment | `03-classes-enrollment.md` | ⛔ `deferred` | 8 | **SCOPE-01 — scope undecided** |
| 4 | Sessions + Attendance | `04-sessions-attendance.md` | 🔶 `proposed` | 16 | SCOPE-01 |
| 5 | Payroll + Pay Rates | `05-payroll.md` | 🔶 `proposed` | 33 | C2 · payroll period boundary · rateType |
| 6 | Billing (rate+invoice+payment) | `06-billing.md` | 🔶 `proposed` | 34 | money representation · tuition model · C2 |
| 7 | Notifications | `07-notifications.md` | 🔶 `proposed` | 21 | no endpoint defined yet |
| 8 | Dashboard / Reporting | `08-dashboard.md` | ⛔ `deferred` | 14 | last, per design |

**168 invariants total.** Each invariant has at least one line in the test matrix (section 15)
of its module — this is the **invariant gate** replacing coverage %.

Only **Auth** is ready to code right now. The other 7 modules await decisions.

## 2. Dependency order

```
Auth ──► Users ──► Classes+Enrollment ──► Sessions+Attendance ──► Payroll
                            │                                        │
                            └──────────────► Billing ◄───────────────┘
                                                 │
                                                 ▼
                                            Dashboard
   Notifications: CALLED by Users · Sessions · Billing — not standalone
```

**Blockers must not be bypassed by reordering.** Session needs User, Teacher, Class, Enrollment
to exist first. This is a mistake made once in an earlier plan version.

## 3. Structure of each file — 16 sections, fixed

```
0  Summary               8  Idempotency & concurrency
1  Tables touched        9  Error → code mapping
2  Endpoints            10  Side effects & notifications
3  DTO                  11  Index & query
4  Invariants           12  Migration & seed
5  Ownership / RBAC     13  Security & rate limit
6  State machine        14  Observability
7  Transaction boundary 15  Test matrix   ← must cover 100% of section 4
                        16  Unresolved
```

Sections 4 and 15 are a pair: **every invariant must have a test**. Section 16 is where
ambiguity is recorded — don't clean it away, record it with an owner and what it blocks.

## 4. Shared conventions — not repeated in each file

Envelope (`API_CONVENTIONS.md`):

```json
{ "data": {...} }                                    // single
{ "data": [...], "meta": { total,page,limit,totalPages } }  // list
                                                     // 204 when no content

{ "statusCode":400, "error":"Bad Request", "message":"...",
  "code":"VALIDATION_ERROR", "details":{ "email":["..."] },
  "timestamp":"...", "path":"/api/v1/..." }          // error — FLAT
```

`error` is the HTTP reason phrase string, **not a wrapper object**. No `success` flag.
`details` appears only on `VALIDATION_ERROR`.

- Base URL `/api/v1` · every DateTime **UTC ISO 8601** · pagination `?page=&limit=`
- Error codes taken from `API_ERROR_CODES.md`, **no invented codes**
- `passwordHash` never appears in a response
- Prisma `Decimal` must not leak straight into JSON

## 5. ⚠️ 5 contradictions in source docs

Discovered while writing the specs. **No file has been fixed** — fixing source docs is its own
task requiring approval.

| ID | Contradiction | Consequence |
|---|---|---|
| **C1** | `ENTITY_USER` has a `nickname` field; `API_AUTH.md` register/PATCH uses `fullName` | Blocks the response DTO of all 5 users endpoints. Locking `fullName` = a column-rename migration |
| **C2** | ADR-008 says rates are **append-only**, read via `effectiveFrom <= date ORDER BY DESC LIMIT 1`. But `ENTITY_TEACHER_PAY_RATE` and `ENTITY_STUDENT_TUITION_RATE` say *"set `effectiveTo` on current, create new"* — i.e. an UPDATE of the old row | **Two different SQL statements → two different amounts for the same payroll period.** Most severe |
| **C3** | `User.status` only has `pending / active / suspended`. No `rejected` | The system **has no way to represent "registration rejected"** — rejected profiles stay in `pending` forever |
| **C4** | `User.hskLevelGoal` and `Class.hskLevel` say **1–9**; GLOSSARY + DATABASE_SCHEMA say **1–6** | Wrong validation on either side breaks. Tracked as DOC-004 |
| **C5** | `_FACTS.md` classifies `SESSION_*` as *proposed*, but the "Session Review Errors" section of `API_ERROR_CODES.md` **has no** proposed banner. Conversely `PAYROLL_*` is in the registry but missing from the verified list | Cannot tell which codes are usable now and which await approval |

## 6. Blocking decisions

### Approved 2026-08-16 — but not yet ADRs

Recorded in `ai/context/HANDOFF.md` § 2026-08-16, *Temporary decisions to preserve*.
A line in HANDOFF **is not** an effective architecture decision — HANDOFF holds things that are
temporary and easy to forget. All five must become ADRs before code touches the schema.

| # | Decision | Locked as | ADR needed | Module |
|---|---|---|---|---|
| 1 | Tuition model | flat per month, one rate per student | ADR-013 | 6 |
| 2 | Pay rate unit | dual-mode `per_session` + `per_hour`, **no** `fixed_monthly` | ADR-012 | 5 |
| 3 | Payroll period boundary | calendar month — **still missing** timezone, open/close boundaries, overlap prevention | ADR-012 | 5 |
| 4 | Gemini key | one shared platform key, no BYOK | ADR-014 | 8 |
| 5 | Registration rejection | soft rejection, keep the record | ADR-011 | 2 |

Decision 5 implies a migration: `User.status` currently has **no** `rejected` (see C3 / DOC-005).

### Still unsettled

| # | Decision | Blocks modules |
|---|---|---|
| **A** | **Money representation** — never been asked. Decimal vs integer VND · rounding · JSON serialization. Prisma `Decimal` must not leak straight into the API | 5, 6 |
| **B** | **SCOPE-01** — Classes/Enrollment scope: full or minimal enough for Sessions | 3, 4, 5 |
| **C** | **C2** — two rate-reading formulas contradict (see section 5) | 5, 6 — every money calculation |

## 7. Error-code gaps

The error branches below **have no valid code** in `API_ERROR_CODES.md`:

> Updated 2026-08-19 after `pnpm check:docs` caught 15 violations. Three kinds fixed:
> **(a)** specs invented names while the correct code already existed — CLASS_CODE_INVALID → `CLASS_ENROLL_CODE_INVALID`,
> CLASS_ARCHIVED → `CLASS_ALREADY_ARCHIVED`;
> **(b)** `DUPLICATE_ENTRY` + `INTERNAL_SERVER_ERROR` — the sample filter in §5 has been emitted from the start
> but the registry §3 never registered them; a *Fallback Errors* section has now been added;
> **(c)** `TOO_MANY_REQUESTS` + `PAYROLL_PERIOD_DUPLICATE` — added to the *proposed, not agreed* section.

Still missing, no valid code:

```
payroll   overlapping period · per_hour missing actualStart/End · idempotency-key conflict
          (PAYROLL_PERIOD_FINALIZED is carrying 3 different semantics)
users     wrong status transitions on suspend/activate
billing   the whole INVOICE_* and RATE_* families are *proposed, not agreed*
```

No module invents its own codes. All are marked ⛔ in section 9 of the relevant file.

## 8. Three most severe findings

**Payroll — a mistakenly created `draft` period cannot be cancelled.** Sessions are already
assigned `payrollPeriodId`, and there is no endpoint to unassign. Mistakenly creating one
period **permanently locks** those sessions out of all future payroll periods. No delete/cancel
endpoint for drafts exists in any document.

**Payroll — timezone shifts the month.** `periodStart/End` are `Date`, while `actualStart` is
UTC DateTime. A class at 06:00 VN on 01/07 = `2026-06-30T23:00Z`, landing in the previous month.
Spec 05 anchors the bundling set on `scheduledDate` to stay immune — but must confirm `scheduledDate`
is recorded as a VN-local date.

**Sessions — the data source does not exist.** `GET /admin/sessions/pending` will be
**permanently empty**: there is no endpoint to create a Class, and no endpoint for the three
transitions `scheduled → in_progress → completed_pending`. The session review screen has nothing to review.

## 9. Read by role

| You are | Read |
|---|---|
| Business decision maker | sections 5, 6 of this file → section 16 of each module |
| Auth coder | `01-auth.md` — the only module ready to start |
| Reviewer | section 4 + section 15 of the module under review (invariant ↔ test) |
| DB designer | sections 1, 7, 8, 11, 12 of every module + section 5 of this file |
| Complete newcomer | `docs/BACKEND_PLAN.md` first, then come back here |

## 10. Reliability notes

The specs were written by reading `docs/entities/postgres/*`, `docs/api/*`,
`RBAC_MATRIX.md` directly. Field names, endpoints and error codes **come verbatim from source
docs**, nothing is guessed.

Two corrections vs. notes made while drafting: `docs/shared/decisions/008-append-only-rates.md`
**does exist** in the repo (verified, Status: Accepted, 2026-08-13); `API_TEACHER.md` and
`API_STUDENT.md` also **exist**. They were simply not among the files loaded while drafting.

Wherever source docs contradict each other, the spec **records the contradiction** instead of
picking a side.

## 11. Teacher backend — what is missing

Added 2026-09-01. The Teacher FE is built (9 screens, fully mocked — `ai/PROGRESS.md` § Sprint 2)
and every Teacher endpoint is listed in `docs/api/API_TEACHER.md`, but **no Teacher module spec
exists**. Nothing below has a §4 invariant set, a §7 transaction boundary or a §15 test matrix.

| Teacher area | `API_TEACHER.md` | Module spec | Error codes | Entity spec |
|---|---|---|---|---|
| Classes | ✅ 6 endpoints | ⚠️ partial — module 03 covers them but is `⛔ deferred` on **SCOPE-01** | ✅ `CLASS_*` | ✅ |
| Lessons | ✅ 8 endpoints (added 2026-09-01) | ❌ none | 🔶 `LESSON_*` *proposed* | ✅ |
| Question Bank | ✅ 5 endpoints | ❌ none — and it is **MongoDB**, unlike every module here | ✅ `QUESTION_*` | ✅ |
| Assignments | ✅ 5 endpoints | ❌ none | ✅ `ASSIGNMENT_*` | ✅ |
| Grading | ✅ 4 endpoints | ❌ none | ✅ `ATTEMPT_*` · `AI_*` *proposed* | ✅ |
| Sessions | ✅ 6 endpoints | ⚠️ **half** — module 04 specs only the Admin approve/reject side. The teacher-side create / start / end / attendance / submit transitions are unspecced, which is exactly why `API-004` says `GET /admin/sessions/pending` is permanently empty | ✅ `SESSION_*` | ✅ |
| Income | ✅ 2 endpoints | ⚠️ mentioned once — `05-payroll.md` §235 raises `/api/v1/teacher/payroll` as an open question, does not spec it | ✅ `PAYROLL_*` | ✅ |

**Reading this table:** the foundation is in better shape than the empty column suggests. Entity
specs exist for everything, and error-code families exist for all but Lessons. What is missing is
the **module layer** — invariants, transaction boundaries, state machines, test matrices.

**Suggested order when it gets written** (dependency-first, same rule as §2):

```
Classes+Lessons ──► Question Bank ──► Assignments ──► Attempts+Grading
      │                                                     │
      └──────────────► Sessions (teacher side) ◄────────────┘
                              │
                              ▼
                        Income (read-only)
```

Two things to settle before the first line:
- **Classes+Lessons inherits SCOPE-01.** Module 03 is deferred on it; a Teacher Classes spec
  cannot be more decided than the module it sits on.
- **Question Bank is MongoDB.** Every module in this folder is Prisma/PostgreSQL. The 16-section
  template's §7 (transaction boundary) and §12 (migration) assume SQL; a Mongo module needs those
  two sections rethought, not copied. `DEBT-001` (no cross-DB transactions) applies directly:
  Question lives in Mongo, Assignment in Postgres, and they are linked by `questionIds`.
