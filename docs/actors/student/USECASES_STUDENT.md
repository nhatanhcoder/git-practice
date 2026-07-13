# 🎓 Student — Use Cases

> Các use case chi tiết cho Student.  
> Xem danh sách tính năng: [FEATURES_STUDENT.md](./FEATURES_STUDENT.md)  
> Xem quyền: [PERMISSIONS_STUDENT.md](./PERMISSIONS_STUDENT.md)

---

## UC-S-001: Tham gia lớp bằng enrollment code

**Actor**: Student  
**Precondition**: Tài khoản active, có enrollment code từ teacher

**Main Flow**:
1. Student vào Classes → "Tham gia lớp"
2. Nhập 8-char code → System validate (active class, code đúng)
3. System tạo `ClassEnrollment` (status=active)
4. Student thấy lớp trong danh sách, có thể xem assignments

**Error**: Code không tồn tại → 404. Class đã archived → 400.

---

## UC-S-002: Làm bài Mock Test

**Actor**: Student  
**Precondition**: Assignment type=mock_test, status=published, chưa có attempt

**Main Flow**:
1. Student vào Assignments → thấy bài có đồng hồ
2. Click "Bắt đầu" → system tạo Attempt (status=in_progress), bắt đầu đếm ngược
3. Student làm bài: chọn đáp án, điền vào chỗ trống
4. Mỗi 2 giây: auto-save AttemptAnswer → không mất data khi mất mạng
5. Student navigate qua sidebar (đánh dấu: chưa làm / đã làm / flag)
6. Hết giờ: system tự submit. Hoặc student click "Nộp bài" sớm
7. Attempt status = `submitted`, student xem kết quả MCQ ngay

---

## UC-S-003: Ôn từ vựng SRS

**Actor**: Student

**Main Flow**:
1. Student vào Flashcards → chọn HSK level
2. System load cards có `nextReviewDate <= now`
3. Student xem mặt trước (chữ Hán) → Flip → xem pinyin + nghĩa + ví dụ
4. Đánh giá: **Again** / **Hard** / **Good** / **Easy**
5. SM-2 tính lại: easeFactor, repetitionsCount, nextReviewDate
6. Lặp cho đến hết cards due
7. Dashboard hiện: streak, cards reviewed today, retention rate

---

## UC-S-004: Xem kết quả và feedback

**Actor**: Student  
**Trigger**: Nhận notification "bài đã được chấm"

**Main Flow**:
1. Student vào Assignments → tìm bài đã graded
2. Xem tổng điểm + xếp loại
3. Xem từng câu: đáp án mình chọn vs đáp án đúng + feedback từ teacher
4. (Writing) Xem nhận xét chi tiết + điểm phần writing
