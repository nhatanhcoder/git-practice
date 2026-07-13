# 📚 HSK Learning Platform — Feature Overview

> Platform học tiếng Trung theo chuẩn HSK, dành cho Admin / Teacher / Student  
> Tech: Next.js 14 + NestJS + PostgreSQL + MongoDB

---

## 👥 Actors

| Role | Mô tả |
|------|-------|
| **Admin** | Quản lý tài khoản, tài chính (payroll + invoicing), giám sát hệ thống |
| **Teacher** | Tạo lớp, tạo câu hỏi, giao bài, chấm bài, xem lương |
| **Student** | Tham gia lớp, làm bài, ôn từ vựng SRS, xem tiến bộ, xem hóa đơn |

---

## 🗺️ Feature Map

---

### 👨‍💼 ADMIN

#### 🔐 Auth & Profile
- [ ] Đăng nhập / Đăng xuất
- [ ] JWT Refresh Token (tự động gia hạn)
- [ ] Đổi mật khẩu
- [ ] Cập nhật profile + avatar

#### 👥 User Management
- [ ] Duyệt / Khóa tài khoản người dùng
- [ ] Xem danh sách tất cả users (filter, search)

#### 💰 Finance — Invoicing
- [ ] Set học phí cho từng học sinh
- [ ] Tạo hóa đơn học phí theo tháng
- [ ] Ghi nhận thanh toán học phí

#### 💼 Finance — Payroll
- [ ] Set lương giáo viên (per session / per hour)
- [ ] Duyệt / Từ chối buổi học của teacher
- [ ] Tạo và chốt kỳ lương

#### 📊 Dashboard & Monitoring
- [ ] Dashboard thống kê (API quota, user stats)

---

### 👩‍🏫 TEACHER

#### 🔐 Auth & Profile
- [ ] Đăng ký tài khoản (chờ admin duyệt)
- [ ] Đăng nhập / Đăng xuất
- [ ] JWT Refresh Token (tự động gia hạn)
- [ ] Đổi mật khẩu
- [ ] Cập nhật profile + avatar

#### 🏫 Class Management
- [ ] Tạo và quản lý lớp học
- [ ] Tạo mã tham gia lớp (8-char enrollment code)
- [ ] Xem danh sách học sinh trong lớp

#### 📝 Question Bank
- [ ] Tạo ngân hàng câu hỏi HSK (Listening, Reading, Writing)
  - [ ] Upload audio cho câu hỏi Listening
  - [ ] 8+ loại sub-type câu hỏi

#### 📋 Assignments & Tests
- [ ] Tạo Assignment / Mock Test từ ngân hàng câu hỏi

#### ✅ Grading
- [ ] Chấm bài writing của học sinh
  - [ ] AI suggest điểm (Gemini)
  - [ ] Nhập điểm + feedback

#### 📈 Analytics & Alerts
- [ ] Xem kết quả class (biểu đồ, danh sách bài nộp)
- [ ] Phát hiện học sinh yếu (weak student alerts)

#### 🗓️ Sessions & Attendance
- [ ] Log buổi học (topic, attendance, thời gian thực)

#### 💵 Income
- [ ] Xem thu nhập hàng tháng

---

### 🎓 STUDENT (USER)

#### 🔐 Auth & Profile
- [ ] Đăng ký tài khoản (chờ admin duyệt)
- [ ] Đăng nhập / Đăng xuất
- [ ] JWT Refresh Token (tự động gia hạn)
- [ ] Đổi mật khẩu
- [ ] Cập nhật profile + avatar

#### 🏫 Class Participation
- [ ] Tham gia lớp bằng enrollment code

#### 📋 Assignments & Tests
- [ ] Xem danh sách bài tập đã giao
- [ ] Làm bài Assignment / Mock Test
  - [ ] Auto-save đáp án mỗi 2 giây
  - [ ] Đếm ngược cho mock test
  - [ ] Navigation câu hỏi (sidebar)
- [ ] Xem kết quả và feedback sau khi chấm

#### 🃏 SRS Flashcards
- [ ] Ôn từ vựng bằng Flashcard (SRS - SM-2 Algorithm)
  - [ ] Browse flashcard theo HSK level
  - [ ] Phiên ôn tập: Again / Hard / Good / Easy
  - [ ] Dashboard SRS stats

#### 📊 Progress & Analytics
- [ ] Xem tiến bộ học tập
  - [ ] Heatmap skill × tuần
  - [ ] Progress chart theo thời gian

#### 🧾 Billing
- [ ] Xem hóa đơn học phí

---

## 📊 Sprint Schedule

| Sprint | Tuần | Nội dung chính |
|--------|------|---------------|
| **S0** | 1-2 | Foundation: monorepo setup, DB, CI/CD |
| **S1** | 3-4 | Auth + User Management + Admin |
| **S2** | 5-6 | Class Management + Enrollment |
| **S3** | 7-8 | Question Bank + Assignments |
| **S4** | 9-10 | Exam Engine + Grading (AI) |
| **S5** | 11-12 | SRS Flashcards + Analytics |
| **S6** | 13-14 | Payroll + Invoicing + Notifications |
| **S7** | 15-16 | Testing + Polish + Deploy |

---

## 🗃️ Data Architecture

| Data | Database | Lý do |
|------|---------|-------|
| Users, Classes, Enrollments | PostgreSQL | Relational, ACID |
| Assignments, Attempts, Answers | PostgreSQL | Relational, transactions |
| Sessions, Payroll, Invoices | PostgreSQL | Financial integrity |
| Notifications | PostgreSQL | Simple, relational |
| Questions | MongoDB | Flexible schema (8+ types) |
| Flashcards | MongoDB | Rich nested content |
| SRS States | MongoDB | Document per user+card |

---

## 🔗 Tài liệu Liên quan

| Tài liệu | Đường dẫn |
|---------|----------|
| **Architecture** | `docs/architecture/ARCHITECTURE.md` |
| Auth Flow | `docs/architecture/AUTH_FLOW.md` |
| Database Schema | `docs/architecture/DATABASE_SCHEMA.md` |
| Exam Engine | `docs/architecture/EXAM_ENGINE.md` |
| SRS Algorithm | `docs/architecture/SRS_ALGORITHM.md` |
| Setup | `docs/setup/ENVIRONMENT_SETUP.md` |
| Deploy | `docs/setup/DEPLOYMENT.md` |
| Tech Stack | `docs/shared/TECH_STACK.md` |
| Conventions | `docs/shared/CONVENTIONS.md` |
| AI Workflow | `docs/shared/AI_WORKFLOW.md` |
| API Errors | `docs/shared/API_ERROR_CODES.md` |
| **Features** | |
| Question Types | `docs/features/QUESTION_TYPES.md` |
| AI Features | `docs/features/AI_FEATURES.md` |
| Class Management | `docs/features/CLASS_MANAGEMENT.md` |
| Session & Attendance | `docs/features/SESSION_ATTENDANCE.md` |
| Notifications | `docs/features/NOTIFICATION_FLOW.md` |
| Analytics | `docs/features/ANALYTICS_FLOW.md` |
| Payroll | `docs/features/PAYROLL_FLOW.md` |
| Invoicing | `docs/features/INVOICE_FLOW.md` |
| Testing | `docs/testing/TESTING_STRATEGY.md` |
| Sprint Plan | `SPRINT_PLAN.md` |
