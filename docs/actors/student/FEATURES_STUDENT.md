# 🎓 Student — Feature Specification

> **Role**: Student (User)  
> **Scope**: Class enrollment, lessons, assignments, SRS flashcards, skill drill, quiz room, progress tracking, billing  
> **Tech**: Next.js 14 (App Router) + NestJS + PostgreSQL (Prisma) + MongoDB

---

## 🔐 Auth & Profile

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-AUTH-1 | Đăng ký tài khoản (chờ admin duyệt) | 🔴 Must | status = pending |
| S-AUTH-2 | Đăng nhập bằng email + password | 🔴 Must | JWT access + refresh token |
| S-AUTH-3 | Đăng xuất | 🔴 Must | |
| S-AUTH-4 | JWT Refresh Token tự động gia hạn | 🔴 Must | Silent re-auth |
| S-AUTH-5 | Đổi mật khẩu | 🟡 Should | |
| S-AUTH-6 | Cập nhật profile (nickname, HSK level mục tiêu) + avatar | 🟡 Should | Supabase Storage |

---

## 🏫 Class Participation

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-CLS-1 | Tham gia lớp bằng enrollment code (8 ký tự) | 🔴 Must | Tạo ClassEnrollment record |
| S-CLS-2 | Xem danh sách lớp đang tham gia | 🔴 Must | Tên lớp, giáo viên, HSK level |
| S-CLS-3 | Xem thông tin lớp (teacher, HSK level, lịch) | 🟡 Should | |
| S-CLS-4 | Rời khỏi lớp | 🟢 Could | status: dropped |

---

## 📚 Lessons

> **Note**: Lesson là core content của lớp. Entity mới — cần chốt định nghĩa (tài liệu/video/mô tả + quan hệ với assignment) trước khi build.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-LESSON-1 | Xem danh sách lesson trong lớp theo thứ tự | 🔴 Must | Ordered list, mỗi lesson kèm bài tập liên quan |
| S-LESSON-2 | Xem chi tiết nội dung lesson | 🔴 Must | Tài liệu / video / mô tả |
| S-LESSON-3 | Xem bài tập gắn với lesson | 🟡 Should | Link tới Assignment (nếu có) |

---

## 📋 Assignments & Tests

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-ASGN-1 | Xem danh sách bài tập đã giao (theo lớp) | 🔴 Must | Trạng thái: chưa làm / đang làm / đã nộp / đã chấm |
| S-ASGN-2 | Bắt đầu làm Assignment / Mock Test | 🔴 Must | Tạo Attempt record |
| S-ASGN-3 | Auto-save đáp án mỗi 2 giây | 🔴 Must | Tránh mất dữ liệu khi mất mạng |
| S-ASGN-4 | Đếm ngược thời gian (Mock Test) | 🔴 Must | timeLimitMinutes, tự nộp khi hết giờ |
| S-ASGN-5 | Navigation câu hỏi qua sidebar | 🔴 Must | Đánh dấu: chưa làm / đã làm / flag |
| S-ASGN-6 | Nộp bài | 🔴 Must | status: submitted — khoá lại, không sửa được nữa |
| S-ASGN-7 | Xem kết quả sau khi được chấm | 🔴 Must | Tổng điểm + feedback từng câu (MCQ tự động, Writing chờ teacher) |
| S-ASGN-8 | Review bài làm (xem đáp án đúng + nhận xét teacher) | 🟡 Should | Chỉ sau khi graded |

---

## 🃏 SRS Flashcards

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-SRS-1 | Duyệt từ vựng theo HSK level (1–6) | 🔴 Must | MongoDB Flashcard collection |
| S-SRS-2 | Bắt đầu phiên ôn tập | 🔴 Must | Lấy cards due theo nextReviewDate |
| S-SRS-3 | Đánh giá: Again / Hard / Good / Easy | 🔴 Must | SM-2 Algorithm cập nhật easeFactor, nextReviewDate |
| S-SRS-4 | Xem mặt trước → Flip → xem đáp án | 🔴 Must | hanzi, pinyin, nghĩa, ví dụ |
| S-SRS-5 | Dashboard SRS stats (streak, cards due, retention rate) | 🟡 Should | |
| S-SRS-6 | **Click vào từ/chữ Hán trong nội dung → lưu vào kho từ cá nhân** | 🟡 Should | Khả dụng từ Lesson, Reading passage, Flashcard browser → tạo `UserSavedWord` record |
| S-SRS-7 | Xem & quản lý kho từ đã lưu | 🟡 Should | Danh sách từ đã save, xóa từ, bắt đầu ôn tập từ kho từ riêng |

> 📄 Chi tiết: SRS_ALGORITHM.md (docs/architecture/)

---

## 🏋️ Skill Drill (Tự luyện tập)

