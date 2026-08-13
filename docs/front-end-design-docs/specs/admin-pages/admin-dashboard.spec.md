---
page: Admin · Dashboard
route: /admin
source_contract: ../pages/admin-pages/admin-dashboard.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · Dashboard

> **Paste this entire file into Claude Design, together with the `ui-ux-pro-max` skill.**
> Self-contained by design — every token, string, and number needed is below.
> Do not look for other files.

---

## 0. Build target

A single self-contained HTML file (inline CSS + JS, no build step). Desktop-first at
1440px, responsive to 375px. Static mockup, all data hardcoded from §6.
The chart is **inline SVG** — no charting library, no CDN.

---

## 1. Product context

**Product:** HSK Learning Platform — a Chinese-language teaching platform (HSK 1–9) with
three roles: Admin, Teacher, Student.

**This page:** the Admin's landing screen after login. Its only job is to answer
*"what needs my attention today?"* and send the Admin to the right screen. It is a
**hub, not a workspace** — nothing is approved or edited here.

**Audience and tone:** administrative and accounting staff handling tuition and teacher
payroll, often on a large monitor all day. Precise and trustworthy, high information
density, no decoration. Reference points: Linear, Stripe Dashboard.

**Explicitly rejected:** purple/gradient "AI dashboard" styling, dark+neon themes,
glassmorphism, large rounded corners, decorative illustrations, emoji as icons,
progress rings, gauge/speedometer widgets. Ruled out deliberately — do not reintroduce.

---

## 2. Design tokens — use these exact values

### Colour — interface

| Role | Hex | Use |
|---|---|---|
| Primary | `#0F172A` | Sidebar, headings, primary button |
| Primary hover | `#1E293B` | Primary hover |
| Accent | `#2563EB` | Links, active nav, focus ring |
| Background | `#F8FAFC` | Page background |
| Surface | `#FFFFFF` | Cards, chart surface |
| Border | `#E2E8F0` | Card borders, dividers |
| Text primary | `#0F172A` | Headings, KPI values |
| Text secondary | `#475569` | Labels, captions, axes |

### Colour — chart series (2 series, categorical)

| Series | Hex | Meaning |
|---|---|---|
| Thu học phí (revenue) | `#2563EB` | tuition collected |
| Chi lương (payroll) | `#EA580C` | teacher salary paid |

This pair was **validated, not chosen by eye**: adjacent-pair separation ΔE 31.3
(protanopia), 34.6 (tritanopia), 39.6 (normal vision) against a white surface — passes
lightness band, chroma floor, CVD separation, and 3:1 contrast. **Do not substitute
other hues.**

**Do not use the status colours below for chart series.** Green-for-revenue and
red-for-payroll is the obvious instinct and it is wrong here: those hues are reserved
for state, and reusing them makes a normal payroll month read as an error.

### Colour — status (reserved; not used on this page, listed so they are not borrowed)

`#16A34A` success · `#D97706` warning · `#DC2626` danger · `#0284C7` info · `#64748B` neutral

### Typography

```
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap');
```

- Headings and KPI values → **Lexend**
- Body, labels, axes, tables → **Source Sans 3**
- Must render Vietnamese diacritics correctly — all UI copy is Vietnamese
- All numbers use `font-variant-numeric: tabular-nums`

### Spacing, radius, elevation

| Token | Value |
|---|---|
| Base unit | `8px` (all spacing a multiple of 8) |
| Card padding | `20px` desktop, `16px` mobile |
| Radius | `8px` cards, `6px` buttons |
| Shadow | `shadow-sm`; `shadow-md` only on hoverable cards |
| Sidebar | `240px`, background `#0F172A` |
| Header | `56px`, sticky |
| Grid gap | `16px` between cards |

### Breakpoints

`375px` · `768px` (sidebar collapses) · `1024px` · `1440px` (content max-width caps)

### Icons

