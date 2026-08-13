---
page: Admin · User Detail
route: /admin/users/[userId]
source_contract: ../pages/admin-pages/admin-user-detail.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · User Detail

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

**This page:** the read-only profile of one account, with its history, plus the three status actions.
The Admin lands here from the accounts list before deciding to approve or suspend someone.

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
Sidebar nav, active item = **Tài khoản**:
`Tổng quan` · `Tài khoản` · `Học phí` · `Lương` · `Giám sát`

Header: breadcrumb `Trang chủ / Tài khoản / Nguyễn Minh Anh` on the left; `bell` icon + avatar menu on the right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Page structure — top to bottom

1. **Back link** — `chevron-left` + `Quay lại danh sách`
2. **Header card** — 64px avatar, `nickname` (Lexend 600, 22px), email, role text, status pill, primary status action button on the right
3. **Identity card** — 3-column definition grid: Ngày đăng ký · Đăng nhập gần nhất · Trạng thái
4. **History panel** — **role-dependent**, see §5

There is no edit form on this page. Admin may read other users' profiles, not change them.

## 5. Component specs

### Header card status action

One button only, matching the current status:
`pending` → `Duyệt tài khoản` (primary, `#0F172A`) ·
`active` → `Khóa tài khoản` (danger outline, `#DC2626`) ·
`suspended` → `Mở khóa tài khoản` (primary)

### History panel — role-dependent

| Role | Panels |
|---|---|
| `student` | **Lớp đã tham gia** (class name, teacher, joined date, enrollment status pill) + **Bài đã nộp** (assignment, class, submitted date, score, attempt status pill) |
| `teacher` | **Lớp đang dạy** (class name, student count, status pill) + **Buổi học** (date, class, duration, session status pill) |
| `admin` | none — hide the panel entirely, do not render an empty shell |

Each panel is a card with a title and a compact table (row height 40px, max 5 rows,
`Xem tất cả` link if more).

### Session-history placeholder

Below the history panels, render a **disabled card**: title `Lịch sử đăng nhập`, body
`Chưa khả dụng — phụ thuộc Sprint 5`, 60% opacity, no interaction. Do not omit it and do
not leave blank space where it will go.

### Modals

Same three as the accounts list: approve (confirm), suspend (**required** reason
textarea, submit disabled while empty), reactivate (confirm). `max-width: 480px`.

## 6. Data — use these exact values

```json
{
  "user": { "nickname":"Nguyễn Minh Anh","email":"minhanh@example.com","role":"student",
            "status":"pending","createdAt":"09/08/2026","lastLoginAt":null,
            "avatarUrl":null,"hskLevelGoal":4 },
  "enrollments": [],
  "attempts": []
}
```

A second dataset for the state switcher (`Ready: teacher`):

```json
{
  "user": { "nickname":"Phạm Thị Lan","email":"lan.pham@example.com","role":"teacher",
            "status":"active","createdAt":"02/03/2026","lastLoginAt":"11/08/2026 07:42","bio":"Giáo viên HSK 1–4" },
  "classes": [
    {"name":"HSK 2 — Nhóm A","students":8,"status":"active"},
    {"name":"HSK 1 — Nhóm C","students":5,"status":"active"}
  ],
  "sessions": [
    {"date":"08/08/2026","class":"HSK 2 — Nhóm A","duration":"90 phút","status":"completed_pending"},
    {"date":"06/08/2026","class":"HSK 2 — Nhóm A","duration":"90 phút","status":"approved"},
    {"date":"01/08/2026","class":"HSK 1 — Nhóm C","duration":"60 phút","status":"approved"}
  ]
}
```

The default (`Nguyễn Minh Anh`) is deliberately a **brand-new pending student with no
history and a null last-login** — the exact case the empty states must handle.

## 7. States — render all, switchable

Switcher: `Ready: student · Ready: teacher · Loading · Empty · Partial · Error 404 · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Header card skeleton + history skeleton, independently |
| **Ready** | Two datasets above |
| **Empty** | User exists, no history → inside each panel: `inbox` icon 15% opacity + `Chưa có hoạt động nào`. Never a blank card |
| **Partial** | Header + identity resolved, history panels still skeleton — history is the slower join |
| **Error 404** | **Full-page** not-found: centred `alert-circle`, `Không tìm thấy tài khoản này.`, button `Quay lại danh sách`. Not an inline banner — the record does not exist |
| **Forbidden** | N/A — route guard redirects before render |
| **Offline** | N/A |

## 8. Copy — exact strings

| Location | String |
|---|---|
| Back link | `Quay lại danh sách` |
| Identity labels | `Ngày đăng ký` · `Đăng nhập gần nhất` · `Trạng thái` |
| Null last login | `—` |
| Student panels | `Lớp đã tham gia` · `Bài đã nộp` |
| Teacher panels | `Lớp đang dạy` · `Buổi học` |
| Placeholder card | `Lịch sử đăng nhập` / `Chưa khả dụng — phụ thuộc Sprint 5` |
| Empty panel | `Chưa có hoạt động nào` |
| 404 | `Không tìm thấy tài khoản này.` |
| Status pills | `Chờ duyệt` · `Đang hoạt động` · `Đã khóa` |
| Toasts | `Đã duyệt tài khoản` · `Đã khóa tài khoản` · `Đã mở khóa tài khoản` |

## 9. Interactions

- Status button → its modal → confirm → toast + pill updates optimistically
- History rows are **not** clickable in this mockup (no Admin route for a class or attempt)
- Transitions 150–300ms; honour `prefers-reduced-motion`
- Visible focus ring `#2563EB` 2px, 2px offset
- Below 768px: identity grid 3→1 column, history tables become stacked card lists

## 10. Constraints — do NOT

- Do not add an edit form, or make any profile field editable
- Do not add a delete-account action
- Do not render the teacher panels for a student, or vice versa
- Do not omit the Sprint-5 placeholder card

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
