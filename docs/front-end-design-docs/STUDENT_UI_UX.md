---
title: Student UI/UX — bản mô tả để vibe code
status: draft
owner: Nhật
last_updated: 2026-08-24
source: docs/actors/student/FEATURES_STUDENT.md · API_STUDENT.md · client-demand.txt · RBAC_MATRIX.md
---

# Student UI/UX

> File này để **nhìn mà thiết kế** và sửa dần. Chưa phải Page Contract chính thức —
> khi chốt màn nào thì chạy `flow-mapper` sinh contract riêng cho màn đó.
>
> Tất cả nội dung dưới đây rút từ tài liệu đã có, **không bịa**. Chỗ nào tài liệu chưa
> nói thì ghi ⛔ chứ không tự quyết.

## Bối cảnh khác Admin ở đâu

| | Admin | Student |
|---|---|---|
| Thiết bị chính | desktop, màn lớn cả ngày | **điện thoại** — học trên đường, ôn từ lúc rảnh |
| Phiên làm việc | dài, tập trung | ngắn, đứt quãng, dễ mất mạng |
| Ưu tiên | mật độ thông tin cao | **một việc mỗi màn**, chạm to, đọc nhanh |
| Rủi ro lớn nhất | sai số tiền | **mất bài đang làm** |

→ Student là **mobile-first**. Admin là desktop-first. Hai bộ layout khác nhau, chung token.

---

## Bản đồ màn

`🔴` bắt buộc MVP · `🟡` nên có · `🟢` để sau · `⛔` bị chặn

| # | Route | Màn | Mức | Chặn bởi |
|---|---|---|---|---|
| 1 | `/login` `/register` | Đăng nhập / đăng ký | 🔴 | — (dùng chung mọi role) |
| 2 | `/student` | Dashboard | 🔴 | — |
| 3 | `/student/classes` | Lớp của tôi + join bằng code | 🔴 | SCOPE-01 |
| 4 | `/student/classes/[id]` | Chi tiết lớp + danh sách lesson | 🔴 | ⛔ Lesson chưa định nghĩa |
| 5 | `/student/classes/[id]/lessons/[lid]` | Nội dung lesson | 🔴 | ⛔ Lesson chưa định nghĩa |
| 6 | `/student/assignments` | Danh sách bài tập | 🔴 | — |
| 7 | `/student/assignments/[id]` | Chi tiết bài + nút bắt đầu | 🔴 | — |
| 8 | `/student/attempts/[id]` | **Màn làm bài** | 🔴 | — |
| 9 | `/student/attempts/[id]/result` | Kết quả + feedback | 🔴 | — |
| 10 | `/student/flashcards` | Duyệt từ vựng theo HSK | 🔴 | MongoDB chưa dựng |
| 11 | `/student/flashcards/review` | Phiên ôn SRS | 🔴 | MongoDB chưa dựng |
| 12 | `/student/flashcards/saved` | Sổ từ cá nhân | 🟡 | MongoDB chưa dựng |
| 13 | `/student/flashcards/stats` | Thống kê SRS | 🟡 | MongoDB chưa dựng |
| 14 | `/student/drill` | Luyện kỹ năng (không tính điểm) | 🟡 | ⛔ nguồn câu hỏi chưa chốt |
| 15 | `/student/quiz` | Quiz room realtime | 🟡 | ⛔ WebSocket + ai tạo phòng |
| 16 | `/student/progress` | Heatmap + biểu đồ + bảng xếp hạng | 🔴 | — |
| 17 | `/student/invoices` `[id]` | Hoá đơn học phí (chỉ xem) | 🔴 | mô hình học phí |
| 18 | `/student/profile` | Hồ sơ + đổi mật khẩu | 🟡 | — |
| 19 | `/student/notifications` | Thông báo | 🟡 | polling 60s (DEBT-002) |

Đếm: **19 màn**, không phải ~12 như `pages/_INDEX.md` ước lượng. Chênh vì Lesson và
Flashcard mỗi cái nhiều hơn một màn.

---

## Từng màn

### 2. `/student` — Dashboard

**Mục đích:** trả lời đúng một câu — *"giờ tôi nên làm gì?"* Không phải bảng điều khiển.