**Lucide only**, inline SVG, `stroke-width: 2`. Sizes `16px` inline, `20px` action, `24px` nav/KPI.
Needed: `layout-dashboard`, `users`, `receipt`, `wallet`, `activity`, `bell`, `chevron-right`, `arrow-up-right`, `arrow-down-right`, `inbox`, `alert-circle`, `table`.

---

## 3. Layout shell

```
┌──────────────┬────────────────────────────────────────────┐
│  Sidebar     │  Header 56px sticky                        │
│  240px       │  Trang chủ              [bell 2] [avatar ▾]│
│  #0F172A     ├────────────────────────────────────────────┤
│              │  Tổng quan                                 │
│  Logo        │  ┌──────┐┌──────┐┌──────┐┌──────┐          │
│  ─ Tổng quan◄│  │ KPI  ││ KPI  ││ KPI  ││ KPI  │          │
│  ─ Tài khoản │  └──────┘└──────┘└──────┘└──────┘          │
│  ─ Học phí   │  ┌───────────────┐┌───────────────┐        │
│  ─ Lương     │  │ Chờ duyệt     ││ Buổi chờ duyệt│        │
│  ─ Giám sát  │  └───────────────┘└───────────────┘        │
│              │  ┌──────────────────────────────────────┐  │
│              │  │ Thu & chi 6 tháng gần nhất (chart)   │  │
│              │  └──────────────────────────────────────┘  │
└──────────────┴────────────────────────────────────────────┘
```

Sidebar nav (active = **Tổng quan**): `Tổng quan` · `Tài khoản` · `Học phí` · `Lương` · `Giám sát`

---

## 4. Page structure — top to bottom

1. **Title row** — `h1` "Tổng quan" (Lexend 600, 24px) + secondary text `Cập nhật lúc 09:31, 11/08/2026`
2. **KPI row** — 4 tiles, equal width, one row at ≥1024px → 2×2 at 768px → stacked at 375px
3. **Action queue** — two cards side by side, equal width; stack below 1024px
4. **Revenue vs payroll chart** — full width card

**Every KPI tile and every queue row is a link.** This page has no destructive actions,
no forms, no modals. If you find yourself designing an Approve button here, stop —
approving happens on `/admin/users`.

---

## 5. Component specs

### KPI tile

- Card: surface `#FFFFFF`, border `1px #E2E8F0`, radius `8px`, padding `20px`
- Label: 12px, `#475569`, uppercase, letter-spacing `0.05em`, above the value
- Value: **Lexend 600, 30px**, `#0F172A`, tabular-nums
- Delta (tiles 3 & 4 only): 13px, `arrow-up-right` / `arrow-down-right` at 16px + `so với tháng trước`
- Icon: 24px Lucide, `#475569`, top-right corner
- Whole tile is clickable: `cursor: pointer`, hover → `shadow-md` + border `#2563EB`

The four tiles:

| # | Label | Value | Icon | Links to |
|---|---|---|---|---|
| 1 | CHỜ DUYỆT | `2` | `users` | `/admin/users?status=pending` |
| 2 | BUỔI CHỜ DUYỆT | `5` | `activity` | `/admin/payroll/sessions` |
| 3 | THU THÁNG NÀY | `12.500.000 ₫` | `receipt` | `/admin/invoices` |
| 4 | CHI LƯƠNG THÁNG NÀY | `7.250.000 ₫` | `wallet` | `/admin/payroll` |

Tiles 1 and 2 are **counts of work**, not money. Do not colour them with status hues,
and do not add a delta — "2 pending, down from 5" is meaningless.

### Action queue card

Two cards: `Tài khoản chờ duyệt` and `Buổi học chờ duyệt`.

- Card header: title (Lexend 600, 16px) + count pill + `Xem tất cả` link with `chevron-right`
- Rows: max 5, height 48px, divider `1px #E2E8F0` between
- Account row: 28px avatar circle + `nickname` / `email` two-line + relative time right-aligned
- Session row: teacher name / class name two-line + session date right-aligned
- Row hover: background `#F8FAFC`, `cursor: pointer`