> **Note**: Hoàn toàn tách biệt khỏi bài tập do teacher giao — không tính điểm chính thức, xem đáp án ngay sau mỗi câu.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-DRILL-1 | Chọn kỹ năng (đọc / nghe / viết) + HSK level + độ khó | 🟡 Should | Filter trước khi bắt đầu |
| S-DRILL-2 | Làm bài luyện tập không tính điểm chính thức | 🟡 Should | Xem đáp án đúng ngay sau mỗi câu |
| S-DRILL-3 | Xem kết quả phiên luyện tập (tóm tắt đúng/sai) | 🟢 Could | Không lưu vào grade record |

---

## 🎮 Quiz Room (Live, Real-time)

> **Note**: Cần WebSocket infrastructure. Cần chốt: ai tạo phòng (Teacher?), câu hỏi lấy từ đâu (question bank?).

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-QUIZ-1 | Nhập mã phòng để tham gia quiz room | 🟡 Should | Vào phòng chờ, thấy danh sách người chơi |
| S-QUIZ-2 | Trả lời câu hỏi real-time (đồng thời với tất cả người chơi) | 🟡 Should | Đếm giờ từng câu; trả lời nhanh + đúng → điểm cao hơn |
| S-QUIZ-3 | Xem bảng xếp hạng live trong phòng | 🟡 Should | Cập nhật rank sau mỗi câu; hiện rank cuối khi kết thúc |

---

## 📊 Progress & Analytics

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-ANL-1 | Heatmap kỹ năng × tuần (Listening / Reading / Writing) | 🔴 Must | |
| S-ANL-2 | Progress chart điểm trung bình theo thời gian | 🔴 Must | |
| S-ANL-3 | Xem điểm từng bài đã hoàn thành | 🔴 Must | |
| S-ANL-4 | Leaderboard tổng (xếp hạng theo điểm / streak / retention) | 🟡 Should | Tổng hợp toàn bộ hoạt động học |
| S-ANL-5 | So sánh với trung bình lớp | 🟢 Could | |

> 📄 Chi tiết: ANALYTICS_FLOW.md

---

## 🧾 Billing (Học phí)

> **Note**: Chỉ là phần xem — module tạo hoá đơn nằm ở phía Admin (A-INV-2). Cần chốt mô hình tính học phí (theo lớp / gói / tháng) trước khi build.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-BILL-1 | Xem danh sách hóa đơn học phí | 🔴 Must | status: unpaid / partially_paid / paid |
| S-BILL-2 | Xem chi tiết hóa đơn (period, amount, payments) | 🟡 Should | |
| S-BILL-3 | Nhận thông báo khi có hóa đơn mới | 🟡 Should | Notification trigger |

> 📄 Chi tiết: INVOICE_FLOW.md

---

## 🔔 Notifications Received

| Loại thông báo | Trigger |
|----------------|---------|
| Tài khoản được duyệt | Admin approve account |
| Tài khoản bị khóa | Admin suspend account |
| Bài tập mới được giao | Teacher tạo assignment |
| Sắp đến hạn nộp bài | Deadline reminder (scheduler) |
| Bài đã được chấm | Teacher hoàn tất grading |
| Hóa đơn mới | Admin tạo StudentInvoice |

> 📄 Chi tiết: NOTIFICATION_FLOW.md

---

## 🗺️ User Journey

```
Register → (wait admin approval) → Login
  └─► Dashboard (assignments due, SRS cards due)
        ├─► Classes → Join via code → View class details
        │     └─► Lessons → View lesson list → Xem nội dung + bài tập gắn kèm
        ├─► Assignments → View list → Start attempt
        │     ├─► Auto-save + timer (mock test)
        │     ├─► Navigate questions via sidebar
        │     └─► Submit → await grading → View results + feedback
        ├─► SRS Flashcards → Browse HSK level → Study session
        │     └─► Rate: Again/Hard/Good/Easy → SM-2 schedules next review
        ├─► Skill Drill → Chọn skill + HSK + độ khó → Luyện tập (không tính điểm)
        ├─► Quiz Room → Nhập mã phòng → Chờ → Chơi real-time → Xem leaderboard
        ├─► Progress → Heatmap + charts + scores + leaderboard tổng
        └─► Billing → View invoices + payment history
```

---

## 🔗 Liên quan

| Tài liệu | Đường dẫn |
|---------|----------|
| SRS Algorithm | docs/architecture/SRS_ALGORITHM.md |
| Exam Engine | docs/architecture/EXAM_ENGINE.md |
| Analytics Flow | ANALYTICS_FLOW.md |
| Invoice Flow | INVOICE_FLOW.md |
| Notification Flow | NOTIFICATION_FLOW.md |
| Admin Features | FEATURES_ADMIN.md |
| Teacher Features | FEATURES_TEACHER.md |
