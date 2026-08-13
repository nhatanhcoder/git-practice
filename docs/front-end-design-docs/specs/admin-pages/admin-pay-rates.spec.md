---
page: Admin · Teacher Pay Rates
route: /admin/pay-rates
source_contract: ../pages/admin-pages/admin-pay-rates.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · Teacher Pay Rates

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

**This page:** each teacher's pay rate — per session or per hour — and the history of past rates.
Append-only, like tuition rates: finalized payroll periods depend on the rate that applied then.

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

Header: breadcrumb `Trang chủ / Lương / Mức lương` on the left; `bell` icon + avatar menu on the right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Page structure

1. **Title row** — `h1` `Mức lương giáo viên` + primary button `Thiết lập mức lương`
2. **Info banner** — append-only note (same treatment as tuition rates)
3. **Rate table**
4. **History drawer** — right-side, on row click

## 5. Component specs

### Rate table

| Column | Content | Align |
|---|---|---|
| Giáo viên | avatar 28px + nickname | left |
| Hình thức | pill: `Theo buổi` (`#0284C7` @15%) or `Theo giờ` (`#64748B` @15%) | left |
| Đơn giá | `250.000 ₫/buổi` or `300.000 ₫/giờ` | right |
| Hiệu lực từ | `01/03/2026` | left |
| (actions) | `more-horizontal` → `Đổi mức`, `Xem lịch sử` | right |

`Hình thức` is a **neutral/info** pill, not a status pill — it describes a kind, not a state.

### Set-rate modal — the important one

`max-width: 520px`. Fields: `Giáo viên` (select), `Hình thức` (radio: Theo buổi / Theo giờ),
`Đơn giá (VND)` (numeric), `Hiệu lực từ` (date). Buttons `Hủy` / `Lưu mức mới`.

**When `Theo giờ` is selected**, reveal a warning note directly beneath the radio —
background `#D97706` @ 8%, left border `3px #D97706`:
`Thời lượng được làm tròn lên 0,5 giờ. Buổi 50 phút được tính 1 giờ.`

This must be visible **at the moment of choosing**, not in a tooltip and not after saving.
It is the single most surprising rule in the payroll model.

### History drawer

Same as tuition rates: timeline, newest first, each entry showing rate type, amount,
`Hiệu lực từ`, who set it and when, with `Đang áp dụng` on the current one.

## 6. Data — use these exact values

```json
{
  "rates": [
    {"teacher":"Phạm Thị Lan","rateType":"per_session","amount":250000,"effectiveFrom":"01/03/2026"},
    {"teacher":"Đỗ Hải Yến","rateType":"per_hour","amount":300000,"effectiveFrom":"01/06/2026"},
    {"teacher":"Nguyễn Hữu Phước","rateType":null,"amount":null,"effectiveFrom":null}
  ],
  "history": {
    "Phạm Thị Lan": [
      {"rateType":"per_session","amount":250000,"effectiveFrom":"01/03/2026","setAt":"27/02/2026","current":true},
      {"rateType":"per_session","amount":220000,"effectiveFrom":"01/11/2025","setAt":"29/10/2025","current":false}
    ]
  }
}
```

Both rate types plus one unset teacher — the unset row is what the payroll screen links here for.

## 7. States

Switcher: `Ready · Loading · Empty · Error · Drawer · Modal: theo giờ · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Table skeleton |
| **Ready** | Data above |
| **Empty** | `Chưa thiết lập mức lương cho giáo viên nào` + button |
| **Partial** | N/A |
| **Error** | Inline retry |
| **Forbidden** / **Offline** | N/A |

`Modal: theo giờ` must show the rounding warning — it is a required deliverable state.

## 8. Copy

| Location | String |
|---|---|
| Title | `Mức lương giáo viên` |
| Primary | `Thiết lập mức lương` |
| Columns | `Giáo viên` · `Hình thức` · `Đơn giá` · `Hiệu lực từ` |
| Rate types | `Theo buổi` · `Theo giờ` |
| Unit suffix | `₫/buổi` · `₫/giờ` |
| Rounding warning | `Thời lượng được làm tròn lên 0,5 giờ. Buổi 50 phút được tính 1 giờ.` |
| No rate | `Chưa thiết lập` |
| Modal submit | `Lưu mức mới` |
| Toast | `Đã lưu mức lương mới` |

## 9. Interactions

- Selecting `Theo giờ` reveals the rounding warning with a 150ms height transition
- Unit suffix in `Đơn giá` flips between `₫/buổi` and `₫/giờ` with the radio
- Below 768px: table → card list, drawer → full-screen sheet

## 10. Constraints — do NOT

- Do not present this as "edit the rate" — rates are append-only history
- Do not add a delete action; past invoices/payroll depend on old rates
- Do not hide superseded rates — the history is the point of the screen
- Do not put the rounding rule in a tooltip or `title` attribute
- Do not use status colours for the `Hình thức` pill

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
