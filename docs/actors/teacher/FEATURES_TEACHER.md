# 👩‍🏫 Teacher — Feature Specification

> **Role**: Teacher  
> **Scope**: Class management, lesson management, content creation, grading, analytics, attendance, payroll tracking  
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
| T-CLASS-2 | Xem danh sách lớp đang dạy | 🔴 Must | Tên, HSK level, enrollment code, số học sinh, trạng thái |
| T-CLASS-3 | Xem / Tái tạo enrollment code | 🔴 Must | |
| T-CLASS-4 | Xem danh sách học sinh trong lớp | 🔴 Must | Tên, email, ngày tham gia, trạng thái, điểm TB; attendance rate sau Sprint 5 |
| T-CLASS-5 | Archive / đóng lớp | 🟡 Should | status: active → archived |
| T-CLASS-6 | Chỉnh sửa thông tin lớp | 🟡 Should | |

> 📄 Chi tiết: CLASS_MANAGEMENT.md

---

## 📚 Lesson Management

> **Note**: Lesson là entity mới — cần chốt định nghĩa (tài liệu/video/mô tả + quan hệ với assignment) và cơ chế sắp xếp thứ tự trước khi build.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-LESSON-1 | Tạo lesson trong lớp (tiêu đề, mô tả, tài liệu/video) | 🔴 Must | Gắn vào lớp cụ thể |
| T-LESSON-2 | Sắp xếp thứ tự lesson (drag-and-drop hoặc số thứ tự) | 🔴 Must | Học sinh thấy đúng thứ tự |
| T-LESSON-3 | Gắn Assignment vào Lesson | 🔴 Must | 1 lesson → N assignments (hoặc M:N — cần chốt) |
| T-LESSON-4 | Sửa / Xóa lesson | 🟡 Should | |
| T-LESSON-5 | Xem danh sách lesson theo lớp | 🔴 Must | Preview thứ tự + trạng thái |

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
| T-ASGN-3 | Xem danh sách bài đã tạo | 🔴 Must | Title, loại, lớp, hạn nộp, số bài đã nộp, số bài chờ chấm |
| T-ASGN-4 | Xem số học sinh đã nộp / chưa nộp | 🟡 Should | |
| T-ASGN-5 | Chỉnh sửa / Xóa assignment (trước khi có submission) | 🟡 Should | |

---

## ✅ Grading (Chấm bài)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-GRADE-1 | Xem danh sách bài đã nộp cần chấm | 🔴 Must | Filter: class, assignment |
| T-GRADE-2 | Xem chi tiết bài làm của học sinh | 🔴 Must | Từng câu hỏi + đáp án |
| T-GRADE-3 | AI gợi ý điểm cho câu hỏi Writing (Gemini) | 🔴 Must | score + reasoning — chỉ là gợi ý, teacher vẫn chấm tay |
| T-GRADE-4 | Nhập điểm + feedback từng câu hỏi | 🔴 Must | |
| T-GRADE-5 | Hoàn tất chấm → cập nhật trạng thái (graded) | 🔴 Must | Trigger: graded notification cho student |
| T-GRADE-6 | Sửa điểm sau khi đã chấm | 🟢 Could | |

> 📄 Chi tiết: AI_FEATURES.md

---

## 📈 Analytics & Alerts

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-ANL-1 | Xem kết quả theo lớp: biểu đồ điểm, phân bố điểm, tỷ lệ nộp bài | 🔴 Must | Điểm TB từng assignment, distribution chart |
| T-ANL-2 | Danh sách bài nộp của từng học sinh | 🔴 Must | |
| T-ANL-3 | Phát hiện học sinh yếu (weak student alerts) | 🟡 Should | Điểm < ngưỡng threshold (F8.3) |
| T-ANL-4 | Xem progress từng học sinh theo kỹ năng | 🟡 Should | Skill breakdown (Listening / Reading / Writing) từng học sinh |

> 📄 Chi tiết: ANALYTICS_FLOW.md

---

## 🗓️ Sessions & Attendance

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-SES-1 | Tạo buổi học (date, startTime, endTime, topic) | 🔴 Must | status: scheduled |
| T-SES-2 | Bắt đầu buổi học (ghi actualStartTime) | 🔴 Must | So sánh với giờ dự kiến để phát hiện dạy trễ/dạy bù |
| T-SES-3 | Ghi điểm danh học sinh (present / absent_excused / absent_unexcused) | 🔴 Must | |
| T-SES-4 | Kết thúc buổi học (ghi actualEndTime, notes) | 🔴 Must | |
| T-SES-5 | Nộp buổi học để admin duyệt (→ completed_pending) | 🔴 Must | Phục vụ tính lương Sprint 6 |
| T-SES-6 | Xem trạng thái duyệt (approved / rejected + lý do) | 🟡 Should | |
| T-SES-7 | Xem lịch sử buổi học & ghi chú review của Admin | 🟡 Should | Ngày, chủ đề, giờ thực tế, trạng thái, điểm danh |

> 📄 Chi tiết: SESSION_ATTENDANCE.md

---

## 💵 Income (Xem thu nhập)

> **Note**: Chỉ là phần xem — module tính lương nằm ở Admin (A-PAY-4/5). Chỉ session đã approved mới được tính vào lương. Cần chốt: pay rate cố định hay theo lớp/giờ, kỳ lương tính theo tháng hay chu kỳ khác.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| T-INC-1 | Xem thu nhập theo tháng (sessions approved) | 🔴 Must | |
| T-INC-2 | Xem chi tiết từng kỳ lương (PayrollPeriod) | 🟡 Should | status: draft / finalized / paid |
| T-INC-3 | Xem lịch sử tất cả kỳ lương | 🟡 Should | Danh sách session trong kỳ, đơn giá/buổi, tổng tiền |

---

## 🔔 Notifications Received

| Loại thông báo | Trigger |
|----------------|---------|
| Tài khoản được duyệt | Admin approve account |
| Tài khoản bị khóa | Admin suspend account |
| Session được duyệt | Admin approve session |
| Session bị từ chối (kèm lý do) | Admin reject session |

> 📄 Chi tiết: NOTIFICATION_FLOW.md

---

## 🗺️ User Journey

```
Register → (wait admin approval) → Login
  └─► Dashboard
        ├─► Classes → Create Class → Share enrollment code
        │     ├─► Lessons → Tạo lesson → Sắp xếp thứ tự → Gắn assignment
        │     └─► Session → Log → Mark attendance → Submit for approval
        ├─► Question Bank → Create questions (Listening/Reading/Writing)
        │     └─► Assignments → Create from questions → Assign to class
        ├─► Grading → Review submissions → AI suggest (Gemini) → Enter score + feedback
        ├─► Analytics → Class dashboard (score chart, submission rate, weak students, skill breakdown)
        └─► Income → View monthly earnings → Payroll history
```
