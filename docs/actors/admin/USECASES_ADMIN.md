# 👨‍💼 Admin — Use Cases

> Các use case chi tiết cho Admin.  
> Xem danh sách tính năng: [FEATURES_ADMIN.md](./FEATURES_ADMIN.md)  
> Xem quyền: [PERMISSIONS_ADMIN.md](./PERMISSIONS_ADMIN.md)

---

## UC-A-001: Duyệt tài khoản người dùng

**Actor**: Admin  
**Trigger**: Nhận notification "tài khoản mới đang chờ duyệt" (new_teacher_registration / new_student_registration)  
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
1. Admin nhận notification `session_submitted_for_review`
2. Admin mở Payroll → Pending sessions
3. Xem chi tiết: teacher, lớp, ngày, giờ thực tế (actualStart/End), chủ đề, tóm tắt điểm danh
4. Admin Approve → session status = `approved`; teacher nhận `session_approved`
5. Cuối kỳ: Admin tạo PayrollPeriod (draft) → system tổng hợp sessions approved
6. Admin xem tổng amount → Finalize → trả lương → Paid

**Alternative**: Admin Reject + nhập lý do → session status = `rejected`; teacher nhận `session_rejected` kèm lý do

---

## UC-A-004: Khóa tài khoản vi phạm

**Actor**: Admin  
**Precondition**: User đang active

**Main Flow**:
1. Admin vào Users → tìm user
2. Click "Suspend" + nhập lý do
3. System: status `active → suspended`, gửi notification `account_suspended`
4. User không thể đăng nhập (401 khi dùng refresh token)

---

## UC-A-005: Giám sát Gemini API Quota

**Actor**: Admin  
**Precondition**: Hệ thống đã có ít nhất 1 tính năng dùng Gemini thật sự (T-GRADE-3 AI suggested score đang hoạt động)

**Main Flow**:
1. Admin vào Dashboard → tab "Monitoring" → mục "Gemini API"
2. Xem các chỉ số:
   - Tổng lượt gọi API trong kỳ (ngày / tuần / tháng)
   - Quota còn lại (tổng quota của key)
   - Cache hit ratio (tỷ lệ kết quả lấy từ cache thay vì gọi API mới)
   - Breakdown theo tính năng: AI suggested score (Teacher grading), dịch thuật (nếu có)
3. Nếu quota < ngưỡng cảnh báo → hiện alert đỏ trên dashboard

**Note**: Số liệu chỉ có ý nghĩa sau khi T-GRADE-3 thật sự chạy. Cần chốt quota dùng chung 1 key hay mỗi teacher có key riêng trước khi build.

---

## UC-A-006: Xem chi tiết hồ sơ người dùng

**Actor**: Admin  
**Precondition**: User đã tồn tại trong hệ thống

**Main Flow**:
1. Admin vào Users → tìm kiếm user (theo tên / email)
2. Click vào user → xem màn hình chi tiết gồm:
   - Thông tin cá nhân (tên, email, role, status, ngày đăng ký, last_login_at)
   - Trạng thái tài khoản hiện tại (active / pending / suspended)
   - **Nếu Student**: lịch sử lớp học đã tham gia (enrollment records), lịch sử bài đã nộp (attempt records)
   - **Nếu Teacher**: danh sách lớp đang dạy, lịch sử session
   - Session history: để trống placeholder — phụ thuộc Sprint 5

**Note**: `last_login_at` cần thêm cột vào User schema và được update mỗi khi đăng nhập thành công (F1.2).
