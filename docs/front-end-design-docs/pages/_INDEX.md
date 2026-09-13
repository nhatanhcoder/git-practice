---
status: active
owner: Nhật
last_updated: 2026-09-10
---

# Page Contracts — Index

> Produced by `ai/skills/flow-mapper.md`. One row per screen.
> Contracts live in `<role>-pages/`; this index spans all roles and stays at `pages/` root.
> **Check here first** — if a route already has a contract, reuse it; do not regenerate.
> Page status: `contracted` → `designed` → `built`.
> This is the **page** axis. The matching `specs/**/*.spec.md` files carry their own
> `status: ready-for-design`, which tracks the *spec document*, not the screen.
> The two are deliberately independent — do not try to keep them in sync.

---

## Admin

**▶ [Admin UI Flow + API Map](./admin-pages/admin-flow.md)** — screen-to-screen traversal, every action mapped to its endpoint. Read this first; the table below is the per-screen detail.

> **Design column** = the design baseline the *shipped code* follows. Current baseline is in
> `root-design-fe.md` frontmatter (`design_baseline`). A version lower than that means the
> screen still looks like an older design — fine, update it later. `—` means not built yet,
> so there is nothing to be behind. Only `/design-promote <screen>` changes this column.

| Route | Feature | Contract | Status | Design | Blocked on |
|---|---|---|---|---|---|
| `/admin` | A-DASH-1,2,4 | [admin-dashboard](./admin-pages/admin-dashboard.md) | built | v2 | stats payload shape |
| `/admin/users` | A-USER-1,2,3 | [admin-users-list](./admin-pages/admin-users-list.md) | built | v1 | — |
| `/admin/users/[userId]` | A-USER-4 | [admin-user-detail](./admin-pages/admin-user-detail.md) | built | v1 | role-dependent history payload (mocked in `lib/user-detail-data.js`) |
| `/admin/invoices` | A-INV-4 | [admin-invoice-list](./admin-pages/admin-invoice-list.md) | built | v2 | collection-summary endpoint |
| `/admin/invoices/generate` | A-INV-2 | [admin-invoice-generate](./admin-pages/admin-invoice-generate.md) | built | v2 | preview + batch endpoints |
| `/admin/invoices/[invoiceId]` | A-INV-3,5 | [admin-invoice-detail](./admin-pages/admin-invoice-detail.md) | built | v2 | embedded `payments[]` |
| `/admin/tuition-rates` | A-INV-1 | [admin-tuition-rates](./admin-pages/admin-tuition-rates.md) | built | v2 | **billing model undecided** |
| `/admin/payroll/sessions` | A-PAY-2,3 | [admin-session-review](./admin-pages/admin-session-review.md) | built | v2 | attendance summary in payload |
| `/admin/payroll` | A-PAY-4,7 | [admin-payroll-list](./admin-pages/admin-payroll-list.md) | built | v2 | period boundary undecided |
| `/admin/payroll/[periodId]` | A-PAY-5,6,7 | [admin-payroll-detail](./admin-pages/admin-payroll-detail.md) | built | v2 | **no `GET /admin/payroll/:id`** |
| `/admin/pay-rates` | A-PAY-1 | [admin-pay-rates](./admin-pages/admin-pay-rates.md) | built | v2 | no list endpoint; unit basis undecided |
| `/admin/monitoring` | A-DASH-3 | [admin-monitoring](./admin-pages/admin-monitoring.md) | built | v2 | **all of it** — see contract |
| `/admin/profile` | A-AUTH-4,5,6 | [admin-profile](./admin-pages/admin-profile.md) | built | v1 | — (endpoints defined in [API_AUTH.md](../../api/API_AUTH.md)) |

## Teacher

**▶ [Teacher UI Flow + API Map](./teacher-pages/teacher-flow.md)** — screen-to-screen traversal.
v1 covers the S2 slice (Classes + Lessons), v2 adds Question Bank, Assignments, Grading, Sessions
and Income. **Analytics (T-ANL-1…4) is the only FEATURES_TEACHER area still unmapped.**

