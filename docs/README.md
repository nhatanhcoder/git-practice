# 📚 HSK Learning Platform — Documentation Index

> **Tech**: Next.js 14 (App Router) + NestJS monolith + PostgreSQL + MongoDB Atlas
> **Actors**: Admin · Teacher · Student
> **HSK levels**: 1–9
> Last updated: 2026-09-12

---

## 🚦 Start here

| If you are… | Read |
|---|---|
| An AI agent, first time in this repo | [`AGENTS.md`](../AGENTS.md) (root), then [`init-promt.md`](init-promt.md) |
| Checking what is actually built vs. still mocked | [`../ai/PROGRESS.md`](../ai/PROGRESS.md) |
| Checking known bugs and tech debt | [`../ai/known-issues/KNOWN_ISSUES.md`](../ai/known-issues/KNOWN_ISSUES.md) |
| About to trust a fact two docs disagree on | [`../PROJECT_KNOWLEDGE.md`](../PROJECT_KNOWLEDGE.md) §9 — the Open Conflicts Register |
| Picking up from the last session | newest file in `ai/context/sessions/` |

Repo-root documents: [`AGENTS.md`](../AGENTS.md) · [`PROJECT_KNOWLEDGE.md`](../PROJECT_KNOWLEDGE.md) · [`COWORK_BOOTSTRAP.md`](../COWORK_BOOTSTRAP.md)

> ⚠️ `archive/` holds old, superseded documents (`feature.md`, `feature-root.md`,
> `PROJECT_SUMMARY.md`). Do not use them as a reference.

---

## 🗺️ Navigation Map

```
docs/
├── BACKEND_PLAN.md        → Standalone backend plan (written for a newcomer)
├── init-promt.md          → Mandatory short-form agent rules
├── shared/                → Foundational knowledge, applies to every actor
│   └── decisions/         → Architecture Decision Records (ADR-001 … ADR-016)
├── actors/                → Business view by role (Admin / Teacher / Student)
├── entities/              → Data view (PostgreSQL + MongoDB)
├── banks/                 → Shared systems: Question Bank, Assignment Bank, Lesson Bank
├── api/                   → API contracts (conventions + endpoint specs)
│   └── modules/           → Backend build specs: invariants + transaction boundaries
├── flows/                 → Cross-actor / cross-entity processes (sequence diagrams)
├── front-end-design-docs/ → FE view: page contracts, flow maps, design system
├── content/               → Source-corpus audits (learning-content import)
├── prompts/               → Product-build prompt sets (student-product)
├── roadmap/               → Sprint plan (S0–S9)
├── testing/               → Test strategy, CI, test plans
└── diagrams/              → Mermaid source files (ERD, RBAC, architecture)
```

---

## 📄 Root-level docs

| File | Contents |
|------|---------|
| [BACKEND_PLAN.md](BACKEND_PLAN.md) | Standalone backend plan — written for someone who knows nothing about the project |
| [init-promt.md](init-promt.md) | **Mandatory short form** of the agent rules. Full rules in `../ai/rules/working-rules.md` |

---

## 📂 shared/ — Foundational knowledge

| File | Contents |
|------|---------|
| [TECH_STACK.md](shared/TECH_STACK.md) | Technology decisions, free-tier limits |
| [CONVENTIONS.md](shared/CONVENTIONS.md) | Git workflow, naming, code style |
| [PROJECT_STRUCTURE.md](shared/PROJECT_STRUCTURE.md) | Detailed directory structure |
| [DATABASE_SCHEMA.md](shared/DATABASE_SCHEMA.md) | Design principles, entity overview, relationships |
| [ARCHITECTURE.md](shared/ARCHITECTURE.md) | Overall architecture (layers, services) |
| [RBAC_MATRIX.md](shared/RBAC_MATRIX.md) | Actor × resource × action matrix — the single source of truth for permissions |
| [GLOSSARY.md](shared/GLOSSARY.md) | Terminology: HSK, SRS, enrollmentCode, easeFactor… |
| [ENVIRONMENT_SETUP.md](shared/ENVIRONMENT_SETUP.md) | Dev environment setup checklist |
| [DEPLOYMENT.md](shared/DEPLOYMENT.md) | Deploying to Vercel + Supabase + MongoDB Atlas |
| [AI_WORKFLOW.md](shared/AI_WORKFLOW.md) | How Gemini AI is used in the platform |
| [AI_FEATURES.md](shared/AI_FEATURES.md) | AI feature details (grading, suggested score) |

