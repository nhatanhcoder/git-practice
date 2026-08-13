---
page: Admin · Billing
route: /admin/invoices
source_contract: ../pages/admin-pages/admin-invoice-list.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · Billing

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

**This page:** the tuition collection view for one billing period — who has paid, who has not, and
how much is still outstanding across all students.

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

Header: breadcrumb `Trang chủ / Học phí` on the left; `bell` icon + avatar menu on the right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Page structure — top to bottom

1. **Title row** — `h1` `Học phí` + month selector on the right + primary button `Tạo hóa đơn tháng…`
2. **KPI row** — 3 tiles (see §5)
3. **Filter toolbar** — search by student name, status select
4. **Invoice table**
5. **Pagination** — right-aligned

## 5. Component specs

### KPI tiles (3)

| # | Label | Value | Note |
|---|---|---|---|
| 1 | ĐÃ THU | `5/8 học sinh` | plus a thin progress track underneath: filled `#2563EB`, track `#E2E8F0`, height 6px, radius 3px |
| 2 | TỔNG THU | `12.500.000 ₫` | |
| 3 | CÒN NỢ | `7.500.000 ₫` | |

Tile 1's track is a **meter**, not a donut or ring. Value 30px Lexend 600.
Do not colour tile 3 red — an outstanding balance mid-month is normal, not an error.

### Invoice table

| Column | Content | Align |
|---|---|---|
| Học sinh | avatar 28px + `nickname` | left |
| Kỳ | `01/08 – 31/08/2026` | left |
| Tổng | amount | right |
| Đã nộp | amount | right |
| Còn nợ | amount, bold when > 0 | right |
| Trạng thái | status pill | left |

Sticky header, row 40px, row hover `#F8FAFC` + `cursor: pointer` (opens detail).
Money columns right-aligned with tabular-nums so digits line up.

### Status pills for invoices

| status | label | hex |
|---|---|---|
| `unpaid` | `Chưa nộp` | `#D97706` |
| `unpaid` **past period end** | `Quá hạn` | `#DC2626` |
| `partially_paid` | `Còn nợ một phần` | `#D97706` |
| `paid` | `Đã nộp` | `#16A34A` |
| `void` | `Đã hủy` | `#64748B` |

Note: `unpaid` and `partially_paid` share the warning hue; `Quá hạn` is a **derived**
state, not a stored enum value — it is `unpaid` after the period ends.

## 6. Data — use these exact values

```json
{
  "period": "08/2026",
  "summary": { "paidStudents": 5, "totalStudents": 8, "collected": 12500000, "outstanding": 7500000 },
  "invoices": [
    {"student":"Nguyễn Minh Anh","total":2500000,"paid":2500000,"status":"paid"},
    {"student":"Lê Quang Dũng","total":2500000,"paid":2500000,"status":"paid"},
    {"student":"Hoàng Văn Nam","total":2500000,"paid":2500000,"status":"paid"},
    {"student":"Vũ Ngọc Bích","total":2500000,"paid":2500000,"status":"paid"},
    {"student":"Đặng Thu Trang","total":2500000,"paid":2500000,"status":"paid"},
    {"student":"Trần Bảo Long","total":2500000,"paid":1000000,"status":"partially_paid"},
    {"student":"Ngô Khánh Vy","total":2500000,"paid":0,"status":"unpaid"},
    {"student":"Mai Tuấn Kiệt","total":2500000,"paid":0,"status":"void"}
  ]
}
```

Deliberate coverage: every one of the four enum values appears, including a partial
payment and a voided invoice.

## 7. States — render all, switchable

Switcher: `Ready · Loading · Empty · Partial · Error · Mobile`

| State | Appearance |
|---|---|
| **Loading** | KPI + table skeleton |
| **Ready** | Data above |
| **Empty** | No invoices for the selected month → `inbox` icon 15%, `Chưa tạo hóa đơn cho kỳ này`, body line, button `Tạo hóa đơn tháng 8` |
| **Partial** | Table rendered, KPI tiles still skeleton — the summary is a separate aggregate query |
| **Error** | Inline banner above the table, month selection preserved |
| **Forbidden** / **Offline** | N/A |

## 8. Copy — exact strings

| Location | String |
|---|---|
| Page title | `Học phí` |
| Primary button | `Tạo hóa đơn tháng…` |
| KPI labels | `ĐÃ THU` · `TỔNG THU` · `CÒN NỢ` |
| Columns | `Học sinh` · `Kỳ` · `Tổng` · `Đã nộp` · `Còn nợ` · `Trạng thái` |
| Search placeholder | `Tìm học sinh` |
| Empty heading | `Chưa tạo hóa đơn cho kỳ này` |
| Empty body | `Tạo hóa đơn hàng loạt cho tất cả học sinh đã có mức học phí.` |
| Error | `Không tải được danh sách hóa đơn.` · `Thử lại` |

## 9. Interactions

- Month selector → refetch (mockup: swaps to Empty state for any month ≠ 08/2026)
- Row click → invoice detail
- `Tạo hóa đơn tháng…` → the generate wizard
- Below 768px: table becomes card list, one card per invoice, money right-aligned inside the card

## 10. Constraints — do NOT

- Do not put a "record payment" action on this page — payment happens on the detail page only, so every payment has one audit path
- Do not colour the CÒN NỢ tile red
- Do not use a donut or ring for the collection ratio — flat meter only
- Do not add a per-row quick-pay button

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
