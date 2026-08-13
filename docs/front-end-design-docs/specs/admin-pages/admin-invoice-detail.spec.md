---
page: Admin · Invoice Detail
route: /admin/invoices/[invoiceId]
source_contract: ../pages/admin-pages/admin-invoice-detail.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · Invoice Detail

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

**This page:** one invoice — what is owed, every payment recorded against it, and the two actions
that change it: record a payment, or void it.

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

Header: breadcrumb `Trang chủ / Học phí / Hóa đơn #INV-2608-004` on the left; `bell` icon + avatar menu on the right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Page structure — top to bottom

1. **Back link** — `Quay lại danh sách hóa đơn`
2. **Header card** — student, period, status pill, and the three money figures
3. **Action bar** — `Ghi nhận thanh toán` (primary) + `Hủy hóa đơn` (danger ghost)
4. **Payment history table**

## 5. Component specs

### Header card

Left: student avatar 48px + `nickname` (Lexend 600, 20px) + period `01/08 – 31/08/2026`.
Right: three stacked figures, right-aligned, tabular-nums:

| Label | Style |
|---|---|
| `Tổng phải nộp` | 14px `#475569` label, 20px `#0F172A` value |
| `Đã nộp` | same |
| `Còn nợ` | **28px Lexend 600**, `#0F172A` — the headline number |

Status pill sits next to the student name.

### Action bar

`Hủy hóa đơn` is hidden (not merely disabled) when status is `paid` or `void` — a paid
invoice is not voidable through this screen.

### Payment history table

| Column | Content | Align |
|---|---|---|
| Ngày | `05/08/2026` | left |
| Số tiền | `1.000.000 ₫` | right |
| Phương thức | `Chuyển khoản` / `Tiền mặt` / `MoMo` | left |
| Mã giao dịch | monospace, or `—` | left |

Newest first. Row 40px. No row actions — payments are append-only records.

### Modals

**Ghi nhận thanh toán** — `max-width: 480px`:
- `Số tiền` (required, numeric, prefilled with the outstanding balance)
- `Phương thức` (select: Chuyển khoản / Tiền mặt / MoMo)
- `Mã giao dịch` (optional text)
- Buttons `Hủy` / `Ghi nhận thanh toán`

**Hủy hóa đơn** — required `Lý do hủy` textarea, submit disabled while empty,
danger primary `Hủy hóa đơn`.

## 6. Data — use these exact values

```json
{
  "invoice": { "code":"INV-2608-004","student":"Trần Bảo Long",
               "periodStart":"01/08/2026","periodEnd":"31/08/2026",
               "total":2500000,"paid":1000000,"outstanding":1500000,
               "status":"partially_paid" },
  "payments": [
    {"date":"05/08/2026","amount":1000000,"method":"Chuyển khoản","ref":"FT2608051234"}
  ]
}
```

## 7. States — render all, switchable

Switcher: `Ready · Loading · Empty payments · Error 404 · Modal: thanh toán · Modal: hủy · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Header + table skeleton |
| **Ready** | Data above |
| **Empty** | No payments yet → inside the table: `inbox` 15% + `Chưa có thanh toán nào` |
| **Partial** | N/A — single query, payments are embedded |
| **Error 404** | Full-page not-found + `Quay lại danh sách hóa đơn` |
| **Forbidden** / **Offline** | N/A |

## 8. Copy — exact strings

| Location | String |
|---|---|
| Back | `Quay lại danh sách hóa đơn` |
| Money labels | `Tổng phải nộp` · `Đã nộp` · `Còn nợ` |
| Actions | `Ghi nhận thanh toán` · `Hủy hóa đơn` |
| Columns | `Ngày` · `Số tiền` · `Phương thức` · `Mã giao dịch` |
| Empty | `Chưa có thanh toán nào` |
| Payment modal fields | `Số tiền` · `Phương thức` · `Mã giao dịch` |
| Void reason | `Lý do hủy` |
| Toasts | `Đã ghi nhận thanh toán` · `Đã hủy hóa đơn` |
| 404 | `Không tìm thấy hóa đơn này.` |

## 9. Interactions

- Recording a payment closes the modal, prepends the row, updates all three figures and the status pill
- Status is **server-computed**: the mockup should hardcode the resulting status, not derive `paid` from `paid >= total` in JS. Show `Đã nộp` after a full payment
- Below 768px: header figures stack full width; history becomes a card list

## 10. Constraints — do NOT

- Do not derive the status client-side from the amounts
- Do not allow editing or deleting a recorded payment
- Do not allow editing `totalAmount` — void and reissue instead
- Do not show `Hủy hóa đơn` on a paid or already-void invoice
- Do not add VietQR generation here — that is a student-side screen

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