### 📜 shared/decisions/ — ADRs

| ADR | Title |
|-----|-------|
| [001](shared/decisions/001-monolith-5-layer.md) | Monolith 5-Layer Architecture |
| [002](shared/decisions/002-hybrid-postgres-mongo.md) | Hybrid PostgreSQL + MongoDB |
| [003](shared/decisions/003-lesson-bank-muc1-embedded.md) | Lesson Bank Level 1 — Embedded (⚠️ superseded, see `entities/_INDEX.md`) |
| [004](shared/decisions/004-vietqr-manual-reconciliation.md) | VietQR + Manual Reconciliation for Tuition Payments |
| [005](shared/decisions/005-server-authoritative-exam.md) | Server-authoritative exam |
| [006](shared/decisions/006-external-cron-scheduler.md) | External cron scheduler |
| [007](shared/decisions/007-chart-categorical-palette.md) | Categorical chart palette |
| [008](shared/decisions/008-append-only-rates.md) | **Rates are append-only** — settles the rate-reading formula |
| ~~009~~ | ⚠️ **does not exist** — numbering jumps 008 → 010. `ai/PROGRESS.md` lists "ADR-009 risk-based testing" as not started |
| [010](shared/decisions/010-money-representation.md) | Money Representation in VND |
| [011](shared/decisions/011-user-lifecycle-states.md) | User lifecycle states (incl. the missing `rejected` state) |
| [012](shared/decisions/012-teacher-payroll-and-rates.md) | Teacher Pay Rates & Payroll Period Lifecycle |
| [013](shared/decisions/013-tuition-billing-and-invoices.md) | Student Tuition Billing, Rates, and Invoicing Lifecycle |
| [014](shared/decisions/014-gemini-platform-monitoring.md) | Centralized Gemini Platform Key & AI Monitoring |
| [015](shared/decisions/015-user-display-name-field.md) | User display-name column is `nickname` |
| [016](shared/decisions/016-combined-student-learning-domain.md) | Combined LMS + self-study, SM-2, supplemental practice, gamification |

Template for new ADRs: [ADR_TEMPLATE.md](shared/decisions/ADR_TEMPLATE.md)

---

## 👥 actors/ — Business view

### 👨‍💼 Admin
| File | Contents |
|------|---------|
| [FEATURES_ADMIN.md](actors/admin/FEATURES_ADMIN.md) | Feature list + priority |
| [USECASES_ADMIN.md](actors/admin/USECASES_ADMIN.md) | Detailed use cases |
| [PERMISSIONS_ADMIN.md](actors/admin/PERMISSIONS_ADMIN.md) | Specific permissions, links to RBAC_MATRIX |

### 👩‍🏫 Teacher
| File | Contents |
|------|---------|
| [FEATURES_TEACHER.md](actors/teacher/FEATURES_TEACHER.md) | Feature list + priority |
| [USECASES_TEACHER.md](actors/teacher/USECASES_TEACHER.md) | Detailed use cases |
| [PERMISSIONS_TEACHER.md](actors/teacher/PERMISSIONS_TEACHER.md) | Specific permissions, links to RBAC_MATRIX |

### 🎓 Student
| File | Contents |
|------|---------|
| [FEATURES_STUDENT.md](actors/student/FEATURES_STUDENT.md) | Feature list + priority |
| [USECASES_STUDENT.md](actors/student/USECASES_STUDENT.md) | Detailed use cases |
| [PERMISSIONS_STUDENT.md](actors/student/PERMISSIONS_STUDENT.md) | Specific permissions, links to RBAC_MATRIX |

> Each `actors/<role>/` also holds a `client-demand.txt` — a frozen client-supplied source
> text. `(Read Only)` in its header labels **the document**, not the role's permissions
> (settled as `SCOPE-03`).

---

## 🗃️ entities/ — Data view

> Quick lookup table: [entities/_INDEX.md](entities/_INDEX.md)

> ⚠️ The lists below are a quick glance only and drift easily — **[entities/_INDEX.md](entities/_INDEX.md) is authoritative** for the full set and each entity's status.

