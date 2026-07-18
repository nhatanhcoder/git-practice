# 👨‍💼 Admin — Feature Specification

> **Role**: Administrator  
> **Scope**: Account governance, financial management, system monitoring  
> **Tech**: Next.js 14 (App Router) + NestJS + PostgreSQL (Prisma) + MongoDB

---

## 🔐 Auth & Profile

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-AUTH-1 | Đăng nhập bằng email + password | 🔴 Must | JWT access + refresh token |
| A-AUTH-2 | Đăng xuất | 🔴 Must | Invalidate refresh token |
| A-AUTH-3 | JWT Refresh Token tự động gia hạn | 🔴 Must | Silent re-auth |
| A-AUTH-4 | Đổi mật khẩu | 🟡 Should | Require current password |
| A-AUTH-5 | Cập nhật profile (tên, email) | 🟡 Should | |
| A-AUTH-6 | Upload / thay avatar | 🟢 Could | Supabase Storage |

---

## 👥 User Management

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-USER-1 | Xem danh sách tất cả users | 🔴 Must | Tên, email, role, status, ngày đăng ký, last_login_at (cần thêm cột vào schema, update mỗi lần đăng nhập thành công) |
| A-USER-2 | Duyệt tài khoản đang chờ (pending → active) | 🔴 Must | Trigger: account_approved notification (tách riêng new_teacher_registration / new_student_registration) |
| A-USER-3 | Khóa / Mở khóa tài khoản (active ↔ suspended) | 🔴 Must | Trigger: account_suspended notification |
| A-USER-4 | Xem chi tiết hồ sơ user | 🟡 Should | Thông tin cá nhân, trạng thái tài khoản, lịch sử lớp (enrollment), lịch sử bài nộp (attempts); session history để trống — phụ thuộc Sprint 5 |

---

## 💰 Finance — Invoicing (Student Billing)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-INV-1 | Thiết lập học phí cho từng học sinh (StudentTuitionRate) | 🔴 Must | rateAmount, effectiveFrom — cần chốt mô hình tính (theo lớp / gói / tháng) |
| A-INV-2 | Tạo hóa đơn học phí hàng tháng (StudentInvoice) | 🔴 Must | periodStart, periodEnd, totalAmount — dùng chung bảng invoices/payments với Student (S-BILL-1) |
| A-INV-3 | Ghi nhận thanh toán (TuitionPayment) | 🔴 Must | paymentMethod, transactionReference |
| A-INV-4 | Xem lịch sử hóa đơn & trạng thái (unpaid/partially_paid/paid/void) | 🟡 Should | Admin xem toàn hệ thống; Student chỉ xem của mình |
| A-INV-5 | Void / hủy hóa đơn | 🟢 Could | |

> 📄 Chi tiết: INVOICE_FLOW.md

---

## 💼 Finance — Payroll (Teacher Salary)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-PAY-1 | Thiết lập mức lương giáo viên (TeacherPayRate) | 🔴 Must | per_session / per_hour, effectiveFrom — cần chốt cách tính đơn giá |
| A-PAY-2 | Duyệt buổi học của teacher (completed_pending → approved) | 🔴 Must | Trigger: session_approved notification cho teacher |
| A-PAY-3 | Từ chối buổi học (→ rejected) kèm lý do | 🔴 Must | Trigger: session_rejected + lý do cho teacher |
| A-PAY-4 | Tạo kỳ lương (PayrollPeriod) — draft | 🔴 Must | Tổng hợp các session đã approved; kỳ lương tính theo tháng (cần chốt) |
| A-PAY-5 | Chốt kỳ lương (draft → finalized) | 🔴 Must | |
| A-PAY-6 | Đánh dấu đã trả lương (finalized → paid) | 🟡 Should | |
| A-PAY-7 | Xem lịch sử kỳ lương theo teacher | 🟡 Should | Ngày session, thời lượng, trạng thái, đơn giá, kỳ lương, tổng thu nhập |

> 📄 Chi tiết: PAYROLL_FLOW.md

---

## 📊 Dashboard & Monitoring

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-DASH-1 | Tổng quan users: tổng số, đang chờ duyệt, bị khóa, active classes | 🔴 Must | Tính được ngay từ dữ liệu hiện có |
| A-DASH-2 | Thống kê tài chính: tổng thu học phí, tổng chi lương, tháng hiện tại | 🟡 Should | Điền được sau khi A-INV-2 (Sprint 4) và A-PAY-5 (Sprint 6) hoàn thành |
| A-DASH-3 | Giám sát Gemini API quota & cache hit ratio | 🟡 Should | Tổng lượt gọi, quota còn lại, cache hit ratio; gộp cả lượt gọi từ T-GRADE-3 (AI score) — nên build sau khi T-GRADE-3 thật sự chạy để số liệu có ý nghĩa |
| A-DASH-4 | Sessions pending review (số buổi chờ duyệt) | 🟡 Should | Điền được sau khi Sprint 5 hoàn thành |
| A-DASH-5 | Log hệ thống / audit trail | 🟢 Could | |

---

## 🔔 Notifications Received

| Loại thông báo | Trigger |
|----------------|---------|
| Buổi học mới cần duyệt | Teacher submit session (session_submitted_for_review) |
| Teacher đăng ký mới | Pending teacher registration (new_teacher_registration) |
| Student đăng ký mới | Pending student registration (new_student_registration) |

> 📄 Chi tiết: NOTIFICATION_FLOW.md

---

## 🗺️ User Journey

```
Login
  └─► Dashboard (pending users + pending sessions + payroll/revenue summary)
        ├─► User Management → Approve / Suspend / Xem chi tiết hồ sơ
        ├─► Payroll → Review sessions → Approve/Reject → Create Period → Finalize → Paid
        ├─► Invoicing → Set Tuition Rate → Create Invoice → Record Payment
        └─► Monitoring → Gemini API quota + cache hit ratio
```