### Chart — Thu & chi 6 tháng gần nhất

**Form:** multi-line chart. Two series, trend over time, both measured in VND.

Hard rules:

- **ONE y-axis.** Both series are VND on the same scale. A second y-axis is forbidden — it lets any two lines be made to cross wherever the author wants
- Lines: 2px stroke, no shadow, no gradient fill. Markers 8px, drawn only on hover and on the final point of each series
- Legend **always present** (2 series), top-right of the card, 12px, swatch + label
- **Also direct-label** both series at their final point, in text ink `#0F172A`, not the series colour
- Y-axis: 4–5 ticks, labels abbreviated (`20tr`, `15tr`, `10tr`, `5tr`, `0`), `#475569` 12px
- X-axis: month labels `T3 T4 T5 T6 T7 T8`, `#475569` 12px
- Gridlines: horizontal only, `1px #E2E8F0`. No vertical gridlines, no chart border
- **Hover:** vertical crosshair line + a tooltip showing the month and both series values, full precision with `₫`. Not one tooltip per line — one shared tooltip per month
- **`Xem dạng bảng` toggle** in the card header switches the chart for a plain data table of the same numbers. Required for accessibility — information must never be colour-only

**The current month is incomplete.** 11 August is 11 days into the month, so the final
point is not comparable to the five before it. Render the last segment of both lines
**dashed**, and add the note `T8 chưa hết tháng` under the chart. Without this, the
dashboard shows a dramatic revenue collapse every single month.

---

## 6. Data — use these exact values

```json
{
  "kpi": { "pendingUsers": 2, "pendingSessions": 5,
           "revenueThisMonth": 12500000, "revenueDeltaPct": -28.6,
           "payrollThisMonth": 7250000, "payrollDeltaPct": -3.3 },

  "chart": [
    { "month": "T3", "revenue": 15000000, "payroll": 6500000 },
    { "month": "T4", "revenue": 17500000, "payroll": 7000000 },
    { "month": "T5", "revenue": 20000000, "payroll": 8250000 },
    { "month": "T6", "revenue": 20000000, "payroll": 8750000 },
    { "month": "T7", "revenue": 17500000, "payroll": 7500000 },
    { "month": "T8", "revenue": 12500000, "payroll": 7250000, "partial": true }
  ],

  "pendingUsers": [
    { "nickname": "Nguyễn Minh Anh", "email": "minhanh@example.com", "role": "student", "since": "2 ngày trước" },
    { "nickname": "Trần Thu Hà", "email": "thuha.teacher@example.com", "role": "teacher", "since": "3 ngày trước" }
  ],

  "pendingSessions": [
    { "teacher": "Phạm Thị Lan", "class": "HSK 2 — Nhóm A", "date": "08/08/2026" },
    { "teacher": "Phạm Thị Lan", "class": "HSK 2 — Nhóm A", "date": "06/08/2026" },
    { "teacher": "Đỗ Hải Yến",  "class": "HSK 3 — Nhóm B", "date": "06/08/2026" },
    { "teacher": "Đỗ Hải Yến",  "class": "HSK 1 — Nhóm C", "date": "05/08/2026" },
    { "teacher": "Phạm Thị Lan", "class": "HSK 2 — Nhóm A", "date": "01/08/2026" }
  ]
}
```

Currency format: Vietnamese — `.` as thousands separator, `₫` suffix. `12500000` → `12.500.000 ₫`.

---

## 7. States — render all, switchable