### 🐘 PostgreSQL
`ENTITY_USER` · `ENTITY_CLASS` · `ENTITY_CLASS_ENROLLMENT` · `ENTITY_LESSON` · `ENTITY_LESSON_ASSIGNMENT` · `ENTITY_ASSIGNMENT` · `ENTITY_ATTEMPT` · `ENTITY_ATTEMPT_ANSWER` · `ENTITY_CLASS_SESSION` · `ENTITY_SESSION_ATTENDANCE` · `ENTITY_TEACHER_PAY_RATE` · `ENTITY_PAYROLL_PERIOD` · `ENTITY_STUDENT_TUITION_RATE` · `ENTITY_STUDENT_INVOICE` · `ENTITY_TUITION_PAYMENT` · `ENTITY_NOTIFICATION`

### 🍃 MongoDB
`ENTITY_QUESTION` · `ENTITY_FLASHCARD` · `ENTITY_USER_FLASHCARD_STATE`

> `Lesson` was moved from MongoDB to PostgreSQL — see `entities/_INDEX.md` (the MongoDB
> `ENTITY_LESSON.md` is deprecated, ADR-003 superseded).
> Entity specs **outrank** feature docs (`FEATURES_*.md`) when field names differ.

---

## 🏦 banks/ — Shared systems

| File | Contents |
|------|---------|
| [QUESTION_BANK.md](banks/QUESTION_BANK.md) | 8+ question sub-types, audio upload, review flow |
| [ASSIGNMENT_BANK.md](banks/ASSIGNMENT_BANK.md) | Source assignment vs. per-class instance |
| [LESSON_BANK.md](banks/LESSON_BANK.md) | Section-based lesson structure |

---

## 🔌 api/ — API contracts

| File | Contents |
|------|---------|
| [API_CONVENTIONS.md](api/API_CONVENTIONS.md) | Auth header, pagination, error envelope, versioning, timezone |
| [API_AUTH.md](api/API_AUTH.md) | login / register / refresh / reset password |
| [API_ADMIN.md](api/API_ADMIN.md) | Admin endpoints |
| [API_TEACHER.md](api/API_TEACHER.md) | Teacher endpoints |
| [API_STUDENT.md](api/API_STUDENT.md) | Student endpoints |
| [API_ERROR_CODES.md](api/API_ERROR_CODES.md) | Global error code table |

> **Error envelope is FLAT**: `{statusCode, error, code, message, details?, timestamp, path}`.
> No `success` flag, no nested `error` object. Codes are never invented — a branch with no
> registry code is recorded as ⛔, not guessed.
>
> **Route convention**: role-prefixed (`/api/v1/teacher/classes`, `/api/v1/student/classes`) —
> settled as `API-006`.

### 🔧 api/modules/ — Backend build specs

> These are the specs the backend was **coded from**. Each follows a fixed 16-section template
> and carries numbered invariants (`INV-<MODULE>-NN`) that double as the test matrix —
> coverage % is not the gate.

| Group | Specs |
|---|---|
| **Admin** | [01-auth](api/modules/01-auth.md) · [02-users](api/modules/02-users.md) · [03-classes-enrollment](api/modules/03-classes-enrollment.md) · [04-sessions-attendance](api/modules/04-sessions-attendance.md) · [05-payroll](api/modules/05-payroll.md) · [06-billing](api/modules/06-billing.md) · [07-notifications](api/modules/07-notifications.md) · [08-dashboard](api/modules/08-dashboard.md) |
| **Teacher** | [01-classes-lessons](api/modules/teacher/01-classes-lessons.md) · [02-question-bank](api/modules/teacher/02-question-bank.md) · [03-assignments](api/modules/teacher/03-assignments.md) · [04-attempts-grading](api/modules/teacher/04-attempts-grading.md) · [05-sessions](api/modules/teacher/05-sessions.md) · [06-income](api/modules/teacher/06-income.md) |
| **Student** | [01-srs-flashcards](api/modules/student/01-srs-flashcards.md) · [02-foundation-grammar](api/modules/student/02-foundation-grammar.md) |

Start at [api/modules/_INDEX.md](api/modules/_INDEX.md); [_TEMPLATE.md](api/modules/_TEMPLATE.md) is the 16-section skeleton.

