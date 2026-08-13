---
page: Admin · System Monitoring
route: /admin/monitoring
source_contract: ../pages/admin-pages/admin-monitoring.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · System Monitoring

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

**This page:** Gemini API consumption, so AI grading does not silently fail on an exhausted quota.
Read-only. **This screen has no backend yet** — the mockup exists to reserve the layout.

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
Sidebar nav, active item = **Giám sát**:
`Tổng quan` · `Tài khoản` · `Học phí` · `Lương` · `Giám sát`

Header: breadcrumb `Trang chủ / Giám sát` on the left; `bell` icon + avatar menu on the right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Page structure

1. **Title row** — `h1` `Giám sát hệ thống` + range selector (`Ngày` / `Tuần` / `Tháng`)
2. **Alert banner** — only when quota is below threshold
3. **KPI row** — 3 tiles
4. **Usage chart** — calls over time
5. **Breakdown table** — by feature

## 5. Component specs

### Alert banner

Full width, above the KPI row. Background `#DC2626` @ 8%, left border `3px #DC2626`,
`alert-circle` 20px, bold headline + one body line. Not dismissible.

### KPI tiles (3)

| # | Label | Value | Extra |
|---|---|---|---|
| 1 | TỔNG LƯỢT GỌI | `1.284` | `trong 7 ngày` sub-label |
| 2 | QUOTA CÒN LẠI | `18%` | a **meter** below: 6px track `#E2E8F0`, fill `#DC2626` when < 20%, `#D97706` when < 50%, else `#2563EB` |
| 3 | CACHE HIT RATIO | `62%` | meter, fill always `#2563EB` — higher is better, no threshold colouring |

Tile 2's fill is the one place on this screen where status colour is correct: it encodes
a threshold, not a category.

### Usage chart

Single-series line, calls per day over the selected range.

- Line `#2563EB`, 2px, no fill, no gradient
- **One y-axis.** 4 ticks, `#475569` 12px
- Horizontal gridlines only, `1px #E2E8F0`. No vertical gridlines, no plot border
- Markers 8px on hover only; crosshair + tooltip showing date and call count
- **No legend** — a single series is named by the card title
- `Xem dạng bảng` toggle in the card header, same as the dashboard chart

### Breakdown table

| Column | Content | Align |
|---|---|---|
| Tính năng | `Chấm điểm AI (Writing)` | left |
| Lượt gọi | `1.284` | right |
| Từ cache | `796` | right |
| Gọi API thật | `488` | right |

## 6. Data — use these exact values

```json
{
  "range": "7 ngày",
  "kpi": { "totalCalls": 1284, "quotaRemainingPct": 18, "cacheHitPct": 62 },
  "series": [
    {"date":"05/08","calls":142},{"date":"06/08","calls":198},{"date":"07/08","calls":165},
    {"date":"08/08","calls":221},{"date":"09/08","calls":94},{"date":"10/08","calls":178},
    {"date":"11/08","calls":286}
  ],
  "breakdown": [ {"feature":"Chấm điểm AI (Writing)","calls":1284,"cached":796,"live":488} ]
}
```

Quota at 18% deliberately triggers the alert banner, so that state is visible by default.

## 7. States

Switcher: `Empty (default) · Ready · Ready: quota alert · Loading · Partial · Error · Mobile`

| State | Appearance |
|---|---|
| **Empty** | **The expected state today, and the default the mockup should open in.** Centred `activity` icon 15% opacity, `Chưa có dữ liệu`, body `Tính năng chấm điểm AI chưa hoạt động. Số liệu sẽ xuất hiện sau khi có lượt chấm đầu tiên.` **Do not render zeroes** — `0 lượt gọi, 0% quota` reads as a broken integration rather than an unused feature |
| **Loading** | KPI + chart skeleton |
| **Ready** | Data above, without the alert |
| **Ready: quota alert** | Same plus the red banner |
| **Partial** | KPI resolved, chart still skeleton |
| **Error** | Inline retry in the chart card; KPI tiles stay |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Title | `Giám sát hệ thống` |
| Range | `Ngày` · `Tuần` · `Tháng` |
| KPI labels | `TỔNG LƯỢT GỌI` · `QUOTA CÒN LẠI` · `CACHE HIT RATIO` |
| Chart title | `Lượt gọi Gemini API` |
| Alert headline | `Quota Gemini sắp hết` |
| Alert body | `Còn 18% quota trong kỳ. Chấm điểm AI có thể ngừng hoạt động.` |
| Breakdown columns | `Tính năng` · `Lượt gọi` · `Từ cache` · `Gọi API thật` |
| Empty | `Chưa có dữ liệu` |
| Table toggle | `Xem dạng bảng` / `Xem biểu đồ` |

## 9. Interactions

- Range selector → refetch; in the mockup it just reflows the same series
- Chart hover → crosshair + tooltip
- Below 768px: KPI 3→1 column, chart height 200px

## 10. Constraints — do NOT

- Do not render zeroes for the empty state
- Do not use a gauge, speedometer or donut for quota — flat meter only
- Do not add a second y-axis, or a second series
- Do not add any action that changes quota — this screen is read-only
- Do not hardcode a threshold number as if it were decided; 20% is a placeholder

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
