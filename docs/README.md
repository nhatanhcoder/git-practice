# 📚 HSK Learning Platform — Documentation Index

> **Tech**: Next.js 14 + NestJS + PostgreSQL (Supabase) + MongoDB Atlas  
> **Actors**: Admin · Teacher · Student  
> Last updated: 2026-07

---

## 🗺️ Navigation Map

```
docs/
├── shared/          → Kiến thức nền, áp dụng mọi actor
├── actors/          → Góc nhìn nghiệp vụ theo vai (Admin / Teacher / Student)
├── entities/        → Góc nhìn dữ liệu (PostgreSQL + MongoDB)
├── banks/           → Hệ thống dùng chung: Question Bank, Assignment Bank, Lesson Bank
├── api/             → Hợp đồng API (conventions + endpoint specs)
├── flows/           → Quy trình xuyên actor/entity (sequence diagrams)
├── roadmap/         → Kế hoạch sprint
├── testing/         → Test strategy + test cases
└── diagrams/        → Mermaid source files (ERD, RBAC, architecture)
```

---

## 📂 shared/ — Kiến thức nền

| File | Nội dung |
|------|---------|
| [TECH_STACK.md](shared/TECH_STACK.md) | Quyết định công nghệ, free-tier limits |
| [CONVENTIONS.md](shared/CONVENTIONS.md) | Git workflow, naming, code style |
| [PROJECT_STRUCTURE.md](shared/PROJECT_STRUCTURE.md) | Cấu trúc thư mục chi tiết |
| [DATABASE_SCHEMA.md](shared/DATABASE_SCHEMA.md) | Design principles, entity overview, relationships |
| [ARCHITECTURE.md](shared/ARCHITECTURE.md) | Kiến trúc tổng thể (layers, services) |
| [RBAC_MATRIX.md](shared/RBAC_MATRIX.md) | Ma trận actor × resource × action — nguồn duy nhất cho phân quyền |
| [GLOSSARY.md](shared/GLOSSARY.md) | Thuật ngữ: HSK, SRS, enrollmentCode, easeFactor... |
| [ENVIRONMENT_SETUP.md](shared/ENVIRONMENT_SETUP.md) | Checklist cài đặt môi trường dev |
| [DEPLOYMENT.md](shared/DEPLOYMENT.md) | Deploy lên Vercel + Supabase + MongoDB Atlas |
| [AI_WORKFLOW.md](shared/AI_WORKFLOW.md) | Cách dùng Gemini AI trong platform |
| [AI_FEATURES.md](shared/AI_FEATURES.md) | Chi tiết tính năng AI (grading, suggest score) |
| [decisions/](shared/decisions/) | Architecture Decision Records (ADR) |

---

## 👥 actors/ — Góc nhìn nghiệp vụ

### 👨‍💼 Admin
| File | Nội dung |
|------|---------|
| [FEATURES_ADMIN.md](actors/admin/FEATURES_ADMIN.md) | Danh sách tính năng + priority |
| [USECASES_ADMIN.md](actors/admin/USECASES_ADMIN.md) | Use cases chi tiết |
| [PERMISSIONS_ADMIN.md](actors/admin/PERMISSIONS_ADMIN.md) | Quyền cụ thể, link RBAC_MATRIX |

### 👩‍🏫 Teacher
| File | Nội dung |
|------|---------|
| [FEATURES_TEACHER.md](actors/teacher/FEATURES_TEACHER.md) | Danh sách tính năng + priority |
| [USECASES_TEACHER.md](actors/teacher/USECASES_TEACHER.md) | Use cases chi tiết |
| [PERMISSIONS_TEACHER.md](actors/teacher/PERMISSIONS_TEACHER.md) | Quyền cụ thể, link RBAC_MATRIX |

### 🎓 Student
| File | Nội dung |
|------|---------|
| [FEATURES_STUDENT.md](actors/student/FEATURES_STUDENT.md) | Danh sách tính năng + priority |
| [USECASES_STUDENT.md](actors/student/USECASES_STUDENT.md) | Use cases chi tiết |
| [PERMISSIONS_STUDENT.md](actors/student/PERMISSIONS_STUDENT.md) | Quyền cụ thể, link RBAC_MATRIX |

---

## 🗃️ entities/ — Góc nhìn dữ liệu

> Bảng tra cứu nhanh: [entities/_INDEX.md](entities/_INDEX.md)

### 🐘 PostgreSQL
`ENTITY_USER` · `ENTITY_CLASS` · `ENTITY_CLASS_ENROLLMENT` · `ENTITY_ASSIGNMENT` · `ENTITY_ATTEMPT` · `ENTITY_ATTEMPT_ANSWER` · `ENTITY_CLASS_SESSION` · `ENTITY_SESSION_ATTENDANCE` · `ENTITY_TEACHER_PAY_RATE` · `ENTITY_PAYROLL_PERIOD` · `ENTITY_STUDENT_TUITION_RATE` · `ENTITY_STUDENT_INVOICE` · `ENTITY_TUITION_PAYMENT` · `ENTITY_NOTIFICATION`

