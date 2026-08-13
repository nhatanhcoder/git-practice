---
page: Admin · Generate Invoices
route: /admin/invoices/generate
source_contract: ../pages/admin-pages/admin-invoice-generate.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · Generate Invoices

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

**This page:** a three-step wizard that issues one month of tuition invoices for every eligible
student in a single reviewed run. This is a long operation, so it is a full page, not a modal.

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

Header: breadcrumb `Trang chủ / Học phí / Tạo hóa đơn` on the left; `bell` icon + avatar menu on the right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Page structure — top to bottom

1. **Back link** — `Quay lại danh sách hóa đơn`
2. **Stepper** — 3 steps, horizontal: `1 Chọn kỳ` → `2 Xem trước` → `3 Xác nhận`
3. **Step body** — one card, contents change per step
4. **Footer bar** — sticky bottom of the card: `Quay lại` (ghost) + primary advance button

## 5. Component specs

### Stepper

Numbered circles 28px connected by a 2px line. Completed = `#2563EB` filled with `check`
icon; current = `#2563EB` outlined, bold label; upcoming = `#E2E8F0` with `#475569` label.

### Step 1 — Chọn kỳ

Month picker + a read-only eligibility summary line:
`8 học sinh có mức học phí đang áp dụng · 1 học sinh chưa thiết lập`.
If any student lacks a rate, show an inline info note linking to `/admin/tuition-rates`.

### Step 2 — Xem trước (the important screen)

Table with a leading checkbox column, all rows checked by default:

| Column | Content |
|---|---|
| ☑ | checkbox; header checkbox toggles all |
| Học sinh | avatar + nickname |
| Mức áp dụng | `2.500.000 ₫` |
| Hiệu lực từ | `01/03/2026` |
| Thành tiền | `2.500.000 ₫` |
| Ghi chú | `—`, or a warning pill `Đã có hóa đơn kỳ này` |

Rows already invoiced are **unchecked by default** and their row is 60% opacity —
visible, so the Admin can see they were considered and skipped, rather than silently absent.

### Step 3 — Xác nhận

A summary card, no table: `Số học sinh` `7`, `Tổng tiền` `17.500.000 ₫`, `Kỳ` `01/08 – 31/08/2026`.
Primary button `Chạy tạo hóa đơn`.

### Result panel

Replaces the step body after the run. Three grouped counts at top
(`Đã tạo 6` / `Bỏ qua 1` / `Lỗi 1`), then a per-student table with an outcome pill and,
for failures, the reason plus a `Thử lại` button on that row only.

## 6. Data — use these exact values

```json
{
  "period": "08/2026",
  "preview": [
    {"student":"Nguyễn Minh Anh","rate":2500000,"effectiveFrom":"01/03/2026","existing":false},
    {"student":"Lê Quang Dũng","rate":2500000,"effectiveFrom":"01/03/2026","existing":false},
    {"student":"Hoàng Văn Nam","rate":2500000,"effectiveFrom":"01/06/2026","existing":false},
    {"student":"Vũ Ngọc Bích","rate":2500000,"effectiveFrom":"01/03/2026","existing":false},
    {"student":"Đặng Thu Trang","rate":2500000,"effectiveFrom":"01/03/2026","existing":false},
    {"student":"Trần Bảo Long","rate":2500000,"effectiveFrom":"01/07/2026","existing":false},
    {"student":"Ngô Khánh Vy","rate":2500000,"effectiveFrom":"01/03/2026","existing":true}
  ],
  "result": {
    "created": ["Nguyễn Minh Anh","Lê Quang Dũng","Hoàng Văn Nam","Vũ Ngọc Bích","Đặng Thu Trang","Trần Bảo Long"],
    "skipped": [{"student":"Ngô Khánh Vy","reason":"Đã có hóa đơn kỳ này"}],
    "failed":  [{"student":"Mai Tuấn Kiệt","reason":"Không tìm thấy mức học phí đang áp dụng"}]
  }
}
```

## 7. States — render all, switchable

Switcher: `Step 1 · Step 2 · Step 3 · Running · Result: partial · Empty · Error · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Step 2 preview table skeleton |
| **Ready** | Steps 1–3 as specified |
| **Empty** | No student has an active tuition rate → `Chưa thiết lập học phí`, body line, button `Thiết lập học phí` linking to `/admin/tuition-rates`. The wizard cannot advance |
| **Partial** | **The primary state of this screen.** The Result panel with 6 created / 1 skipped / 1 failed. Per-row outcomes, retry only on the failed row. Never a single all-or-nothing toast |
| **Error** | The whole run failed → error banner **above the preserved step-3 summary**, so the Admin can retry without re-selecting anything |
| **Forbidden** / **Offline** | N/A |

`Running`: primary button shows a 16px spinner + `Đang tạo…`, disabled; the step body dims.

## 8. Copy — exact strings

| Location | String |
|---|---|
| Page title | `Tạo hóa đơn hàng loạt` |
| Steps | `Chọn kỳ` · `Xem trước` · `Xác nhận` |
| Advance buttons | `Tiếp tục` · `Chạy tạo hóa đơn` |
| Back | `Quay lại` |
| Eligibility | `{n} học sinh có mức học phí đang áp dụng · {m} học sinh chưa thiết lập` |
| Existing pill | `Đã có hóa đơn kỳ này` |
| Summary labels | `Số học sinh` · `Tổng tiền` · `Kỳ` |
| Running | `Đang tạo…` |
| Result counts | `Đã tạo` · `Bỏ qua` · `Lỗi` |
| Row retry | `Thử lại` |
| Empty | `Chưa thiết lập học phí` / `Cần có mức học phí đang áp dụng trước khi tạo hóa đơn.` |
| Done | `Xong` (returns to `/admin/invoices`) |

## 9. Interactions

- Header checkbox toggles all; step-3 totals recompute live from the checked rows
- `Tiếp tục` disabled when zero rows are checked
- Result panel: `Thử lại` on a failed row only re-runs that student
- Below 768px: stepper becomes `Bước 2/3` text; preview table becomes a card list with the checkbox top-right of each card

## 10. Constraints — do NOT

- Do not hide already-invoiced students — show them unchecked and dimmed
- Do not report the run as one toast; per-row outcomes are required
- Do not clear the selection on error
- Do not allow editing a rate here — this screen reads rates, it does not set them
- Do not add proration for mid-month joiners; out of scope by decision

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
