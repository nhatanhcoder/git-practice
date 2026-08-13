---
page: Admin · Tuition Rates
route: /admin/tuition-rates
source_contract: ../pages/admin-pages/admin-tuition-rates.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · Tuition Rates

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

**This page:** what each student pays per period, and the full history of past rates. Rates are
append-only: a new rate supersedes the old one from a date, it never overwrites it.

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
Sidebar nav, active item = **Học phí**:
`Tổng quan` · `Tài khoản` · `Học phí` · `Lương` · `Giám sát`

Header: breadcrumb `Trang chủ / Học phí / Mức học phí` on the left; `bell` icon + avatar menu on the right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Page structure

1. **Title row** — `h1` `Mức học phí` + primary button `Thiết lập học phí`
2. **Info banner** — a persistent, non-dismissible note explaining append-only behaviour
3. **Rate table** — current rate per student
4. **History drawer** — right-side, opens on row click

## 5. Component specs

### Info banner

Background `#0284C7` at 8%, left border `3px #0284C7`, `info` icon 16px, 13px text:
`Mỗi lần thiết lập sẽ tạo một mức mới có hiệu lực từ ngày bạn chọn. Mức cũ được giữ lại để giải thích các hóa đơn đã phát hành.`

### Rate table

| Column | Content | Align |
|---|---|---|
| Học sinh | avatar 28px + nickname | left |
| Mức hiện tại | `2.500.000 ₫` | right |
| Hiệu lực từ | `01/03/2026` | left |
| Số lần thay đổi | `2` | right |
| (actions) | `more-horizontal` → `Đổi mức`, `Xem lịch sử` | right |

A student with no rate shows `Chưa thiết lập` in `#475569` italic and an inline
`Thiết lập` link instead of an amount. These rows sort to the top.

### History drawer

Width `420px`, slides from the right, backdrop `#0F172A` @ 40%.
Header: student name + `Đóng`. Body: vertical timeline, newest first —
each entry `2.500.000 ₫` (Lexend 600, 18px), `Hiệu lực từ 01/03/2026`, `Thiết lập bởi Admin · 28/02/2026`.
The current entry carries a small `Đang áp dụng` pill in success green.

### Set-rate modal

`max-width: 480px`. Fields: `Học sinh` (select, prefilled if opened from a row),
`Mức học phí (VND)` (numeric, required), `Hiệu lực từ` (date, required, defaults to the
1st of next month). Buttons `Hủy` / `Lưu mức mới`.

Below the fields, a live preview line: `Mức mới sẽ áp dụng cho các hóa đơn từ 01/09/2026.`

## 6. Data — use these exact values

```json
{
  "rates": [
    {"student":"Mai Tuấn Kiệt","current":null,"effectiveFrom":null,"changes":0},
    {"student":"Nguyễn Minh Anh","current":2500000,"effectiveFrom":"01/03/2026","changes":2},
    {"student":"Lê Quang Dũng","current":2500000,"effectiveFrom":"01/03/2026","changes":1},
    {"student":"Hoàng Văn Nam","current":2800000,"effectiveFrom":"01/06/2026","changes":2},
    {"student":"Trần Bảo Long","current":2500000,"effectiveFrom":"01/07/2026","changes":1}
  ],
  "history": {
    "Nguyễn Minh Anh": [
      {"amount":2500000,"effectiveFrom":"01/03/2026","setAt":"28/02/2026","current":true},
      {"amount":2200000,"effectiveFrom":"01/01/2026","setAt":"30/12/2025","current":false}
    ]
  }
}
```

## 7. States

Switcher: `Ready · Loading · Empty · Error · Drawer · Modal · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Table skeleton |
| **Ready** | Data above — note the first row has no rate set |
| **Empty** | No rates at all → `Chưa thiết lập học phí cho học sinh nào` + button |
| **Partial** | N/A |
| **Error** | Inline retry above the table |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Title | `Mức học phí` |
| Primary | `Thiết lập học phí` |
| Columns | `Học sinh` · `Mức hiện tại` · `Hiệu lực từ` · `Số lần thay đổi` |
| No rate | `Chưa thiết lập` / `Thiết lập` |
| Menu | `Đổi mức` · `Xem lịch sử` |
| Drawer title | `Lịch sử mức học phí` |
| Current pill | `Đang áp dụng` |
| Modal fields | `Học sinh` · `Mức học phí (VND)` · `Hiệu lực từ` |
| Modal submit | `Lưu mức mới` |
| Toast | `Đã lưu mức học phí mới` |
| Empty | `Chưa thiết lập học phí cho học sinh nào` |

## 9. Interactions

- Row click → history drawer; `Đổi mức` → modal
- Changing `Hiệu lực từ` updates the preview line live
- `Esc` closes drawer and modal
- Below 768px: drawer becomes a full-screen sheet; table becomes card list

## 10. Constraints — do NOT

- Do not present this as "edit the rate" — rates are append-only history
- Do not add a delete action; past invoices/payroll depend on old rates
- Do not hide superseded rates — the history is the point of the screen
- Do not sort students with no rate to the bottom — they are the actionable rows

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