Include a **state switcher** fixed top-right, clearly marked as a review aid and not part
of the design (monospace, muted, thin border):
`Ready · Loading · Empty · Partial · Error · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Every region skeletons **independently** — 4 KPI skeletons, 2 queue skeletons, 1 chart skeleton. Never one full-page spinner |
| **Ready** | The default, data from §6 |
| **Empty** | Nothing pending: KPI tiles 1 & 2 show `0`; **both queue cards** show `inbox` icon at 15% opacity + `Không có việc cần xử lý`. This is a *success* state — make it read calm, not broken. The chart still renders |
| **Partial** | **First-class here.** KPI tiles and queues resolved, chart still skeleton — the chart is the slow query. The page must be usable in this state |
| **Error** | **Per region, never whole-page.** Show the chart card with an inline `alert-circle` + `Không tải được biểu đồ.` + `Thử lại`, while KPI tiles and queues render normally above it |
| **Forbidden** | N/A — the route guard redirects before render |
| **Offline** | N/A — no offline support |

---

## 8. Copy — exact strings, Vietnamese

| Location | String |
|---|---|
| Page title | `Tổng quan` |
| Subtitle | `Cập nhật lúc 09:31, 11/08/2026` |
| KPI labels | `CHỜ DUYỆT` · `BUỔI CHỜ DUYỆT` · `THU THÁNG NÀY` · `CHI LƯƠNG THÁNG NÀY` |
| Delta suffix | `so với tháng trước` |
| Queue titles | `Tài khoản chờ duyệt` · `Buổi học chờ duyệt` |
| Queue link | `Xem tất cả` |
| Queue empty | `Không có việc cần xử lý` |
| Chart title | `Thu & chi 6 tháng gần nhất` |
| Chart series | `Thu học phí` · `Chi lương` |
| Chart partial note | `T8 chưa hết tháng` |
| Table toggle | `Xem dạng bảng` / `Xem biểu đồ` |
| Chart error | `Không tải được biểu đồ.` |
| Retry | `Thử lại` |

---

## 9. Interactions

- KPI tile click → its route (mockup: no-op, but hover + `cursor: pointer` required)
- Queue row click → that item's screen
- Chart hover → crosshair + shared tooltip; leaving the plot clears it
- `Xem dạng bảng` → swaps chart for table in place, same card, button label flips
- Transitions 150–300ms; honour `prefers-reduced-motion`
- Visible focus ring (`#2563EB`, 2px, 2px offset) on every interactive element, including
  KPI tiles and chart legend items — Admins navigate this screen by keyboard
- Below 1024px: KPI 4→2 columns, queues stack. Below 768px: KPI single column, sidebar
  becomes a hamburger drawer, chart keeps full width and shrinks height to 200px

---

## 10. Constraints — do NOT

- Do not add a second y-axis to the chart, under any circumstance
- Do not use `#16A34A` / `#DC2626` for the revenue and payroll series
- Do not fill the lines with gradients, or add glow/shadow to marks
- Do not put a number label on every data point — final-point direct labels only
- Do not use a donut, gauge, speedometer, or progress ring anywhere on this page
- Do not add vertical gridlines or a border around the plot area
- Do not use emoji as icons (Lucide inline SVG only)
- Do not use `localStorage` / `sessionStorage`; hold state in JS variables
- Do not add approve/reject/edit actions — this page only navigates
- Do not render the incomplete current month as a solid line
- Do not render Ready only — Empty, Partial and Error are required deliverables

---

## 11. Instructions for `ui-ux-pro-max`

Use it for **dashboard layout and information hierarchy**: KPI-row rhythm, the balance
between the queue cards and the chart, card density, and empty-state craft on a
data-dense B2B admin screen.

**Do not run its design-system generator, and do not take its palette or font pairing.**
This project has a locked design system, reproduced in §2. Where any suggestion conflicts
with §2, §5, or §10 — including the validated chart pair — **§2/§5/§10 win**. Keep only
structure and anti-pattern advice.

---

## 12. Deliverable

One `.html` file:

- All CSS in one `<style>` block, all JS in one `<script>` block
- Google Fonts via `@import`; Lucide icons inline SVG; chart as hand-written inline SVG; no other network requests
- The §7 state switcher wired and working
- Renders correctly at 1440px, 1024px, 768px, 375px
- Text contrast ≥ 4.5:1; chart series ≥ 3:1 against white (the §2 values already satisfy both — do not deviate)