Ba khối, theo thứ tự ưu tiên trên mobile:

1. **Cần làm ngay** — bài tập sắp hết hạn (≤48h) + số thẻ SRS đến hạn hôm nay.
   Rỗng thì hiện trạng thái tích cực, không hiện khung trống.
2. **Đang học** — lớp đang tham gia, mỗi lớp 1 dòng: tên, giáo viên, lesson kế tiếp.
3. **Tiến độ tuần** — streak + số thẻ đã ôn + điểm trung bình. Nhỏ, không chiếm màn.

**Endpoint:** ⛔ chưa có endpoint tổng cho dashboard (`/student/dashboard`).
`API_STUDENT.md` không định nghĩa.
Tạm ghép từ `/student/assignments` + `/student/flashcards/stats` + `/student/classes`.

**State:** Loading (skeleton 3 khối) · Ready · Empty (chưa vào lớp nào → CTA nhập code) ·
Error (retry inline).

---

### 3. `/student/classes` — Lớp của tôi

`GET /student/classes` · `POST /student/classes/join` · `DELETE /student/classes/:id/leave`

- Danh sách lớp: tên, giáo viên, HSK level, số lesson, tiến độ.
- **Join bằng code 8 ký tự.** Ô nhập lớn, tự viết hoa, tự bỏ khoảng trắng khi dán.
  Lỗi: `CLASS_ENROLL_CODE_INVALID` (404) · `CLASS_ALREADY_ENROLLED` (409) ·
  `CLASS_ALREADY_ARCHIVED` (400) — cả ba **đã có** trong registry.
- **Rời lớp** là `status = dropped`, không xoá bản ghi. Modal xác nhận phải nói rõ:
  *"Lịch sử học và điểm vẫn được giữ."*

**Empty state** là màn quan trọng nhất của app này — học sinh mới đăng nhập lần đầu chỉ
thấy nó. Phải là: một dòng giải thích + ô nhập code + nút. Không phải hình minh hoạ trống.

---

### 4–5. Lesson ⛔ CHẶN

`FEATURES_STUDENT` ghi rõ: *"lesson là khái niệm mới, chưa có trong backend hiện tại — cần
định nghĩa rõ trước khi làm"*. Chưa biết lesson gồm gì (tài liệu / video / mô tả?) và quan hệ
với assignment ra sao.

`API_STUDENT.md` **không có endpoint lesson nào**. Có `ENTITY_LESSON.md` ở cả Postgres và
MongoDB — hai file, chưa rõ cái nào thắng.

→ **Không thiết kế màn này trước khi chốt.** Đây là core content của lớp, đoán sai thì
màn 3, 6, 7 đều lệch theo.

---

### 6–7. Assignments

`GET /student/assignments` · `GET /student/assignments/:id`

Trạng thái mỗi bài: `chưa làm` / `đang làm` / `đã nộp` / `đã chấm`. Bốn trạng thái này
quyết định nút hiển thị gì — đừng để một nút "Vào bài" chung cho cả bốn.

Chi tiết bài (màn 7) là **màn chặn trước khi vào làm**: hiện số câu, thời gian, số lần được
làm, và cảnh báo *"nộp rồi không sửa được"*. Mock test có đếm giờ thì phải nói **trước**,
không phải để học sinh phát hiện lúc đồng hồ đã chạy.

---

### 8. `/student/attempts/[id]` — Màn làm bài

**Màn khó nhất toàn app.** Rủi ro lớn nhất của Student là mất bài đang làm.

`POST /student/assignments/:id/attempts` · `PATCH /student/attempts/:id/answers` ·
`POST /student/attempts/:id/submit`

Yêu cầu bắt buộc:

- **Auto-save mỗi 2 giây** (debounce). Hiện trạng thái lưu ở góc: `Đã lưu` / `Đang lưu…` /
  `Mất kết nối — sẽ lưu lại`. Học sinh phải **nhìn thấy** là bài đang được giữ.
- **Mất mạng không được mất bài.** Giữ đáp án ở local, gửi lại khi có mạng.
  ⛔ Cơ chế chưa được đặc tả ở tài liệu nào.
