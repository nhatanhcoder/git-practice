# 👩‍🏫 Teacher — Feature Specification

> **Role**: Teacher  
> **Scope**: Class management, content creation, grading, attendance, payroll tracking  
> **Tech**: Next.js 14 (App Router) + NestJS + PostgreSQL (Prisma) + MongoDB

---

## 🔐 Auth & Profile

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-AUTH-1 | Đăng ký tài khoản (chờ admin duyệt) | 🔴 Must | status = pending |
| T-AUTH-2 | Đăng nhập bằng email + password | 🔴 Must | JWT access + refresh token |
| T-AUTH-3 | Đăng xuất | 🔴 Must | |
| T-AUTH-4 | JWT Refresh Token tự động gia hạn | 🔴 Must | Silent re-auth |
| T-AUTH-5 | Đổi mật khẩu | 🟡 Should | |
| T-AUTH-6 | Cập nhật profile (tên, bio) + upload avatar | 🟡 Should | Supabase Storage |

---

## 🏫 Class Management

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-CLASS-1 | Tạo lớp học (tên, HSK level) | 🔴 Must | Auto-generate 8-char enrollmentCode |
| T-CLASS-2 | Xem danh sách lớp đang dạy | 🔴 Must | |
| T-CLASS-3 | Xem / Tái tạo enrollment code | 🔴 Must | |
| T-CLASS-4 | Xem danh sách học sinh trong lớp | 🔴 Must | |
| T-CLASS-5 | Archive / đóng lớp | 🟡 Should | status: active → archived |
| T-CLASS-6 | Chỉnh sửa thông tin lớp | 🟡 Should | |

> 📄 Chi tiết: CLASS_MANAGEMENT.md

---

## 📝 Question Bank

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-QB-1 | Tạo câu hỏi Listening | 🔴 Must | Upload audio, chọn sub-type |
| T-QB-2 | Tạo câu hỏi Reading | 🔴 Must | Passage + questions |
| T-QB-3 | Tạo câu hỏi Writing | 🔴 Must | Prompt, rubric |
| T-QB-4 | Xem / tìm kiếm câu hỏi trong ngân hàng | 🔴 Must | Filter: skill, HSK level, sub-type |
| T-QB-5 | Sửa / Xóa câu hỏi | 🟡 Should | |
| T-QB-6 | Xem preview câu hỏi | 🟡 Should | |

**8+ Sub-types hỗ trợ:**

| Skill | Sub-Type |
|-------|----------|
| Listening | multiple_choice_single, true_false_not_given, short_answer |
| Reading | multiple_choice_single, multiple_choice_multi, true_false_not_given, fill_in_blank, sentence_ordering, matching |
| Writing | sentence_construction, essay |

> 📄 Chi tiết: QUESTION_TYPES.md

---

## 📋 Assignments & Tests

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-ASGN-1 | Tạo Assignment từ ngân hàng câu hỏi | 🔴 Must | Chọn lớp, dueDate, câu hỏi |
| T-ASGN-2 | Tạo Mock Test (có giới hạn thời gian) | 🔴 Must | timeLimitMinutes |
| T-ASGN-3 | Xem danh sách bài đã tạo | 🔴 Must | |
| T-ASGN-4 | Xem số học sinh đã nộp / chưa nộp | 🟡 Should | |
| T-ASGN-5 | Chỉnh sửa / Xóa assignment (trước khi có submission) | 🟡 Should | |

---

## ✅ Grading (Chấm bài)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-GRADE-1 | Xem danh sách bài đã nộp cần chấm | 🔴 Must | Filter: class, assignment |
| T-GRADE-2 | Xem chi tiết bài làm của học sinh | 🔴 Must | Từng câu hỏi + đáp án |
| T-GRADE-3 | AI gợi ý điểm cho câu hỏi Writing (Gemini) | 🔴 Must | score + reasoning |
| T-GRADE-4 | Nhập điểm + feedback từng câu hỏi | 🔴 Must | |
| T-GRADE-5 | Hoàn tất chấm → cập nhật trạng thái (graded) | 🔴 Must | Trigger: graded notification |
| T-GRADE-6 | Sửa điểm sau khi đã chấm | 🟢 Could | |

> 📄 Chi tiết: AI_FEATURES.md

---

## 📈 Analytics & Alerts

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-ANL-1 | Xem kết quả theo lớp: biểu đồ điểm, tỷ lệ nộp bài | 🔴 Must | |
| T-ANL-2 | Danh sách bài nộp của từng học sinh | 🔴 Must | |
| T-ANL-3 | Phát hiện học sinh yếu (weak student alerts) | 🟡 Should | Điểm < ngưỡng threshold |
| T-ANL-4 | Xem progress từng học sinh theo kỹ năng | 🟡 Should | |

> 📄 Chi tiết: ANALYTICS_FLOW.md

---

## 🗓️ Sessions & Attendance

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-SES-1 | Tạo buổi học (date, startTime, endTime, topic) | 🔴 Must | status: scheduled |
| T-SES-2 | Bắt đầu buổi học (ghi actualStartTime) | 🔴 Must | |
| T-SES-3 | Ghi điểm danh học sinh (present / absent_excused / absent_unexcused) | 🔴 Must | |
| T-SES-4 | Kết thúc buổi học (ghi actualEndTime, notes) | 🔴 Must | |
| T-SES-5 | Nộp buổi học để admin duyệt (→ completed_pending) | 🔴 Must | |
| T-SES-6 | Xem trạng thái duyệt (approved / rejected) | 🟡 Should | |

> 📄 Chi tiết: SESSION_ATTENDANCE.md

---

## 💵 Income (Xem thu nhập)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-INC-1 | Xem thu nhập theo tháng (sessions approved) | 🔴 Must | |
| T-INC-2 | Xem chi tiết từng kỳ lương (PayrollPeriod) | 🟡 Should | status: draft/finalized/paid |
| T-INC-3 | Xem lịch sử tất cả kỳ lương | 🟡 Should | |

---

## 🔔 Notifications Received

| Loại thông báo | Trigger |
|----------------|---------|
| Tài khoản được duyệt | Admin approve account |
| Tài khoản bị khóa | Admin suspend account |
| Session được duyệt / từ chối | Admin review session |

> 📄 Chi tiết: NOTIFICATION_FLOW.md

---

## 🗺️ User Journey

```
Register → (wait admin approval) → Login
  └─► Dashboard
        ├─► Classes → Create Class → Share enrollment code
        │     └─► Session → Log → Mark attendance → Submit for approval
        ├─► Question Bank → Create questions (Listening/Reading/Writing)
        │     └─► Assignments → Create from questions → Assign to class
        ├─► Grading → Review submissions → AI suggest → Enter score + feedback
        └─► Income → View monthly earnings → Payroll history
```
