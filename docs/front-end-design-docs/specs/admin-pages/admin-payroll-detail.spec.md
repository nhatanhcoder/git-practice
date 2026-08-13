---
page: Admin · Payroll Period Detail
route: /admin/payroll/[periodId]
source_contract: ../pages/admin-pages/admin-payroll-detail.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · Payroll Period Detail

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

**This page:** one pay period, line by line: which sessions were counted, at what rate, for how much —
then the two one-way actions that close it out, finalize and mark-paid.

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

Header: breadcrumb `Trang chủ / Lương / 01/07 – 31/07/2026` on the left; `bell` icon + avatar menu on the right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Page structure

1. **Back link** — `Quay lại danh sách kỳ lương`
2. **Header card** — period range, status pill, grand total, action bar
3. **Per-teacher summary** — one card per teacher, expandable
4. **Breakdown table** — inside each expanded teacher card

## 5. Component specs

### Header card

Left: `01/07 – 31/07/2026` (Lexend 600, 22px) + status pill + `Tạo lúc 01/08/2026`.
Right: `TỔNG CHI` label, **36px Lexend 600** value — the headline figure of the page.
Action bar sits below, right-aligned.

### Action bar — one-way actions

| Status | Buttons shown |
|---|---|
| `draft` | `Chốt kỳ lương` (primary) |
| `finalized` | `Đánh dấu đã trả` (primary) |
| `paid` | none — show text `Đã trả lương ngày 03/08/2026` |

`Chốt kỳ lương` is **hidden, not disabled**, once status is `finalized` or `paid`.
A disabled button invites the question "why can't I?"; an absent one does not.

### Confirm modals — must state irreversibility in words

**Chốt kỳ lương** — body:
`Kỳ lương sẽ được chốt ở mức 7.500.000 ₫ và không thể chỉnh sửa sau đó.`
Buttons `Hủy` / `Chốt kỳ lương`.

**Đánh dấu đã trả** — body:
`Xác nhận đã thanh toán 7.500.000 ₫ cho 2 giáo viên. Các buổi học trong kỳ sẽ chuyển sang trạng thái đã trả.`
Buttons `Hủy` / `Đánh dấu đã trả`.

Never a bare `Xác nhận?` — the button names the action and the body names the consequence.

### Per-teacher summary card

Collapsed row: avatar + name · rate applied (`250.000 ₫/buổi`) · `12 buổi` · subtotal
(right, Lexend 600, 18px) · `chevron-down`.
Expanded: the breakdown table below, inside the same card.

### Breakdown table

| Column | Content | Align |
|---|---|---|
| Ngày | `05/07/2026` | left |
| Lớp | class name | left |
| Thời lượng | `90 phút`, or `—` when the rate is per-session | right |
| Thành tiền | `250.000 ₫` | right |

For a `per_session` teacher the `Thời lượng` column shows `—`: duration does not affect
pay, and showing minutes there implies it does.
For a `per_hour` teacher show both raw and billed: `75 phút → 1,5 giờ`.

## 6. Data — use these exact values

```json
{
  "period": {"range":"01/07 – 31/07/2026","status":"draft","createdAt":"01/08/2026","total":7500000},
  "teachers": [
    {"name":"Phạm Thị Lan","rateType":"per_session","rate":250000,"sessions":12,"subtotal":3000000,
     "breakdown":[
       {"date":"05/07/2026","class":"HSK 2 — Nhóm A","duration":null,"amount":250000},
       {"date":"08/07/2026","class":"HSK 2 — Nhóm A","duration":null,"amount":250000},
       {"date":"12/07/2026","class":"HSK 2 — Nhóm A","duration":null,"amount":250000}
     ]},
    {"name":"Đỗ Hải Yến","rateType":"per_hour","rate":300000,"sessions":15,"subtotal":4500000,
     "breakdown":[
       {"date":"06/07/2026","class":"HSK 3 — Nhóm B","duration":"75 phút → 1,5 giờ","amount":450000},
       {"date":"09/07/2026","class":"HSK 3 — Nhóm B","duration":"90 phút → 1,5 giờ","amount":450000},
       {"date":"13/07/2026","class":"HSK 1 — Nhóm C","duration":"60 phút → 1,0 giờ","amount":300000}
     ]}
  ]
}
```

Note the second teacher: 75 minutes and 90 minutes both bill 1.5 hours. That rounding is
the model working as specified — show it plainly rather than hiding it.

## 7. States

Switcher: `Ready: draft · Ready: finalized · Ready: paid · Loading · Empty · Error 404 · Modal: chốt · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Header + teacher cards skeleton |
| **Ready** | Three status variants — the action bar differs in each |
| **Empty** | A draft with zero approved sessions → `Không có buổi học được duyệt trong kỳ này`, and **`Chốt kỳ lương` must be disabled** with helper text `Không thể chốt kỳ lương rỗng.` This is the one place a disabled button is right, because the fix is elsewhere |
| **Partial** | Header total resolved, teacher cards still skeleton |
| **Error 404** | Full-page not-found + back link |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Back | `Quay lại danh sách kỳ lương` |
| Total label | `TỔNG CHI` |
| Actions | `Chốt kỳ lương` · `Đánh dấu đã trả` |
| Paid text | `Đã trả lương ngày {date}` |
| Finalize body | `Kỳ lương sẽ được chốt ở mức {total} và không thể chỉnh sửa sau đó.` |
| Pay body | `Xác nhận đã thanh toán {total} cho {n} giáo viên. Các buổi học trong kỳ sẽ chuyển sang trạng thái đã trả.` |
| Breakdown columns | `Ngày` · `Lớp` · `Thời lượng` · `Thành tiền` |
| Empty | `Không có buổi học được duyệt trong kỳ này` / `Không thể chốt kỳ lương rỗng.` |
| Toasts | `Đã chốt kỳ lương` · `Đã đánh dấu đã trả lương` |

## 9. Interactions

- Teacher card expand/collapse, 200ms height transition, all collapsed by default
- Confirming an action updates the status pill and swaps the action bar in place — no navigation
- Below 768px: header figures stack; breakdown tables become card lists

## 10. Constraints — do NOT

- Do not allow editing any amount, rate or session on this page
- Do not show `Chốt kỳ lương` once the period is finalized or paid — hide it
- Do not use a bare `Xác nhận?` in either modal
- Do not show minutes in `Thời lượng` for a per-session teacher
- Do not add an "unfinalize" or "revert to draft" action

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
