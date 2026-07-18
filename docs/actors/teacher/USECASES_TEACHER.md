# 👩‍🏫 Teacher — Use Cases

> Các use case chi tiết cho Teacher.  
> Xem danh sách tính năng: [FEATURES_TEACHER.md](./FEATURES_TEACHER.md)  
> Xem quyền: [PERMISSIONS_TEACHER.md](./PERMISSIONS_TEACHER.md)

---

## UC-T-001: Tạo lớp học và chia sẻ enrollment code

**Actor**: Teacher  
**Precondition**: Tài khoản đã được admin duyệt (active)

**Main Flow**:
1. Teacher vào Classes → "Tạo lớp mới"
2. Nhập: tên lớp, HSK level, mô tả
3. System tạo Class với 8-char `enrollmentCode` (auto)
4. Teacher chia sẻ code cho students (copy / QR)
5. Students nhập code → tạo ClassEnrollment

---

## UC-T-002: Tạo câu hỏi Listening

**Actor**: Teacher  
**Precondition**: Đã đăng nhập, active

**Main Flow**:
1. Teacher vào Question Bank → "Tạo câu hỏi"
2. Chọn skill = `listening`, subType (vd: `multiple_choice_single`)
3. Upload file audio (MP3/WAV, max 10MB → Supabase Storage)
4. Nhập transcript, options, correct answer, explanation
5. Chọn HSK level → Save
6. Câu hỏi xuất hiện trong ngân hàng, sẵn sàng dùng trong Assignment

---

## UC-T-003: Tạo Assignment và giao cho lớp

**Actor**: Teacher

**Main Flow**:
1. Teacher vào Assignments → "Tạo mới"
2. Chọn type: `homework` hoặc `mock_test`
3. Nếu mock_test: nhập timeLimitMinutes
4. Chọn câu hỏi từ ngân hàng (filter theo skill, HSK level)
5. Chọn lớp + dueDate → Publish
6. System tạo Assignment, student nhận notification `new_assignment`

---

## UC-T-004: Chấm bài Writing với AI

**Actor**: Teacher  
**Trigger**: Có submission mới cần chấm

**Main Flow**:
1. Teacher vào Grading → filter "cần chấm"
2. Mở submission → xem câu trả lời writing của student
3. Click "AI Suggest" → system gọi Gemini API
4. Gemini trả về: gợi ý điểm (0–10) + reasoning
5. Teacher xem xét → nhập điểm cuối + feedback → Save
6. Attempt status: `submitted → graded`
7. Student nhận notification `graded`

---

## UC-T-005: Log buổi học và submit để duyệt lương

**Actor**: Teacher

**Main Flow**:
1. Teacher vào Sessions → "Bắt đầu buổi học"
2. Nhập: date, startTime, topic, notes
3. Mark điểm danh từng student (present / absent_excused / absent_unexcused)
4. Kết thúc → nhập actualEndTime
5. Submit → session status = `completed_pending`
6. Admin nhận notification, review → Approve / Reject (kèm lý do nếu reject)
7. Teacher nhận notification `session_approved` hoặc `session_rejected`

---

## UC-T-006: Xem thống kê lớp (Class Analytics Dashboard)

**Actor**: Teacher  
**Precondition**: Lớp đã có ít nhất 1 assignment và 1 submission

**Main Flow**:
1. Teacher vào Classes → chọn lớp → tab "Thống kê"
2. Xem dashboard gồm:
   - Điểm trung bình từng assignment (biểu đồ theo thời gian)
   - Phân bố điểm (histogram) của từng assignment
   - Tỷ lệ nộp bài toàn lớp
3. Xem danh sách học sinh yếu (điểm < ngưỡng threshold)
4. Chọn 1 học sinh → xem skill breakdown: điểm theo Listening / Reading / Writing

**Notes**: Dashboard gộp F6.1–F6.3 + F8.3 thành 1 view duy nhất.

---

## UC-T-007: Tạo và quản lý Lesson trong lớp

**Actor**: Teacher  
**Precondition**: Đã tạo lớp, tài khoản active

**Main Flow**:
1. Teacher vào Classes → chọn lớp → tab "Bài học"
2. Click "Thêm lesson" → nhập tiêu đề, mô tả, upload tài liệu / link video
3. System tạo Lesson gắn với lớp
4. Teacher sắp xếp thứ tự các lesson (drag-and-drop hoặc nhập số thứ tự)
5. Gắn Assignment vào Lesson: chọn assignment đã tạo → liên kết
6. Students trong lớp thấy lesson theo đúng thứ tự đã thiết lập

**Alternative**: Teacher chỉnh sửa / xóa lesson (trước khi học sinh làm bài gắn kèm)  
**Note**: Cần chốt quan hệ Lesson ↔ Assignment (1:N hay M:N) và định nghĩa Lesson entity trước khi build.
