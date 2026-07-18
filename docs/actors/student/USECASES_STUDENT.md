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
4. Student thấy lớp trong danh sách, có thể xem lessons và assignments

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

---

## UC-S-005: Xem bài học (Lesson) trong lớp

**Actor**: Student  
**Precondition**: Đã tham gia lớp (enrollment active)

**Main Flow**:
1. Student vào Classes → chọn lớp → tab "Bài học"
2. System hiện danh sách lesson theo thứ tự (sắp xếp do teacher thiết lập)
3. Student chọn 1 lesson → xem nội dung (tài liệu / video / mô tả)
4. Nếu lesson có bài tập gắn kèm → hiện link tới Assignment tương ứng
5. Student có thể click qua làm bài tập trực tiếp từ màn hình lesson

**Note**: Lesson entity cần được chốt định nghĩa (xem open questions trong implementation_plan.md) trước khi build.

---

## UC-S-006: Tự luyện tập theo kỹ năng (Skill Drill)

**Actor**: Student  
**Precondition**: Đã đăng nhập, tài khoản active

**Main Flow**:
1. Student vào "Luyện tập" → chọn kỹ năng: Đọc / Nghe / Viết
2. Chọn HSK level (1–6) và độ khó (dễ / trung bình / khó)
3. System random chọn câu hỏi phù hợp từ question bank
4. Student trả lời câu hỏi — **không** tính điểm chính thức
5. Sau mỗi câu: xem đáp án đúng + giải thích ngay lập tức
6. Kết thúc phiên: xem tóm tắt (đúng X / tổng Y câu)

**Note**: Kết quả phiên Skill Drill không ghi vào grade record, không ảnh hưởng GPA / ranking.

---

## UC-S-007: Tham gia và chơi Quiz Room real-time

**Actor**: Student  
**Precondition**: Phòng quiz đang mở (teacher đã tạo và chia sẻ mã)  
**Dependency**: WebSocket infrastructure

**Main Flow**:
1. Student vào "Quiz Room" → nhập mã phòng
2. System validate → Student vào phòng chờ, thấy danh sách người chơi đang join
3. Host bắt đầu → câu hỏi hiện đồng thời cho tất cả người chơi
4. Đếm giờ từng câu (countdown), student chọn đáp án trước khi hết giờ
5. Trả lời **đúng + nhanh** → điểm cao hơn (speed bonus)
6. Sau mỗi câu: bảng xếp hạng live cập nhật rank
7. Kết thúc phòng: hiện rank cuối cùng + điểm tổng của từng người

**Error**: Mã phòng không tồn tại → 404. Phòng đã bắt đầu → không cho join giữa chừng.  
**Note**: Ai tạo phòng và câu hỏi lấy từ đâu cần chốt trước khi build (xem open questions).
