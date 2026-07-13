# 👨‍💼 Admin — Use Cases

> Các use case chi tiết cho Admin.  
> Xem danh sách tính năng: [FEATURES_ADMIN.md](./FEATURES_ADMIN.md)  
> Xem quyền: [PERMISSIONS_ADMIN.md](./PERMISSIONS_ADMIN.md)

---

## UC-A-001: Duyệt tài khoản người dùng

**Actor**: Admin  
**Trigger**: Nhận notification "tài khoản mới đang chờ duyệt"  
**Precondition**: User đã đăng ký, status = `pending`

**Main Flow**:
1. Admin vào Dashboard → thấy badge "Pending users"
2. Admin mở danh sách users → filter `status=pending`
3. Admin xem profile user (tên, email, role)
4. Admin click "Approve"
5. System: status `pending → active`, gửi notification `account_approved`
6. User có thể đăng nhập

**Alternative**: Admin click "Reject" → user nhận thông báo, account bị xóa hoặc giữ pending

---

## UC-A-002: Tạo hóa đơn học phí hàng tháng

**Actor**: Admin  
**Trigger**: Đầu mỗi tháng  
**Precondition**: StudentTuitionRate đã được thiết lập cho student

**Main Flow**:
1. Admin vào Finance → Invoicing
2. Chọn student + tháng cần tạo hóa đơn
3. System gợi ý amount từ `StudentTuitionRate` active
4. Admin xác nhận → system tạo `StudentInvoice` (status=unpaid)
5. Student nhận notification "hóa đơn mới"

---

## UC-A-003: Duyệt buổi học và tạo kỳ lương

**Actor**: Admin  
**Trigger**: Teacher submit session `completed_pending`

**Main Flow**:
1. Admin nhận notification "session cần duyệt"
2. Admin mở Payroll → Pending sessions
3. Xem chi tiết: teacher, lớp, ngày, số giờ, topic, điểm danh
4. Admin Approve → session status = `approved`
5. Cuối kỳ: Admin tạo PayrollPeriod (draft) → system tổng hợp sessions approved
6. Admin xem tổng amount → Finalize → trả lương → Paid

---

## UC-A-004: Khóa tài khoản vi phạm

**Actor**: Admin  
**Precondition**: User đang active

**Main Flow**:
1. Admin vào Users → tìm user
2. Click "Suspend" + nhập lý do
3. System: status `active → suspended`, gửi notification `account_suspended`
4. User không thể đăng nhập (401 khi dùng refresh token)
