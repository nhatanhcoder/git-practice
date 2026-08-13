---
page: Admin · Session Review
route: /admin/payroll/sessions
source_contract: ../pages/admin-pages/admin-session-review.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · Session Review

> **Paste this entire file into Claude Design, together with the `ui-ux-pro-max` skill.**
> Self-contained by design — every token, string and number needed is below.
> Do not look for other files.

---

## 0. Build target

A single self-contained HTML file (inline CSS + JS, no build step). Desktop-first at
1440px, responsive to 375px. Static mockup, all data hardcoded from §6.

---

## 1. Product context

**Product:** HSK Learning Platform — a Chinese-language teaching platform (HSK levels 1–9)
with three roles: Admin, Teacher, Student.

**This page:** the queue of teacher-submitted sessions awaiting approval. This is the gate that feeds
payroll — no session is payable until it passes here. The Admin's job is to clear the queue.

**Audience and tone:** administrative and accounting staff handling tuition and teacher
payroll, often on a large monitor all day. Precise and trustworthy, high information
density, no decoration. Reference points: Linear, Stripe Dashboard.

**Explicitly rejected:** purple/gradient "AI dashboard" styling, dark+neon themes,
glassmorphism, large rounded corners, decorative illustrations, emoji as icons, gauges
and progress rings. Ruled out deliberately — do not reintroduce.

---

## 2. Design tokens — use these exact values

### Colour — interface

| Role | Hex | Use |
|---|---|---|
| Primary | `#0F172A` | Sidebar, headings, primary button |
| Primary hover | `#1E293B` | Primary hover |
| Accent | `#2563EB` | Links, active nav, focus ring |
| Background | `#F8FAFC` | Page background |
| Surface | `#FFFFFF` | Cards, tables, modals |
| Border | `#E2E8F0` | Card borders, row dividers |
| Text primary | `#0F172A` | Headings, key values |
| Text secondary | `#475569` | Labels, captions, meta |

### Colour — status (map enum → hex; never choose one locally)

| Meaning | Hex | Enum values |
|---|---|---|
| Success | `#16A34A` | `active`, `paid`, `approved`, `present` |
| Warning | `#D97706` | `pending`, `partially_paid`, `unpaid`, `completed_pending`, `finalized` |
| Danger | `#DC2626` | `suspended`, `rejected`, overdue invoice, `absent_unexcused` |
| Info | `#0284C7` | `draft`, `scheduled`, `in_progress` |
| Neutral | `#64748B` | `archived`, `void`, `dropped` |

Badge styling: background = the status hex at **15% opacity**, text = the status hex at
full strength. Never a solid saturated fill.

### Typography

```
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap');
```

- Headings and large values → **Lexend**
- Body, tables, forms → **Source Sans 3**
- Must render Vietnamese diacritics — all UI copy is Vietnamese
- All numeric columns use `font-variant-numeric: tabular-nums`

### Spacing, radius, elevation

| Token | Value |
|---|---|
| Base unit | `8px` (all spacing a multiple of 8) |
| Card padding | `20px` desktop, `16px` mobile |
| Radius | `8px` cards/inputs, `6px` buttons, `9999px` status pills |
| Shadow | `shadow-sm`; `shadow-md` only on hoverable cards |
| Sidebar | `240px`, background `#0F172A` |
| Header | `56px`, sticky |
| Table row | `40px` |

### Breakpoints

`375px` · `768px` (sidebar collapses to drawer) · `1024px` · `1440px` (content max-width caps)

### Icons

**Lucide only**, inline SVG, `stroke-width: 2`. Sizes `16px` inline, `20px` action, `24px` nav.

### Currency & dates

Vietnamese format: `.` thousands separator, `₫` suffix — `12500000` → `12.500.000 ₫`.
Dates `dd/MM/yyyy`; datetimes `dd/MM/yyyy HH:mm`.

---

## 3. Layout shell

Sidebar `240px` (`#0F172A`) + sticky header `56px` + content area.
Sidebar nav, active item = **Lương**:
`Tổng quan` · `Tài khoản` · `Học phí` · `Lương` · `Giám sát`

Header: breadcrumb `Trang chủ / Lương / Buổi chờ duyệt` on the left; `bell` icon + avatar menu on the right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Page structure

1. **Title row** — `h1` `Buổi học chờ duyệt` + count `5 buổi`
2. **Filter toolbar** — teacher select, date-range
3. **Session table**
4. **Review drawer** — right-side, opens on row click; approve/reject happen here

## 5. Component specs

### Session table

| Column | Content | Align |
|---|---|---|
| Giáo viên | avatar 28px + nickname | left |
| Lớp | class name | left |
| Ngày dạy | `08/08/2026` | left |
| Thời lượng thực tế | `90 phút` | right |
| Chủ đề | lesson topic, truncated with ellipsis | left |
| Điểm danh | `7/8` + a 4px bar | left |
| (actions) | `check` and `x` icon buttons | right |

The `Điểm danh` bar is a 40px-wide track, `#E2E8F0`, filled `#16A34A` by present ratio.
It is a **meter**, not a chart — no legend, no axis.

### Review drawer — where the decision is made

Width `520px`. Contents top to bottom:

1. Teacher + class header, session date
2. **Thời gian** — scheduled vs actual, side by side:
   `Theo lịch 19:00 – 20:30` / `Thực tế 19:05 – 20:35 (90 phút)`.
   Highlight the actual figures — they drive pay
