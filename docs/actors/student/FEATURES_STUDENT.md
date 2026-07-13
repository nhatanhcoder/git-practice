# 🎓 Student — Feature Specification

> **Role**: Student (User)  
> **Scope**: Class enrollment, assignments, SRS flashcards, progress tracking, billing  
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
| S-AUTH-6 | Cập nhật profile (tên, HSK level mục tiêu) + avatar | 🟡 Should | Supabase Storage |

---

## 🏫 Class Participation

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-CLS-1 | Tham gia lớp bằng enrollment code (8 ký tự) | 🔴 Must | Tạo ClassEnrollment record |
| S-CLS-2 | Xem danh sách lớp đang tham gia | 🔴 Must | |
| S-CLS-3 | Xem thông tin lớp (teacher, HSK level, lịch) | 🟡 Should | |
| S-CLS-4 | Rời khỏi lớp | 🟢 Could | status: dropped |

---

## 📋 Assignments & Tests

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-ASGN-1 | Xem danh sách bài tập đã giao (theo lớp) | 🔴 Must | Trạng thái: chưa làm / đang làm / đã nộp |
| S-ASGN-2 | Bắt đầu làm Assignment / Mock Test | 🔴 Must | Tạo Attempt record |
| S-ASGN-3 | Auto-save đáp án mỗi 2 giây | 🔴 Must | Tránh mất dữ liệu khi mất mạng |
| S-ASGN-4 | Đếm ngược thời gian (Mock Test) | 🔴 Must | timeLimitMinutes, tự nộp khi hết giờ |
| S-ASGN-5 | Navigation câu hỏi qua sidebar | 🔴 Must | Đánh dấu: chưa làm / đã làm / flag |
| S-ASGN-6 | Nộp bài | 🔴 Must | status: submitted |
| S-ASGN-7 | Xem kết quả sau khi được chấm | 🔴 Must | Điểm + feedback từng câu |
| S-ASGN-8 | Review bài làm (xem đáp án đúng) | 🟡 Should | Chỉ sau khi graded |

---

## 🃏 SRS Flashcards

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-SRS-1 | Duyệt từ vựng theo HSK level (1–6) | 🔴 Must | MongoDB Flashcard collection |
| S-SRS-2 | Bắt đầu phiên ôn tập | 🔴 Must | Lấy cards due theo nextReviewDate |
| S-SRS-3 | Đánh giá: Again / Hard / Good / Easy | 🔴 Must | SM-2 Algorithm cập nhật easeFactor, nextReviewDate |
| S-SRS-4 | Xem mặt trước → Flip → xem đáp án | 🔴 Must | chineeseWord, pinyin, nghĩa, ví dụ |
| S-SRS-5 | Dashboard SRS stats (cards due, streak, retention) | 🟡 Should | |
| S-SRS-6 | Thêm từ vào danh sách học riêng | 🟢 Could | |

> 📄 Chi tiết: SRS_ALGORITHM.md (docs/architecture/)

---

## 📊 Progress & Analytics

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| S-ANL-1 | Heatmap kỹ năng × tuần (Listening / Reading / Writing) | 🔴 Must | |
| S-ANL-2 | Progress chart điểm trung bình theo thời gian | 🔴 Must | |
| S-ANL-3 | Xem điểm từng bài đã hoàn thành | 🔴 Must | |
| S-ANL-4 | So sánh với trung bình lớp | 🟢 Could | |

> 📄 Chi tiết: ANALYTICS_FLOW.md

---

## 🧾 Billing (Học phí)

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

> 📄 Chi tiết: NOTIFICATION_FLOW.md

---

## 🗺️ User Journey

```
Register → (wait admin approval) → Login
  └─► Dashboard (assignments due, SRS cards due)
        ├─► Classes → Join via code → View class details
        ├─► Assignments → View list → Start attempt
        │     ├─► Auto-save + timer (mock test)
        │     ├─► Navigate questions via sidebar
        │     └─► Submit → await grading → View results + feedback
        ├─► SRS Flashcards → Browse HSK level → Study session
        │     └─► Rate: Again/Hard/Good/Easy → SM-2 schedules next review
        ├─► Progress → Heatmap + charts + scores
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