- **Đếm ngược (mock test)** — hết giờ **tự nộp**. Cảnh báo ở mốc 5 phút và 1 phút.
  Đồng hồ tính theo **server**, không theo máy học sinh (`ADR-005 server-authoritative-exam`).
- **Sidebar điều hướng câu hỏi** — 3 trạng thái: chưa trả lời / đã trả lời / đã đánh dấu.
  Trên mobile sidebar thành thanh ngang cuộn được hoặc bottom sheet, **không** ẩn hẳn.
- **Nộp bài** — modal xác nhận, nêu rõ số câu chưa làm. Nộp xong khoá vĩnh viễn.

Loại câu hỏi phải hỗ trợ: MCQ · nghe (có audio player) · đọc (đoạn văn dài, cuộn riêng) ·
viết (textarea, đếm ký tự).

**Bẫy đã biết:** `sticky` header + `overflow-hidden` làm header đè lên nội dung (WEB-001).
Màn này có cả header cố định lẫn vùng cuộn — cẩn thận.

---

### 9. Kết quả

`GET /student/attempts/:id/result`

Tổng điểm + từng câu. **MCQ chấm ngay, câu viết chờ giáo viên** — nên màn này có trạng thái
**chấm một phần**: hiện điểm MCQ, phần viết ghi *"đang chờ chấm"*. Đừng giấu cả bài chỉ vì
một câu chưa chấm.

Sau khi chấm xong mới hiện đáp án đúng + nhận xét của giáo viên (S-ASGN-8).

---

### 10–13. Flashcards SRS

`GET /student/flashcards?hskLevel=` · `GET /student/flashcards/due` ·
`POST /student/flashcards/:id/review` · `GET /student/flashcards/stats`

- **Phiên ôn** (màn 11) là màn dùng nhiều nhất, mỗi ngày. Thiết kế cho **một tay, một ngón cái**.
  Mặt trước → chạm/space để lật → 4 nút `Again / Hard / Good / Easy`.
  Bàn phím: `1234` hoặc `space` để lật. Mobile: vuốt hoặc 4 nút to ở dưới.
- Thẻ có: hanzi · pinyin · nghĩa · ví dụ. Hanzi phải **rất to** — đây là thứ cần nhìn rõ.
- SM-2 cập nhật `easeFactor` + `nextReviewDate`. Công thức ở `PROJECT_KNOWLEDGE.md 4.3`.
- **Sổ từ cá nhân** (S-SRS-6): chạm vào một chữ ở bất kỳ đâu (lesson, đoạn đọc, flashcard)
  → lưu vào `UserSavedWord`. Tương tác này xuyên nhiều màn, nên là **một component dùng chung**,
  không code lại ở từng chỗ.

Cả 4 màn chạm MongoDB — **chưa dựng**. Kế hoạch BE hoãn Mongo tới giai đoạn này.

---

### 14. Skill Drill 🟡 ⛔

Luyện không tính điểm, hiện đáp án ngay sau mỗi câu. Khác hẳn màn làm bài: không đếm giờ,
không lưu điểm, thoát lúc nào cũng được.

⛔ **Nguồn câu hỏi chưa chốt** — lấy từ question bank của giáo viên? Nếu có thì học sinh sẽ
gặp trước đề thi thật. Chưa tài liệu nào trả lời.

---

### 15. Quiz Room 🟡 ⛔

⛔ Chặn kép: cần **WebSocket** (chưa có hạ tầng), và chưa chốt **ai tạo phòng** + **câu hỏi
lấy từ đâu**. `FEATURES_STUDENT` ghi thẳng hai câu hỏi này.

Để cuối cùng. Không nằm trong MVP.

---

### 16. `/student/progress`

`GET /student/progress` · `/student/progress/chart`

- Heatmap kỹ năng × tuần (Listening / Reading / Writing)
- Biểu đồ điểm trung bình theo thời gian
- Điểm từng bài đã hoàn thành
- 🟡 Bảng xếp hạng toàn hệ thống · 🟢 So với trung bình lớp

