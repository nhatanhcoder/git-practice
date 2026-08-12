# 📚 HSK Learning Platform — Documentation Index

> **Tech**: Next.js 14 + NestJS + PostgreSQL (Supabase) + MongoDB Atlas  
> **Actors**: Admin · Teacher · Student  
> Last updated: 2026-07

---

## 🗺️ Navigation Map

```
docs/
├── shared/          → Foundational knowledge, applies to every actor
├── actors/          → Business view by role (Admin / Teacher / Student)
├── entities/        → Data view (PostgreSQL + MongoDB)
├── banks/           → Shared systems: Question Bank, Assignment Bank, Lesson Bank
├── api/             → API contracts (conventions + endpoint specs)
├── flows/           → Cross-actor / cross-entity processes (sequence diagrams)
├── roadmap/         → Sprint plan
├── testing/         → Test strategy + test cases
└── diagrams/        → Mermaid source files (ERD, RBAC, architecture)
```

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
| [decisions/](shared/decisions/) | Architecture Decision Records (ADR) |

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

---

## 🗃️ entities/ — Data view

> Quick lookup table: [entities/_INDEX.md](entities/_INDEX.md)

### 🐘 PostgreSQL
`ENTITY_USER` · `ENTITY_CLASS` · `ENTITY_CLASS_ENROLLMENT` · `ENTITY_ASSIGNMENT` · `ENTITY_ATTEMPT` · `ENTITY_ATTEMPT_ANSWER` · `ENTITY_CLASS_SESSION` · `ENTITY_SESSION_ATTENDANCE` · `ENTITY_TEACHER_PAY_RATE` · `ENTITY_PAYROLL_PERIOD` · `ENTITY_STUDENT_TUITION_RATE` · `ENTITY_STUDENT_INVOICE` · `ENTITY_TUITION_PAYMENT` · `ENTITY_NOTIFICATION`

### 🍃 MongoDB
`ENTITY_QUESTION` · `ENTITY_FLASHCARD` · `ENTITY_USER_FLASHCARD_STATE` · `ENTITY_LESSON` ⚠️

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

---

## 🗺️ roadmap/

| File | Contents |
|------|---------|
| [SPRINT_PLAN.md](roadmap/SPRINT_PLAN.md) | Overview of all sprints |
| [SPRINT_1_AUTH_RBAC.md](roadmap/SPRINT_1_AUTH_RBAC.md) | Sprint 1 |
| [SPRINT_2_CONTENT_SRS.md](roadmap/SPRINT_2_CONTENT_SRS.md) | Sprint 2 |
| [SPRINT_3_PAYMENT_PAYROLL.md](roadmap/SPRINT_3_PAYMENT_PAYROLL.md) | Sprint 3 |
| [SPRINT_4_VIDEO_GRADING.md](roadmap/SPRINT_4_VIDEO_GRADING.md) | Sprint 4 |
| [SPRINT_5_TESTING_POLISH.md](roadmap/SPRINT_5_TESTING_POLISH.md) | Sprint 5 |

---

## 🧪 testing/

| File | Contents |
|------|---------|
| [TEST_STRATEGY.md](testing/TEST_STRATEGY.md) | Unit/integration/e2e, coverage, tools |
| [TEST_CASES_BY_ACTOR.md](testing/TEST_CASES_BY_ACTOR.md) | Test cases by actor |

---

## 📊 diagrams/

| File | Contents |
|------|---------|
| [erd.mmd](diagrams/erd.mmd) | Entity Relationship Diagram (Mermaid) |
| [architecture-layers.mmd](diagrams/architecture-layers.mmd) | 5-layer architecture |
| [rbac-matrix.mmd](diagrams/rbac-matrix.mmd) | RBAC matrix visualization |
