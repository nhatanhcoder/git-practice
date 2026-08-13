---
page: Admin · Payroll Periods
route: /admin/payroll
source_contract: ../pages/admin-pages/admin-payroll-list.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · Payroll Periods

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

**This page:** every pay period and its state, and the entry point for opening a new draft over the
sessions approved so far.

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

Header: breadcrumb `Trang chủ / Lương` on the left; `bell` icon + avatar menu on the right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Page structure

1. **Title row** — `h1` `Kỳ lương` + primary button `Tạo kỳ lương`
2. **Filter toolbar** — teacher select, year select
3. **Period table**
4. **Pagination**

## 5. Component specs

### Period table

| Column | Content | Align |
|---|---|---|
| Kỳ | `01/07 – 31/07/2026` | left |
| Số giáo viên | `2` | right |
| Số buổi | `24` | right |
| Tổng chi | `7.500.000 ₫` | right |
| Trạng thái | status pill | left |
| Ngày chốt | `02/08/2026` or `—` | left |

Status pills use the §2 map: `draft` → Info `#0284C7` `Nháp`, `finalized` → Warning
`#D97706` `Đã chốt`, `paid` → Success `#16A34A` `Đã trả`.

Row click → period detail. Sortable by `Kỳ` (default, newest first).

### Create-period modal

`max-width: 480px`. Fields `Từ ngày` and `Đến ngày` (both date, required), defaulting to
the previous calendar month. Buttons `Hủy` / `Tạo kỳ lương`.

Below the fields, a live preview line queried from the selected range:
`Sẽ tổng hợp 24 buổi học đã duyệt của 2 giáo viên.`
If the range contains zero approved sessions, the preview reads
`Không có buổi học đã duyệt trong khoảng này.` and the submit button is disabled.

**Do not hardcode a calendar month.** The period boundary is an open project decision, so
the modal must accept an arbitrary range.

## 6. Data — use these exact values

```json
{
  "periods": [
    {"range":"01/07 – 31/07/2026","teachers":2,"sessions":24,"total":7500000,"status":"finalized","finalizedAt":"02/08/2026"},
    {"range":"01/06 – 30/06/2026","teachers":2,"sessions":27,"total":8750000,"status":"paid","finalizedAt":"01/07/2026"},
    {"range":"01/05 – 31/05/2026","teachers":2,"sessions":26,"total":8250000,"status":"paid","finalizedAt":"02/06/2026"},
    {"range":"01/04 – 30/04/2026","teachers":2,"sessions":22,"total":7000000,"status":"paid","finalizedAt":"01/05/2026"}
  ],
  "createPreview": { "sessions": 18, "teachers": 2 }
}
```

## 7. States

Switcher: `Ready · Loading · Empty · Error · Modal · Modal: no sessions · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Table skeleton |
| **Ready** | Four rows above |
| **Empty** | `Chưa có kỳ lương nào` + body + button `Tạo kỳ lương đầu tiên` |
| **Partial** | N/A |
| **Error** | Inline retry |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Title | `Kỳ lương` |
| Primary | `Tạo kỳ lương` |
| Columns | `Kỳ` · `Số giáo viên` · `Số buổi` · `Tổng chi` · `Trạng thái` · `Ngày chốt` |
| Pills | `Nháp` · `Đã chốt` · `Đã trả` |
| Modal fields | `Từ ngày` · `Đến ngày` |
| Preview | `Sẽ tổng hợp {n} buổi học đã duyệt của {m} giáo viên.` |
| Preview empty | `Không có buổi học đã duyệt trong khoảng này.` |
| Empty | `Chưa có kỳ lương nào` |
| Toast | `Đã tạo kỳ lương` |

## 9. Interactions

- Changing either date refetches the preview line
- Creating navigates straight to the new period's detail page
- Below 768px: table → card list with `Tổng chi` as the card's headline figure

## 10. Constraints — do NOT

- Do not assume calendar months — the range is user-chosen
- Do not put finalize or mark-paid actions on this page; they live on the detail page next to the numbers they act on
- Do not add a delete-period action

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