3. **Chủ đề bài học** — full lesson topic
4. **Ghi chú giảng dạy** — teaching notes, or `Không có ghi chú`
5. **Điểm danh** — student list with a status pill each: `Có mặt` `#16A34A`, `Vắng có phép` `#D97706`, `Vắng không phép` `#DC2626`
6. Footer bar: `Từ chối` (danger ghost) + `Duyệt buổi học` (primary)

### Reject modal

Opens over the drawer. Required `Lý do từ chối` textarea, submit disabled while empty.
Helper text: `Giáo viên sẽ nhận được lý do này và có thể chỉnh sửa rồi gửi lại.`

## 6. Data — use these exact values

```json
{
  "sessions": [
    {"teacher":"Phạm Thị Lan","class":"HSK 2 — Nhóm A","date":"08/08/2026",
     "scheduled":"19:00 – 20:30","actual":"19:05 – 20:35","minutes":90,
     "topic":"Bài 12 — Trợ từ ngữ khí 吗 / 呢","notes":"Học sinh nắm bài tốt, cần luyện thêm phát âm.",
     "attendance":{"present":7,"excused":1,"unexcused":0,"total":8}},
    {"teacher":"Phạm Thị Lan","class":"HSK 2 — Nhóm A","date":"06/08/2026",
     "scheduled":"19:00 – 20:30","actual":"19:00 – 20:30","minutes":90,
     "topic":"Bài 11 — Câu hỏi lựa chọn","notes":"",
     "attendance":{"present":8,"excused":0,"unexcused":0,"total":8}},
    {"teacher":"Đỗ Hải Yến","class":"HSK 3 — Nhóm B","date":"06/08/2026",
     "scheduled":"18:00 – 19:30","actual":"18:10 – 19:25","minutes":75,
     "topic":"Bài 8 — Bổ ngữ kết quả","notes":"Kết thúc sớm 5 phút.",
     "attendance":{"present":5,"excused":0,"unexcused":1,"total":6}},
    {"teacher":"Đỗ Hải Yến","class":"HSK 1 — Nhóm C","date":"05/08/2026",
     "scheduled":"17:00 – 18:00","actual":"17:00 – 18:00","minutes":60,
     "topic":"Bài 5 — Số đếm và ngày tháng","notes":"",
     "attendance":{"present":4,"excused":1,"unexcused":0,"total":5}},
    {"teacher":"Phạm Thị Lan","class":"HSK 2 — Nhóm A","date":"01/08/2026",
     "scheduled":"19:00 – 20:30","actual":"19:00 – 20:50","minutes":110,
     "topic":"Bài 10 — Ôn tập giữa kỳ","notes":"Dạy bù 20 phút cho phần ôn tập.",
     "attendance":{"present":8,"eqused":0,"unexcused":0,"total":8}}
  ]
}
```

Deliberate coverage: an over-run session (110 min), an under-run (75 min), an exact
match, an unexcused absence, and two sessions with empty notes.

## 7. States

Switcher: `Ready · Loading · Empty · Error · Drawer · Modal: từ chối · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Table skeleton |
| **Ready** | Five rows above |
| **Empty** | **A success state — make it read that way.** Centred `check-circle` in `#16A34A` at 15%, `Không có buổi học chờ duyệt`, body `Tất cả buổi học đã được xử lý.` No CTA — there is nothing to do |
| **Partial** | N/A |
| **Error** | Inline retry, filters preserved |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Title | `Buổi học chờ duyệt` |
| Columns | `Giáo viên` · `Lớp` · `Ngày dạy` · `Thời lượng thực tế` · `Chủ đề` · `Điểm danh` |
| Drawer sections | `Thời gian` · `Chủ đề bài học` · `Ghi chú giảng dạy` · `Điểm danh` |
| Time labels | `Theo lịch` · `Thực tế` |
| No notes | `Không có ghi chú` |
| Attendance pills | `Có mặt` · `Vắng có phép` · `Vắng không phép` |
| Actions | `Duyệt buổi học` · `Từ chối` |
| Reject field | `Lý do từ chối` |
| Reject helper | `Giáo viên sẽ nhận được lý do này và có thể chỉnh sửa rồi gửi lại.` |
| Toasts | `Đã duyệt buổi học` · `Đã từ chối buổi học` |
| Empty | `Không có buổi học chờ duyệt` / `Tất cả buổi học đã được xử lý.` |

## 9. Interactions

- Row click → drawer. Approving or rejecting closes the drawer and **removes the row** with a 200ms fade+collapse, then updates the count
- Approving the last row transitions the page to the Empty success state
- Below 768px: table → card list; drawer → full-screen sheet

## 10. Constraints — do NOT

- Do not let the Admin edit session times, topic, notes or attendance — approve or reject only. Corrections are the teacher's job on resubmit
- Do not allow rejection without a reason
- Do not show approved or rejected sessions here — this is a queue, not a log
- Do not use a chart for attendance; a meter bar only

---

## 11. Instructions for `ui-ux-pro-max`

Use it for **layout, density and interaction quality** on a data-dense B2B admin screen —
spacing rhythm, scan-ability, toolbar and table composition, empty-state craft.

**Do not run its design-system generator, and do not take its palette or font pairing.**
This project has a locked design system, reproduced in §2. Where any suggestion conflicts
with §2, §5 or §10, **§2/§5/§10 win**. Keep only structure and anti-pattern advice.

---

## 12. Deliverable

One `.html` file:

- All CSS in one `<style>` block, all JS in one `<script>` block
- Google Fonts via `@import`; Lucide icons as inline SVG; no other network requests
- The §7 state switcher wired and working
- Renders correctly at 1440px, 1024px, 768px, 375px
- Text contrast ≥ 4.5:1 everywhere (the §2 palette satisfies this — do not deviate)
