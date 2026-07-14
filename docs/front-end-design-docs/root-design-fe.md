---
status: draft
owner: Nhật
last_updated: 2026-07-13
related:
  - docs/actors/admin/
  - docs/actors/teacher/
  - docs/shared/RBAC_MATRIX.md
---

# Root Design FE — HSK Learning Platform

> File này là **nền tảng thiết kế dùng chung** cho 2 dashboard quản lý: **Admin Dashboard** và **Teacher Dashboard**. Mọi token, layout shell, component convention ở đây áp dụng cho cả hai. Phần khác biệt riêng của từng dashboard sẽ nằm ở 2 file thiết kế riêng, kế thừa từ file này (xem mục 8).

---

## 1. Định hướng thiết kế

Đây là **công cụ quản lý** (data-dense dashboard), không phải landing page — ưu tiên: rõ ràng, tin cậy, đọc nhanh số liệu, thao tác ít cú click. Bối cảnh: 2 loại người dùng chính (Admin xử lý tài chính/hệ thống, Teacher xử lý lớp/chấm bài), đôi khi Admin xem trên màn hình lớn cả ngày — ưu tiên mật độ thông tin cao nhưng không rối mắt.

**Chủ động không chọn** phong cách tím/gradient kiểu "dashboard AI mặc định" hay theme tối + neon — vì đối tượng dùng là kế toán/giáo viên/hành chính, không phải sản phẩm trình diễn. Chọn hướng **navy + xanh dương chuyên nghiệp**, tương tự ngôn ngữ thị giác của các công cụ B2B/tài chính đáng tin cậy (kiểu Linear, Stripe Dashboard), có lý do rõ: dữ liệu ở đây gồm cả tiền học phí, lương giáo viên — cần cảm giác "nghiêm túc, chính xác" hơn là "vui tươi".

---

## 2. Design Tokens

### 2.1 Màu sắc

| Vai trò | Hex | Dùng cho |
|---|---|---|
| Primary | `#0F172A` | Sidebar, heading chính, nút primary |
| Primary hover | `#1E293B` | Hover state của primary |
| Accent / Interactive | `#2563EB` | Link, active nav, focus ring, nút CTA phụ |
| Background | `#F8FAFC` | Nền trang |
| Surface (card/table) | `#FFFFFF` | Card, bảng, modal |
| Border | `#E2E8F0` | Viền card, chia dòng bảng |
| Text chính | `#0F172A` | Heading, nội dung quan trọng |
| Text phụ | `#475569` | Mô tả, label, caption (đạt tối thiểu contrast 4.5:1) |

**Màu trạng thái (status) — dùng thống nhất cho MỌI enum trong schema, không tự chế màu khác theo từng màn hình:**

| Nhóm ý nghĩa | Hex | Áp dụng cho enum nào |
|---|---|---|
| Success / Active / Paid / Approved | `#16A34A` | `User.status=active`, `Class.status=active`, `StudentInvoice.status=paid`, `ClassSession.status=approved`, `SessionAttendance=present` |
| Warning / Pending / Partially-paid | `#D97706` | `User.status=pending`, `StudentInvoice.status=partially_paid`, `ClassSession.status=completed_pending`, `Attempt.status=submitted` (chờ chấm) |
| Danger / Suspended / Rejected / Overdue | `#DC2626` | `User.status=suspended`, `ClassSession.status=rejected`, `StudentInvoice` quá hạn, `SessionAttendance=absent_unexcused` |
| Info / Draft / Scheduled / In-progress | `#0284C7` | `PayrollPeriod.status=draft`, `ClassSession.status=scheduled`, `Attempt.status=in_progress` |
| Neutral / Archived / Void / Dropped | `#64748B` | `Class.status=archived`, `StudentInvoice.status=void`, `ClassEnrollment.status=dropped` |

> Bảng này chính là nguồn duy nhất cho màu badge trạng thái — khi code, map thẳng enum → màu ở đây, không quyết định lại ở từng component.

### 2.2 Typography

- **Heading:** Lexend — thiết kế cho khả năng đọc, phù hợp giao diện quản lý nghiêm túc, hỗ trợ dấu tiếng Việt.
- **Body:** Source Sans 3 — trung tính, dễ đọc số liệu dài, hỗ trợ tiếng Việt đầy đủ.
- **Số liệu/mã (tuỳ chọn):** dùng `font-variant-numeric: tabular-nums` với Source Sans 3 cho các cột số trong bảng (học phí, lương) để căn thẳng hàng — không cần font mono riêng trừ khi hiển thị `enrollmentCode`/`transactionReference`.