⚠️ **Status is per-module and moves.** `_INDEX.md` is authoritative — do not read `proposed`
as `agreed`. The Teacher group is `proposed` throughout.

> `api/modules/student/` also holds `foundation-grammar-source-audit.md` (read-only source audit
> for decisions D1–D5). A third spec, `02-word-bank.md` (word bank, S-SRS-6/7), exists only as
> uncommitted work on `feat/student-word-bank` — **not on `main` yet**, so it is not linked here.

---

## 🎨 front-end-design-docs/ — FE screen design

> The FE pipeline: **flow-mapper** turns a feature into a Page Contract + a per-role Flow Map,
> then **page-designer** turns a contract into a spec for the design tool. See the two skills at
> `.agents/skills/flow-mapper/` and `.agents/skills/page-designer/`.

| File | Contents |
|------|---------|
| [pages/_INDEX.md](front-end-design-docs/pages/_INDEX.md) | **Start here** — one row per screen (route · feature · contract · status · design version), with each role's Flow Map linked at the top of its section |
| [root-design-fe.md](front-end-design-docs/root-design-fe.md) | Design tokens, layout shell, component conventions — the single design source |
| [specs/_DESIGN-SYSTEM.md](front-end-design-docs/specs/_DESIGN-SYSTEM.md) | Shared design-system file pasted alongside each page spec |
| [STUDENT_UI_UX.md](front-end-design-docs/STUDENT_UI_UX.md) | Student UI/UX notes (the original `/student/**` mockups came via `prompts/student-product/`) |

| Contracts | Files | Flow map |
|---|---|---|
| `front-end-design-docs/pages/admin-pages/` | 14 | `admin-flow.md` |
| `front-end-design-docs/pages/teacher-pages/` | 10 | `teacher-flow.md` |
| `front-end-design-docs/pages/student-pages/` | 6 | `student-flow.md` |

> **Student screens are now mapped** (added 2026-09-06 onward): `/student/flashcards`,
> `/student/classes` and `/student/classes/[classId]` are `built`; `/student/foundation` and
> `/student/grammar` are `contracted (proposed)` and **⛔ blocked** on source, schema, API and
> media approval. Per-screen status lives in `pages/_INDEX.md`.

> Design tokens never enter shipped code from a skill directly — a new design becomes the
> baseline only through `/design-promote <screen>`, run by the human after merge.

---

## 🧩 prompts/ — Product-build prompt sets

| Path | Contents |
|------|---------|
| [student-product/](prompts/student-product/) | The prompt set used to build the `/student/**` mockups (dashboard, learning path, grammar, foundation, exams, SRS, etc.) |

---

## 📦 content/ — Source-corpus audits

| File | Contents |
|------|---------|
| [VOCAB_SOURCE_AUDIT.md](content/VOCAB_SOURCE_AUDIT.md) | Audit of the external Hán Lộ corpus as a Flashcard seed source — counts, data defects, import decisions (task A10) |
| [_INDEX.md](content/_INDEX.md) | Index of this set |

> Related: **`DOC-011`** in `ai/known-issues/KNOWN_ISSUES.md` — most of that corpus still lives
> outside this repo, so content import/seed work stays blocked for CI and deploy.

---

## 🔄 flows/ — Cross-actor processes

| File | Contents |
|------|---------|
| [FLOW_AUTH.md](flows/FLOW_AUTH.md) | Register / Login / JWT refresh |
| [FLOW_ENROLLMENT.md](flows/FLOW_ENROLLMENT.md) | Student enters code → ClassEnrollment |
| [FLOW_ASSIGNMENT_LIFECYCLE.md](flows/FLOW_ASSIGNMENT_LIFECYCLE.md) | Bank → assign to class → student takes it → submit |
| [FLOW_GRADING.md](flows/FLOW_GRADING.md) | Submit → grade → feedback → notification |
| [FLOW_SRS_REVIEW.md](flows/FLOW_SRS_REVIEW.md) | Flashcard review → update SM-2 state |
| [FLOW_SESSION_ATTENDANCE.md](flows/FLOW_SESSION_ATTENDANCE.md) | Log a class session + take attendance |
| [FLOW_PAYROLL_CYCLE.md](flows/FLOW_PAYROLL_CYCLE.md) | Session → approval → payroll → paid |
| [FLOW_TUITION_VIETQR.md](flows/FLOW_TUITION_VIETQR.md) | Invoice → VietQR → manual reconciliation |
| [FLOW_ANALYTICS.md](flows/FLOW_ANALYTICS.md) | Heatmap, progress chart, weak-student alerts |
| [FLOW_NOTIFICATION.md](flows/FLOW_NOTIFICATION.md) | Trigger → delivery → read |
| [FLOW_VIDEO_SUBMISSION_CLEANUP.md](flows/FLOW_VIDEO_SUBMISSION_CLEANUP.md) | MediaRecorder → R2 → videoExpiresAt → cleanup |

