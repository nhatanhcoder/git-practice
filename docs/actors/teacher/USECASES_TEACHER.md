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
4. Gemini trả về: gợi ý điểm (0-10) + reasoning
5. Teacher xem xét → nhập điểm cuối + feedback → Save
6. Attempt status: `submitted → graded`
7. Student nhận notification `graded`

---

## UC-T-005: Log buổi học và submit để duyệt lương

**Actor**: Teacher

**Main Flow**:
1. Teacher vào Sessions → "Bắt đầu buổi học"
2. Nhập: date, startTime, topic, notes
3. Mark điểm danh từng student (present/absent)
4. Kết thúc → nhập endTime
5. Submit → session status = `completed_pending`
6. Admin nhận notification, review → Approve/Reject