| Route | Feature | Contract | Status | Design | Blocked on |
|---|---|---|---|---|---|
| `/teacher` | TODO(feature-id) | [teacher-dashboard](./teacher-pages/teacher-dashboard.md) | built | v1 | no dashboard-aggregation endpoint (KPI row deferred by contract) |
| `/teacher/classes` | T-CLASS-1,2,5 | [teacher-classes-list](./teacher-pages/teacher-classes-list.md) | built | v1 | none — `API-006` settled 2026-09-01 (role-prefixed) |
| `/teacher/classes/[classId]` | T-CLASS-3,4,6 | [teacher-class-detail](./teacher-pages/teacher-class-detail.md) | built | v1 | average score field; attendance rate (S5) |
| `/teacher/classes/[classId]/lessons` | T-LESSON-1,2,4,5 | [teacher-lessons-list](./teacher-pages/teacher-lessons-list.md) | built | v1 | `LESSON_*` codes *proposed, not agreed* — `API-007` closed 2026-09-01, endpoints now defined |
| `/teacher/questions` | T-QB-1,2,4,5,6 | [teacher-question-bank](./teacher-pages/teacher-question-bank.md) | built | v1 | error codes TODO; audio upload mocked |
| `/teacher/assignments` | T-ASGN-1..5 | [teacher-assignments](./teacher-pages/teacher-assignments.md) | built | v1 | **LIVE on /teacher/assignments (S3, 2026-09-11)** — `ASSIGNMENT_*` codes agreed and used; submission stats real from Attempt records; per-student roster names need Sprint 4 `GET /teacher/attempts` |
| `/teacher/grading` | T-GRADE-1..5 | [teacher-grading](./teacher-pages/teacher-grading.md) | built | v1 | error codes TODO |
| `/teacher/sessions` | T-SES-1..7 | [teacher-sessions](./teacher-pages/teacher-sessions.md) | built | v1 | error codes TODO |
| `/teacher/income` | T-INC-1,2,3 | [teacher-income](./teacher-pages/teacher-income.md) | built | v1 | none — both endpoints defined |

Analytics (T-ANL-1…4): _not yet mapped._ Every other Teacher area has a contract above.

> ⚠️ All nine Teacher screens are **fully mocked** — no API call anywhere (`ai/PROGRESS.md`
> § Sprint 2). `built` here means the screen exists and renders, not that the feature works.
> The Teacher **backend** has no module spec either — see
> [`docs/api/modules/_INDEX.md` § 11](../../api/modules/_INDEX.md).

## Student
**▶ [Student SRS & Classes Flow + API Map](./student-pages/student-flow.md)**

| Route | Feature | Contract | Status | Design | Blocked on |
|---|---|---|---|---|---|
| `/student/flashcards` | S-SRS-1..5 | [student-srs](./student-pages/student-srs.md) | built | v1 | vocabulary seed; streak timezone |
| `/student/classes` | S-CLS-1,2 | [student-classes-list](./student-pages/student-classes-list.md) | built | v1 | — |
| `/student/classes/[classId]` | S-CLS-3,4, S-LESSON-1 | [student-class-detail](./student-pages/student-class-detail.md) | built | v1 | — |
| `/student/classes/[classId]/lessons/[lessonId]` | S-LESSON-2,3,4 | [student-lesson-detail](./student-pages/student-lesson-detail.md) | built | v1 | assignments (S-LESSON-3) + supplements (S-LESSON-4) render as unavailable |
| `/student/assignments` | S-ASGN-1 | [student-assignments-list](./student-pages/student-assignments-list.md) | built (live) | v1 | GET list live; ⛔ detail endpoint unimplemented; attempt status badges need PR #73 |
| `/student/notifications` | S-BILL-3 + Notifications table | [student-notifications](./student-pages/student-notifications.md) | built | v1 | — (module 07 live; role-agnostic `/api/v1/notifications` per 07-notifications.md) |
| `/student/mistakes` | S-MSTK | [student-mistakes](./student-pages/student-mistakes.md) | built (mock) | v1 | ⛔ mistake-collection endpoints (Needs lane) |
| `/student/exams` | S-SELF-7 | [student-exams](./student-pages/student-exams.md) | built (mock) | v1 | ⛔ ADR-005 is a 0-byte stub (DOC-017); exam transport contract |
| `/student/placement` | S-SELF-7 | [student-placement](./student-pages/student-placement.md) | built (mock) | v1 | ⛔ ADR-005 stub (DOC-017); placement contract |
| `/student/progress` | S-ANL-1,2 | [student-progress](./student-pages/student-progress.md) | built (mock) | v1 | ⛔ paths reserved, response shape unapproved (analytics module spec) |
| `/student/leaderboard` | S-ANL-4, S-GAME-5 | [student-leaderboard](./student-pages/student-leaderboard.md) | built (mock) | v1 | ⛔ aggregation + privacy rules |
| `/student/badges` | S-GAME-4 | [student-badges](./student-pages/student-badges.md) | built (mock) | v1 | ⛔ server-authoritative unlock contract |
| `/student/writing` | S-SELF-4 | [student-writing](./student-pages/student-writing.md) | built (mock) | v1 | ⛔ DOC-011 corpus + progress contract |
| `/student/lego` | S-SELF-5 | [student-lego](./student-pages/student-lego.md) | built (mock) | v1 | ⛔ DOC-011 corpus + progress contract |
| `/student/workplace` | S-SELF-6 | [student-workplace](./student-pages/student-workplace.md) | built (mock) | v1 | ⛔ DOC-011 corpus + scorer contract |
| `/student/foundation` | S-SELF-2,9 | [student-foundation](./student-pages/student-foundation.md) | contracted (proposed) | — | ⛔ source, schema, API and media approval |
| `/student/grammar` | S-SELF-3,9 | [student-grammar](./student-pages/student-grammar.md) | contracted (proposed) | — | ⛔ source, schema, API and exercise approval |
| `/student/learning-path` | S-SELF-1,9 | [student-learning-path](./student-pages/student-learning-path.md) | contracted (proposed) | — | ⛔ catalog paths, progress reads/writes |
| `/student/learning-path/[nodeId]` | S-SELF-1,9 | [student-learning-path-node](./student-pages/student-learning-path-node.md) | contracted (proposed) | — | ⛔ catalog read, progress write |