### 🍃 MongoDB
`ENTITY_QUESTION` · `ENTITY_FLASHCARD` · `ENTITY_USER_FLASHCARD_STATE` · `ENTITY_LESSON` ⚠️

---

## 🏦 banks/ — Hệ thống dùng chung

| File | Nội dung |
|------|---------|
| [QUESTION_BANK.md](banks/QUESTION_BANK.md) | 8+ sub-types câu hỏi, upload audio, review flow |
| [ASSIGNMENT_BANK.md](banks/ASSIGNMENT_BANK.md) | Assignment gốc vs instance giao lớp |
| [LESSON_BANK.md](banks/LESSON_BANK.md) | Cấu trúc section-based lesson |

---

## 🔌 api/ — Hợp đồng API

| File | Nội dung |
|------|---------|
| [API_CONVENTIONS.md](api/API_CONVENTIONS.md) | Auth header, pagination, error envelope, versioning, timezone |
| [API_AUTH.md](api/API_AUTH.md) | login / register / refresh / reset password |
| [API_ADMIN.md](api/API_ADMIN.md) | Endpoints dành cho Admin |
| [API_TEACHER.md](api/API_TEACHER.md) | Endpoints dành cho Teacher |
| [API_STUDENT.md](api/API_STUDENT.md) | Endpoints dành cho Student |
| [API_ERROR_CODES.md](api/API_ERROR_CODES.md) | Bảng mã lỗi toàn cục |

---

## 🔄 flows/ — Quy trình xuyên actor

| File | Nội dung |
|------|---------|
| [FLOW_AUTH.md](flows/FLOW_AUTH.md) | Đăng ký / Đăng nhập / JWT refresh |
| [FLOW_ENROLLMENT.md](flows/FLOW_ENROLLMENT.md) | Student nhập code → ClassEnrollment |
| [FLOW_ASSIGNMENT_LIFECYCLE.md](flows/FLOW_ASSIGNMENT_LIFECYCLE.md) | Bank → giao lớp → student làm bài → submit |
| [FLOW_GRADING.md](flows/FLOW_GRADING.md) | Submit → chấm → feedback → notification |
| [FLOW_SRS_REVIEW.md](flows/FLOW_SRS_REVIEW.md) | Flashcard review → cập nhật SM-2 state |
| [FLOW_SESSION_ATTENDANCE.md](flows/FLOW_SESSION_ATTENDANCE.md) | Log buổi học + điểm danh |
| [FLOW_PAYROLL_CYCLE.md](flows/FLOW_PAYROLL_CYCLE.md) | Session → duyệt → payroll → paid |
| [FLOW_TUITION_VIETQR.md](flows/FLOW_TUITION_VIETQR.md) | Invoice → VietQR → đối soát thủ công |
| [FLOW_ANALYTICS.md](flows/FLOW_ANALYTICS.md) | Heatmap, progress chart, weak alerts |
| [FLOW_NOTIFICATION.md](flows/FLOW_NOTIFICATION.md) | Trigger → delivery → read |
| [FLOW_VIDEO_SUBMISSION_CLEANUP.md](flows/FLOW_VIDEO_SUBMISSION_CLEANUP.md) | MediaRecorder → R2 → videoExpiresAt → dọn |

---

## 🗺️ roadmap/

| File | Nội dung |
|------|---------|
| [SPRINT_PLAN.md](roadmap/SPRINT_PLAN.md) | Tổng quan 5 sprint |
| [SPRINT_1_AUTH_RBAC.md](roadmap/SPRINT_1_AUTH_RBAC.md) | Sprint 1 |
| [SPRINT_2_CONTENT_SRS.md](roadmap/SPRINT_2_CONTENT_SRS.md) | Sprint 2 |
| [SPRINT_3_PAYMENT_PAYROLL.md](roadmap/SPRINT_3_PAYMENT_PAYROLL.md) | Sprint 3 |
| [SPRINT_4_VIDEO_GRADING.md](roadmap/SPRINT_4_VIDEO_GRADING.md) | Sprint 4 |
| [SPRINT_5_TESTING_POLISH.md](roadmap/SPRINT_5_TESTING_POLISH.md) | Sprint 5 |

---

## 🧪 testing/

| File | Nội dung |
|------|---------|
| [TEST_STRATEGY.md](testing/TEST_STRATEGY.md) | Unit/integration/e2e, coverage, tools |
| [TEST_CASES_BY_ACTOR.md](testing/TEST_CASES_BY_ACTOR.md) | Test cases theo actor |

---

## 📊 diagrams/

| File | Nội dung |
|------|---------|
| [erd.mmd](diagrams/erd.mmd) | Entity Relationship Diagram (Mermaid) |
| [architecture-layers.mmd](diagrams/architecture-layers.mmd) | 5-layer architecture |
| [rbac-matrix.mmd](diagrams/rbac-matrix.mmd) | RBAC matrix visualization |
