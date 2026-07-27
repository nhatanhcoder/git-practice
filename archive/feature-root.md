# 📚 HSK Learning Platform — Documentation Root

> **Platform**: Học tiếng Trung theo chuẩn HSK  
> **Tech**: Next.js 14 (FE) · NestJS (BE) · PostgreSQL · MongoDB  
> **Cập nhật**: 2026-07-10

---

## 🗺️ Doc Map — Tìm tài liệu nhanh

### 🏗️ Architecture
| Tài liệu | Mô tả |
|---------|-------|
| [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) | Tổng quan kiến trúc FE/BE, data flow, ADR |
| [AUTH_FLOW.md](docs/architecture/AUTH_FLOW.md) | JWT access + refresh token, RBAC, login/logout flow |
| [EXAM_ENGINE.md](docs/architecture/EXAM_ENGINE.md) | State machine làm bài, auto-save, timer, auto-grade |
| [SRS_ALGORITHM.md](docs/architecture/SRS_ALGORITHM.md) | SM-2 algorithm, flashcard review queue, SRS stats |
| [DATABASE_SCHEMA.md](docs/architecture/DATABASE_SCHEMA.md) | Full schema PostgreSQL + MongoDB, indexes, relations |

### ⚙️ Setup
| Tài liệu | Mô tả |
|---------|-------|
| [ENVIRONMENT_SETUP.md](docs/setup/ENVIRONMENT_SETUP.md) | Clone, env vars, DB setup, dev scripts |
| [DEPLOYMENT.md](docs/setup/DEPLOYMENT.md) | Vercel + Railway deploy, CI/CD, production checklist |

### 📏 Shared Standards
| Tài liệu | Mô tả |
|---------|-------|
| [TECH_STACK.md](docs/shared/TECH_STACK.md) | Technology choices, free-tier stack, tooling |
| [CONVENTIONS.md](docs/shared/CONVENTIONS.md) | Git, TypeScript, NestJS, Next.js, DB conventions |
| [AI_WORKFLOW.md](docs/shared/AI_WORKFLOW.md) | Solo dev AI workflow, prompt templates, review checklist |
| [API_ERROR_CODES.md](docs/shared/API_ERROR_CODES.md) | Error code registry, response format, exception handling |

### 🎯 Features
| Tài liệu | Mô tả |
|---------|-------|
| [QUESTION_TYPES.md](docs/features/QUESTION_TYPES.md) | 9 HSK question types, schema, auto-grade logic |
| [AI_FEATURES.md](docs/features/AI_FEATURES.md) | Gemini writing grader, weak student detection, quota |
| [PAYROLL_FLOW.md](docs/features/PAYROLL_FLOW.md) | Teacher payroll: session approval → kỳ lương → thanh toán |
| [INVOICE_FLOW.md](docs/features/INVOICE_FLOW.md) | Student invoicing: học phí, thanh toán, lịch sử |
| [CLASS_MANAGEMENT.md](docs/features/CLASS_MANAGEMENT.md) | Class CRUD, enrollment code, student/teacher flows |
| [SESSION_ATTENDANCE.md](docs/features/SESSION_ATTENDANCE.md) | Class session logging, attendance tracking |
| [NOTIFICATION_FLOW.md](docs/features/NOTIFICATION_FLOW.md) | Notification types, triggers, polling strategy |
| [ANALYTICS_FLOW.md](docs/features/ANALYTICS_FLOW.md) | Skill heatmap, progress charts, class statistics |

### 🧪 Testing
| Tài liệu | Mô tả |
|---------|-------|
| [TESTING_STRATEGY.md](docs/testing/TESTING_STRATEGY.md) | Unit / Integration / E2E strategy, templates, coverage |
| [KNOWN_ISSUES.md](docs/testing/KNOWN_ISSUES.md) | Bugs, technical debt, limitations |

### 📋 Planning
| Tài liệu | Mô tả |
|---------|-------|
| [feature.md](feature.md) | Feature overview, actors, sprint schedule, data architecture |
| [SPRINT_PLAN.md](SPRINT_PLAN.md) | Sprint detail, task checklist, definition of done |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Full directory tree, file → task ID mapping |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | High-level overview, entity descriptions |

---

## 🚀 New Developer Checklist

Đọc theo thứ tự này khi bắt đầu:

1. ✅ [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) — 10 phút, hiểu platform là gì
2. ✅ [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) — Kiến trúc tổng thể
3. ✅ [TECH_STACK.md](docs/shared/TECH_STACK.md) — Công nghệ và lý do chọn
4. ✅ [ENVIRONMENT_SETUP.md](docs/setup/ENVIRONMENT_SETUP.md) — Setup local
5. ✅ [CONVENTIONS.md](docs/shared/CONVENTIONS.md) — Quy ước code trước khi viết
6. ✅ [DATABASE_SCHEMA.md](docs/architecture/DATABASE_SCHEMA.md) — Hiểu data model
7. ✅ [feature.md](feature.md) — Biết tất cả features cần build
8. ✅ [SPRINT_PLAN.md](SPRINT_PLAN.md) — Xem task hiện tại

---

## 📊 Sprint Quick Status

| Sprint | Tuần | Focus | Status |
|--------|------|-------|--------|
| **S0** | 1–2 | Foundation: Monorepo, DB, CI/CD | 🔲 Not Started |
| **S1** | 3–4 | Auth + User Management | 🔲 Not Started |
| **S2** | 5–6 | Classes + Enrollment | 🔲 Not Started |
| **S3** | 7–8 | Questions + Assignments | 🔲 Not Started |
| **S4** | 9–10 | Exam Engine + AI Grading | 🔲 Not Started |
| **S5** | 11–12 | SRS Flashcards + Analytics | 🔲 Not Started |
| **S6** | 13–14 | Payroll + Invoicing + Notifications | 🔲 Not Started |
| **S7** | 15–16 | Testing + Polish + Launch | 🔲 Not Started |