> ⚠️ `FLOW_ENROLLMENT.md`'s path references are stale — the role `API_<ROLE>.md` file wins
> (settled as `API-006`).

---

## 🗺️ roadmap/

| File | Contents |
|------|---------|
| [SPRINT_PLAN.md](roadmap/SPRINT_PLAN.md) | **All sprints S0–S9** — tasks, features and Definition of Done for each one, in a single file |

> There are no per-sprint files. The `SPRINT_1_AUTH_RBAC.md … SPRINT_5_TESTING_POLISH.md`
> rows that used to sit here came from an abandoned 5-sprint plan; the live plan is S0–S9
> inside `SPRINT_PLAN.md`. Sprint status per lane lives in [`ai/PROGRESS.md`](../ai/PROGRESS.md).
> ⚠️ `ai/PROGRESS.md` and `PROJECT_KNOWLEDGE.md` §6 still carry an older **8-sprint** shape —
> quote sprint numbers from `SPRINT_PLAN.md` (`DOC-012`).

---

## 🧪 testing/

| File | Contents |
|------|---------|
| [TEST_STRATEGY.md](testing/TEST_STRATEGY.md) | Unit / integration / e2e strategy, coverage, tools |
| [TEST_CASES_BY_ACTOR.md](testing/TEST_CASES_BY_ACTOR.md) | Test cases by actor |
| [TEST_PLAN_ADMIN_API.md](testing/TEST_PLAN_ADMIN_API.md) | Admin-API review: invariant coverage matrices + run log |
| [TEACHER_TEST_PLAN_AND_REVIEW.md](testing/TEACHER_TEST_PLAN_AND_REVIEW.md) | Teacher-area test matrix |
| [CI.md](testing/CI.md) | What CI runs, and the isolation limits of the database suites |
| [_INDEX.md](testing/_INDEX.md) | Index of this set |

---

## 📊 diagrams/

| File | Contents |
|------|---------|
| [erd.mmd](diagrams/erd.mmd) | Entity Relationship Diagram (Mermaid) |
| [architecture-layers.mmd](diagrams/architecture-layers.mmd) | 5-layer architecture |
| [rbac-matrix.mmd](diagrams/rbac-matrix.mmd) | RBAC matrix visualization |

---

## 🤖 Agent quick-reference (session workflow)

> ⚠️ **Single source: [`init-promt.md`](init-promt.md).** Update it there, not here — a second
> copy of the rules is how they drift. Full rules live in `../ai/rules/working-rules.md`.

Đọc `AGENTS.md` + 5 file always-loaded, rồi file mới nhất trong `ai/context/sessions/`.

Trước khi làm, trả lời 3 câu:
  - Phiên trước dở dang gì?
  - Việc này là CODE hay DOCS?
  - Có đụng DB schema / auth / RBAC / tiền không?  (có = chờ duyệt, không ngoại lệ)

**FLOW**
  - CODE:  branch → claim PROGRESS 🔶 → plan → CHỜ DUYỆT → code → verify → RECORD → PR
  - DOCS:  branch → plan → CHỜ DUYỆT → viết → check:docs → RECORD → PR

**RECORD** (cả hai loại, không bỏ):
  `ai/PROGRESS.md` · `ai/known-issues/KNOWN_ISSUES.md` · `ai/context/sessions/<ngày>-<tên>.md` · status flag của doc vừa đụng

**KẾT PHIÊN** — đúng 4 dòng: `Đã làm:` · `Đã ghi vào:` (file thật, hoặc KHÔNG) · `Còn chặn:` · `Bạn cần làm:`