```css
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap');
```

```js
// tailwind.config.js
fontFamily: {
  heading: ['Lexend', 'sans-serif'],
  body: ['Source Sans 3', 'sans-serif'],
}
```

### 2.3 Spacing, radius, shadow

| Token | Giá trị | Ghi chú |
|---|---|---|
| Base unit | `8px` | Mọi spacing là bội số của 8 (4 dùng cho spacing rất nhỏ) |
| Card padding | `16px` (mobile) / `20px` (desktop) | |
| Border radius | `8px` (card, input) / `6px` (badge, button) | Không bo tròn quá lớn — giữ cảm giác "công cụ" chứ không "playful" |
| Shadow | `shadow-sm` mặc định, `shadow-md` khi hover card có thể click | Tránh shadow nặng gây rối trên dashboard nhiều card |
| Sidebar width | `240px` (desktop), thu gọn thành icon-only `64px` khi collapse | |
| Header height | `56px` | Sticky top |
| Table row height | `40px` | Đủ thoáng để bấm trên mobile, không quá dày đặc |

### 2.4 Breakpoints

`375px` (mobile) / `768px` (tablet — sidebar auto-collapse) / `1024px` (desktop) / `1440px` (wide — tăng max-width content, không kéo giãn bảng vô hạn).

---

## 3. Layout Shell (dùng chung 2 dashboard)

```
Desktop (≥1024px):
┌─────────────┬──────────────────────────────────────┐
│             │  Header (56px, sticky)                │
│  Sidebar    │  [Breadcrumb]      [🔔] [Avatar ▾]    │
│  (240px)    ├──────────────────────────────────────┤
│             │  Page title + primary action button   │
│  - Logo     │  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│  - Nav items│  │KPI │ │KPI │ │KPI │ │KPI │  (4-6 max)│
│  - (Admin/  │  └────┘ └────┘ └────┘ └────┘          │
│    Teacher  │  ┌──────────────────────────────────┐ │
│    khác nav)│  │ Filter/Toolbar                    │ │
│             │  │ Data table (sortable, sticky head)│ │
│             │  │ ...                                │ │
│             │  └──────────────────────────────────┘ │
└─────────────┴──────────────────────────────────────┘

Mobile (<768px): Sidebar → bottom nav hoặc hamburger drawer.
Table → chuyển sang card list (mỗi row = 1 card), không ép horizontal scroll bảng phức tạp.
```

Nguyên tắc: **mỗi trang chính = KPI row (tối đa 4-6 thẻ) + 1 khu vực nội dung chính** (bảng hoặc form). Không nhồi quá 1 bảng lớn trên 1 trang — nếu cần xem chi tiết, điều hướng sang trang/drawer riêng.

---

## 4. Component Conventions

### 4.1 KPI Card
- 4-6 số liệu tối đa mỗi trang, font số lớn (28-32px, Lexend semibold), label nhỏ phía trên (Source Sans 3, `text-slate-600`, uppercase, `text-xs`)
- Có thể kèm mũi tên xu hướng (▲/▼) + % so với kỳ trước nếu có dữ liệu so sánh
- Không dùng emoji làm icon — dùng Lucide icon, kích thước cố định `20px` hoặc `24px`

### 4.2 Data Table
- Sticky header, sort theo cột (click header)
- Checkbox cột đầu cho bulk action khi cần (vd: Admin duyệt hàng loạt tài khoản)
- Pagination hoặc infinite scroll — ưu tiên pagination cho bảng tài chính (invoice, payroll) vì cần con số tổng rõ ràng
- Mobile: chuyển thành list card, KHÔNG bắt người dùng scroll ngang bảng rộng
- Badge trạng thái dùng đúng bảng màu ở mục 2.1

### 4.3 Status Badge
- Pill nhỏ, `rounded-full`, `px-2.5 py-0.5`, `text-xs font-medium`
- Màu nền = màu trạng thái ở 15% opacity, màu chữ = màu trạng thái đậm (đảm bảo contrast)

### 4.4 Empty State
- Không để trắng trơn — luôn có: icon nhạt + câu giải thích ngắn + hành động gợi ý (vd: "Chưa có lớp nào — Tạo lớp mới")
- Giọng văn: nói thẳng, không xin lỗi, không màu mè

### 4.5 Form & Modal
- Modal cho thao tác nhanh (duyệt tài khoản, xác nhận thanh toán), trang riêng cho thao tác dài (tạo assignment nhiều bước)
- Label luôn hiện thường trực (không dùng placeholder thay label)
- Nút hành động: label mô tả đúng hành động ("Duyệt tài khoản", không phải "Xác nhận" chung chung)