Foundation/Grammar contracts describe a blocked production proposal; their current UI is still mock-backed.

Every built `/student/**` route now has a contract. The `built (mock)` rows are prototype screens with **no approved backend** — their contracts carry the ⛔ blockers and the corresponding entries in `ai/PROGRESS.md` § "Needs from the other lane"; they must not be wired to invented endpoints.

---

## Admin function flow (summary — full traversal in [admin-flow.md](./admin-pages/admin-flow.md))

```
Login ──► /admin  (Dashboard)
            │  KPI tiles double as the work queue
            │
            ├─► ACCOUNTS
            │     /admin/users ──► /admin/users/[userId]
            │        approve · suspend · reactivate
            │
            ├─► BILLING
            │     /admin/tuition-rates          (prerequisite — set rate first)
            │            │
            │            ▼
            │     /admin/invoices/generate      (batch, one month)
            │            │
            │            ▼
            │     /admin/invoices ──► /admin/invoices/[invoiceId]
            │                            record payment · void
            │        unpaid ─► partially_paid ─► paid
            │
            ├─► PAYROLL
            │     /admin/pay-rates              (prerequisite — set rate first)
            │            │
            │            ▼
            │     /admin/payroll/sessions       (approve/reject teacher submissions)
            │            │  approved sessions only
            │            ▼
            │     /admin/payroll ──► /admin/payroll/[periodId]
            │        draft ─► finalized ─► paid
            │
            └─► MONITORING
                  /admin/monitoring             (read-only, blocked on T-GRADE-3)
```

**Two hard orderings.** Both financial branches have a prerequisite screen: no invoice
can be generated before a `StudentTuitionRate` exists, and no payroll period is
meaningful before a `TeacherPayRate` exists. Each branch's empty state links back to
its rate screen rather than dead-ending.

**Two one-way gates.** `session → approved` and `period → finalized` cannot be undone
in the UI. Both confirm modals must say so in words.

## Open decisions blocking build

| # | Decision | Blocks | Source |
|---|---|---|---|
| 1 | Tuition model — per class / package / month | `/admin/tuition-rates`, all invoicing | FEATURES_ADMIN A-INV-1 |
| 2 | Pay-rate unit basis | `/admin/pay-rates`, payroll totals | FEATURES_ADMIN A-PAY-1 |
| 3 | Payroll period boundary (calendar month?) | `/admin/payroll` create | FEATURES_ADMIN A-PAY-4 |
| 4 | Gemini key model — shared vs per teacher | `/admin/monitoring` entirely | UC-A-005 |
| 5 | Reject-registration behaviour — delete or hold pending | `/admin/users` | UC-A-001 Alternative |

## Missing API surface

Raise these under `## Needs from the other lane` in `ai/PROGRESS.md`:

All of these are now written down under
[`API_ADMIN.md` § Referenced by FE contracts, not yet defined](../../api/API_ADMIN.md)
with a proposed shape, so the two lanes agree on *what is missing*. **None are agreed
or implemented** — a BE owner still has to sign each one off:

- `GET /api/v1/admin/payroll/:id` — period detail + per-session breakdown
- `GET /api/v1/admin/pay-rates` — rate list + history
- `GET /api/v1/admin/tuition-rates` — rate list + history
- `POST /api/v1/admin/invoices/batch` — batch generation (partial-failure semantics undecided)
- `POST /api/v1/admin/invoices/batch/preview` — dry run for `/admin/invoices/generate` step 2
- `GET /api/v1/admin/monitoring/gemini`
- `INVOICE_*`, `RATE_*`, `SESSION_*`, `AI_*` error codes — drafted in
  [`API_ERROR_CODES.md`](../../api/API_ERROR_CODES.md), each marked *proposed, not agreed*
