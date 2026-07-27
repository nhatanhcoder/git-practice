# PROGRESS.md — Tiến độ dự án

> Khung sprint theo PROJECT_KNOWLEDGE.md (xem DECISIONS.md #3 — chưa chính thức chốt).
> **Trạng thái khởi tạo**: chưa xác nhận có code thực tế nào tồn tại trong repo hay chưa — toàn bộ để `⬜` cho tới khi kiểm tra lại thực tế. Đừng tin trạng thái file này hơn code thật; nếu nghi ngờ, chạy `pnpm build`/mở repo kiểm tra trước khi báo cáo "đã xong".
>
> Ký hiệu: `⬜ Chưa làm` · `🔶 Đang làm` · `✅ Xong` · `⛔ Blocked` · `⏸ Hoãn/ngoài scope`
>
> **Chạy nhiều agent song song (2+ Claude, hoặc Claude + Antigravity cùng lúc)**: khi nhận `🔶`, thêm tên agent/phiên vào ngay sau, vd `🔶 (Claude-A)`. Trước khi nhận việc mới, agent khác chỉ cần quét file này (rẻ) để né các mục đã có người nhận — **không cần đọc HANDOFF.md hay context đầy đủ của agent kia**. Khi xong, xoá tag và chuyển `✅`.
>
> Cập nhật file này ngay sau khi hoàn thành hoặc bắt đầu một mục — đừng dồn lại cuối phiên rồi quên.

---

## Sprint 0 — Foundation
- ⬜ Turborepo + pnpm workspace, eslint, prettier, husky pre-commit
- ⬜ NestJS app (`apps/api`) + Prisma + Mongoose + Swagger + Global Pipes/Filters
- ⬜ Next.js app (`apps/web`) + Tailwind + shadcn/ui + Axios interceptors + Zustand skeleton
- ⬜ Supabase PostgreSQL + MongoDB Atlas khởi tạo, migration đầu tiên + seed script
- **DoD**: API chạy :3001 (Swagger `/api`), Web chạy :3000 kết nối API, CI pass lint+build

## Sprint 1 — Auth & Users
- ⬜ F1.1 Đăng ký tài khoản (status `pending`, bcrypt cost 12)
- ⬜ F1.2 Đăng nhập (JWT access 15p + refresh 7d, rate limit 5 lần/15p)
- ⬜ F1.3 Duyệt tài khoản (Admin)
- ⬜ F1.4 Quản lý hồ sơ cá nhân
- ⬜ Refresh Token Rotation + phát hiện Replay Attack (PROJECT_KNOWLEDGE.md 4.1)
- ⬜ Custom Decorators `@CurrentUser`, `@Roles`, `@Public`
- **DoD**: Đăng ký → Admin duyệt → đăng nhập đúng dashboard theo role

## Sprint 2 — Lớp học & Gia nhập
- ⬜ F2.1 Tạo lớp học (enrollment code 8 ký tự unique)
- ⬜ F2.2 Chỉnh sửa lớp học
- ⬜ F2.3 Tham gia lớp học
- ⬜ F2.4 Rời khỏi lớp
- ⬜ F2.5 Xem danh sách học sinh trong lớp
- ⬜ F2.6 Xem danh sách lớp của Student
- **DoD**: Giáo viên tạo lớp → học sinh nhập code join → giáo viên thấy học sinh trong danh sách

## Sprint 3 — Ngân hàng Câu hỏi & Assignment
- ⬜ F3.1 Tạo câu hỏi MCQ · ⬜ F3.2 Listening · ⬜ F3.3 Reading · ⬜ F3.4 Writing
- ⬜ (xem DECISIONS.md #4) Mở rộng đủ 9 subType hay chỉ 4 loại cơ bản
- ⬜ F3.5 Tìm kiếm & lọc câu hỏi (full-text search tiếng Trung)
- ⬜ F3.6 Chỉnh sửa/xóa câu hỏi (soft delete nếu đã dùng)
- ⬜ F4.1 Tạo Assignment · ⬜ F4.2 Tạo Mock Test · ⬜ F4.3 Sửa/xóa Assignment
- **DoD**: Tạo bộ câu hỏi → gom thành Assignment gán cho lớp

## Sprint 4 — Làm bài & Chấm điểm (+ AI Suggest)
- ⬜ F5.1 Bắt đầu làm bài · ⬜ F5.2 Auto-save đáp án (debounce 2s)
- ⬜ F5.3 Nộp bài + auto-grade MCQ
- ⬜ F5.4 Chấm điểm thủ công Writing
- ⬜ Gemini AI Suggest cho Writing (`AiRateLimiterGuard`, lưu `aiSuggestedScore`/`aiFeedback`)
- ⬜ F5.5 Xem kết quả bài đã nộp
- **DoD**: Học sinh thi hết giờ tự nộp → GV dùng AI Suggest chấm Writing → nhập điểm final → HS xem lại kết quả

## Sprint 5 — SRS Flashcards & Analytics
- ⬜ F7.1 Duyệt & xem thẻ từ vựng · ⬜ F7.2 Thêm thẻ vào bộ ôn tập
- ⬜ F7.3 Ôn tập SRS (thuật toán SM-2 — công thức đầy đủ ở PROJECT_KNOWLEDGE.md 4.3)
- ⬜ F7.4 Thống kê ôn tập (streak, cards learned)
- ⬜ F6.1 Heatmap kỹ năng theo tuần · ⬜ F6.2 Biểu đồ tiến bộ
- ⬜ F6.3 Dashboard lớp (Teacher) · ⬜ F6.4 API Quota Monitoring (Admin)
- **DoD**: Đánh giá thẻ → dời lịch ôn đúng SM-2. GV thấy cảnh báo đỏ học sinh yếu.

## Sprint 6 — Điểm danh, Lương, Học phí ⚠️
> **Chưa xác nhận có trong scope hay không — xem DECISIONS.md #5**
- ⏸ ClassSession + SessionAttendance (điểm danh)
- ⏸ TeacherPayRate + PayrollPeriod (tính lương giáo viên)
- ⏸ StudentTuitionRate + StudentInvoice + TuitionPayment (học phí, VietQR)
- ⏸ F8.1–F8.5 Thông báo in-app (một phần liên quan module này, phần còn lại thuộc Sprint 4)

## Sprint 7 — Testing & Deploy
- ⬜ Unit tests: Auth, Class, Question, Attempt, SRS
- ⬜ E2E tests (Playwright) — luồng làm bài & nộp bài
- ⬜ CI: GitHub Actions chạy test mỗi PR
- ⬜ Deploy: FE → Vercel, BE → Railway/Render, Supabase + Atlas thật
- **DoD**: Chạy production ổn định, toàn bộ test xanh

---

## Ghi chú tự do (thêm khi cần)
_(dùng để note nhanh những việc chưa đủ rõ để tách thành mục checklist riêng)_