**Quy tắc biểu đồ** (`ADR-007`): 2 series dùng `#2563EB` + `#EA580C`. **Không** dùng màu
trạng thái (xanh/đỏ) cho series. **Một trục y duy nhất**, không bao giờ dual-axis.

---

### 17. Hoá đơn — chỉ xem

`GET /student/invoices` · `/student/invoices/:id`

Chỉ đọc. Học sinh không thanh toán trong app — Admin đối soát VietQR thủ công (`ADR-004`).
Trạng thái: `unpaid` / `partially_paid` / `paid` / `void`.

Màn chi tiết hiện kỳ, số tiền, lịch sử thanh toán. **Không** có nút "Thanh toán ngay" —
đừng tạo kỳ vọng sai.

⛔ Mô hình học phí chưa chốt (per class / gói / tháng) → ảnh hưởng cách hiển thị kỳ.

---

### 18–19. Profile & Notifications

Profile: đổi `nickname`, mục tiêu HSK (**1–9**), avatar, đổi mật khẩu.
Dùng `PATCH /auth/me` + `POST /auth/change-password` — **không** phải endpoint riêng của student.

⚠️ Cột tên là **`nickname`** (ADR-015), không phải `fullName`. `API_AUTH.md` còn ghi
`fullName`, phải sửa.

Notifications: 6 loại học sinh nhận — tài khoản được duyệt / bị khoá · bài tập mới ·
sắp hết hạn · đã chấm · hoá đơn mới. Polling 60 giây, chưa realtime (DEBT-002).

---

## Chưa chốt — phải quyết trước khi code

| # | Câu hỏi | Chặn màn |
|---|---|---|
| 1 | **Lesson là gì?** Tài liệu / video / mô tả? Quan hệ với assignment? `ENTITY_LESSON` có ở cả Postgres và Mongo — cái nào thắng? | 4, 5 — và là core content của lớp |
| 2 | Mất mạng giữa lúc làm bài thì sao? Lưu local rồi gửi lại, hay chặn? | 8 |
| 3 | Skill Drill lấy câu hỏi từ đâu? Dùng chung question bank thì lộ đề | 14 |
| 4 | Quiz Room: ai tạo phòng, câu hỏi từ đâu, hạ tầng WebSocket nào | 15 |
| 5 | Mô hình học phí (per class / gói / tháng) | 17 |
| 6 | Có endpoint tổng cho dashboard (`/student/dashboard`) không, hay FE tự ghép 3 lời gọi? | 2 |
| 7 | SCOPE-01 — Class/Enrollment chưa có module BE | 3, 4, 6 |

---

## Thứ tự làm đề xuất

```
1. /login /register + /student/profile      không phụ thuộc gì, dựng nền auth
2. /student/classes                         join code — cửa vào của mọi thứ khác
3. /student/assignments + [id]              danh sách, chưa cần làm bài
4. /student/attempts/[id]                   màn khó nhất, làm khi 3 màn trên đã ổn
5. /student/attempts/[id]/result
6. /student                                 dashboard — làm SAU vì nó tổng hợp từ trên
7. /student/progress
8. flashcards (4 màn)                       sau khi MongoDB dựng xong
9. invoices · notifications
10. drill · quiz room                       sau cùng, đang bị chặn
```

**Dashboard làm sau, không làm trước.** Nó tổng hợp dữ liệu từ mọi màn khác; làm sớm là
phải viết lại. Cùng lý do với `/admin` bên Admin.

---

## Ghi chú thiết kế

- **Mobile-first thật sự**, không phải desktop thu nhỏ. Breakpoint chính 375px.
- Token lấy từ `docs/front-end-design-docs/root-design-fe.md`. Nhưng file đó viết cho
  **dashboard quản lý** (Admin + Teacher) — Student cần layout riêng, **chung token**.
  ⛔ Chưa có mục nào trong đó nói về layout mobile của Student.
- `design-taste-frontend` chỉ dùng cho trang public (login, landing). Màn trong app dùng
  `ui-ux-pro-max` cho layout, **không lấy palette**.
- Vùng chạm tối thiểu 44px. Nút chính trong tầm ngón cái (nửa dưới màn hình).
- Mọi DateTime là UTC ISO trên đường truyền, format lúc render.
