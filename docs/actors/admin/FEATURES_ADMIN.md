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
| A-USER-1 | Xem danh sách tất cả users | 🔴 Must | Filter by role, search by name/email |
| A-USER-2 | Duyệt tài khoản đang chờ (pending → active) | 🔴 Must | Trigger: account_approved notification |
| A-USER-3 | Khóa / Mở khóa tài khoản (active <-> suspended) | 🔴 Must | Trigger: account_suspended notification |
| A-USER-4 | Xem chi tiết hồ sơ user | 🟡 Should | |

---

## 💰 Finance — Invoicing (Student Billing)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-INV-1 | Thiết lập học phí cho từng học sinh (StudentTuitionRate) | 🔴 Must | rateAmount, effectiveFrom |
| A-INV-2 | Tạo hóa đơn học phí hàng tháng (StudentInvoice) | 🔴 Must | periodStart, periodEnd, totalAmount |
| A-INV-3 | Ghi nhận thanh toán (TuitionPayment) | 🔴 Must | paymentMethod, transactionReference |
| A-INV-4 | Xem lịch sử hóa đơn & trạng thái (unpaid/partially_paid/paid/void) | 🟡 Should | |
| A-INV-5 | Void / hủy hóa đơn | 🟢 Could | |

> 📄 Chi tiết: INVOICE_FLOW.md

---

## 💼 Finance — Payroll (Teacher Salary)

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-PAY-1 | Thiết lập mức lương giáo viên (TeacherPayRate) | 🔴 Must | per_session / per_hour, effectiveFrom |
| A-PAY-2 | Duyệt buổi học của teacher (completed_pending → approved) | 🔴 Must | |
| A-PAY-3 | Từ chối buổi học (→ rejected) kèm lý do | 🔴 Must | |
| A-PAY-4 | Tạo kỳ lương (PayrollPeriod) — draft | 🔴 Must | Tổng hợp các session đã approved |
| A-PAY-5 | Chốt kỳ lương (draft → finalized) | 🔴 Must | |
| A-PAY-6 | Đánh dấu đã trả lương (finalized → paid) | 🟡 Should | |
| A-PAY-7 | Xem lịch sử kỳ lương theo teacher | 🟡 Should | |

> 📄 Chi tiết: PAYROLL_FLOW.md

---

## 📊 Dashboard & Monitoring

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| A-DASH-1 | Tổng quan users: tổng số, đang chờ duyệt, bị khóa | 🔴 Must | |
| A-DASH-2 | Thống kê tài chính: tổng thu, tổng chi lương, tháng hiện tại | 🟡 Should | |
| A-DASH-3 | Giám sát API quota (Gemini) | 🟡 Should | |
| A-DASH-4 | Log hệ thống / audit trail | 🟢 Could | |

---

## 🔔 Notifications Received

| Loại thông báo | Trigger |
|----------------|---------|
| Buổi học mới cần duyệt | Teacher submit session |
| Teacher đăng ký mới | Pending teacher registration |
| Student đăng ký mới | Pending student registration |

> 📄 Chi tiết: NOTIFICATION_FLOW.md

---

## 🗺️ User Journey

```
Login
  └─► Dashboard (pending users + payroll alerts)
        ├─► User Management → Approve / Suspend
        ├─► Payroll → Review sessions → Approve/Reject → Create Period → Finalize
        └─► Invoicing → Set Rate → Create Invoice → Record Payment
```