### 4.6 Notification
- Icon chuông ở header, badge số đỏ khi có chưa đọc
- Dropdown ngắn (5-6 gần nhất) + link "Xem tất cả"

### 4.7 Loading & Feedback
- Skeleton loading cho bảng/card khi tải dữ liệu (không dùng spinner toàn trang che hết layout)
- Toast xác nhận sau hành động, đúng động từ với nút đã bấm (bấm "Duyệt" → toast "Đã duyệt")

---

## 5. Icon & Asset

- Bộ icon: **Lucide** (nhất quán, không trộn nhiều bộ icon)
- Kích thước cố định theo ngữ cảnh: `16px` (inline text), `20px` (button/table action), `24px` (nav, KPI card)
- Không dùng emoji làm icon giao diện (chỉ dùng emoji trong nội dung tài liệu `docs/`, không dùng trong UI thật)

---

## 6. Biểu đồ (Chart)

Dùng **Recharts**. Chọn loại chart theo bản chất dữ liệu, không chọn theo "cho đẹp":

| Dữ liệu | Chart | Ghi chú |
|---|---|---|
| Doanh thu học phí theo tháng | Line/Area Chart | Fill 20% opacity, 1 màu accent |
| Lương giáo viên theo người (so sánh) | Horizontal Bar Chart | Sắp xếp giảm dần, có label giá trị |
| Phân bổ trạng thái điểm danh/hoá đơn | Stacked Bar hoặc Donut | Donut chỉ dùng khi ≤5 nhóm |
| Heatmap kỹ năng học sinh theo tuần | Grid heatmap (không có sẵn trong Recharts — custom bằng div grid + màu theo cường độ) | |
| Xu hướng điểm trung bình lớp theo thời gian | Line Chart nhiều series | Giới hạn ≤5 series để không rối |

Mọi chart phải có bảng dữ liệu ẩn (hoặc nút "Xem dạng bảng") cho khả năng tiếp cận — không chỉ dựa vào màu để truyền đạt thông tin.

---

## 7. Checklist trước khi giao UI

- [ ] Không dùng emoji làm icon (dùng SVG Lucide)
- [ ] Mọi phần tử click được có `cursor-pointer` + hover feedback rõ ràng
- [ ] Transition mượt (150-300ms), tôn trọng `prefers-reduced-motion`
- [ ] Contrast text ở light mode ≥ 4.5:1 (đã kiểm bảng màu ở mục 2.1)
- [ ] Focus state hiện rõ khi dùng bàn phím (quan trọng vì Admin/Teacher dùng nhiều bàn phím + Tab)
- [ ] Responsive đủ 375px / 768px / 1024px / 1440px, bảng không vỡ layout trên mobile
- [ ] Empty state có hướng dẫn hành động, không để trống trơn
- [ ] Badge trạng thái map đúng bảng màu ở mục 2.1, không tự chế màu mới

---

## 8. Điểm sẽ khác nhau giữa 2 dashboard (base này KHÔNG bao gồm)

File này chỉ là nền tảng dùng chung. Hai file thiết kế tiếp theo sẽ kế thừa từ đây và chỉ mô tả phần riêng:

**Admin Dashboard** (`docs/design/admin-dashboard.md` — cần tạo tiếp) sẽ tập trung:
- KPI: tổng doanh thu tháng, tài khoản chờ duyệt, hoá đơn quá hạn, payroll chờ xử lý
- Bảng chính: quản lý tài khoản (approve/suspend), invoice, payroll period
- Nav riêng: Accounts, Billing, Payroll, System Monitoring

**Teacher Dashboard** (`docs/design/teacher-dashboard.md` — cần tạo tiếp) sẽ tập trung:
- KPI: số lớp đang dạy, bài chờ chấm, buổi học chờ duyệt, thu nhập tháng này
- Bảng chính: danh sách lớp, bài nộp chờ chấm, buổi học & điểm danh
- Nav riêng: My Classes, Question Bank (của mình), Assignments, Payroll (view-only)

Cả hai đều dùng chung: token màu/font, layout shell, KPI card, data table, badge trạng thái, empty state ở file này — **không định nghĩa lại**.

## 9. Việc cần làm tiếp

1. Tạo `docs/design/admin-dashboard.md` — áp token này vào wireframe cụ thể cho Admin
2. Tạo `docs/design/teacher-dashboard.md` — áp token này vào wireframe cụ thể cho Teacher
3. Xác nhận bảng màu status (mục 2.1) khớp 100% với enum thật trong `schema.prisma` trước khi code UI
