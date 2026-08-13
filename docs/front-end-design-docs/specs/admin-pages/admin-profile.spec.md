---
page: Admin · My Profile
route: /admin/profile
source_contract: ../pages/admin-pages/admin-profile.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · My Profile

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

**This page:** the Admin's own account: name, email, avatar, and password. This screen edits the
signed-in user only — it is not a tool for editing anyone else.

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
Sidebar nav, active item = **Tổng quan**:
`Tổng quan` · `Tài khoản` · `Học phí` · `Lương` · `Giám sát`

Header: breadcrumb `Trang chủ / Hồ sơ` on the left; `bell` icon + avatar menu on the right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Page structure

1. **Title row** — `h1` `Hồ sơ của tôi`
2. **Profile card** — avatar + name + email, own submit button
3. **Password card** — three fields, own submit button

Two cards, **two independent submits**. Never one `Lưu` covering both — changing a
password must not be a side effect of correcting a typo in a name.

Max content width `640px` — this is a form page, not a data page; a full-width form at
1440px is unreadable.

## 5. Component specs

### Profile card

- Avatar block: 80px circle, `Đổi ảnh` text button beneath, `Xóa ảnh` if one is set
- `Tên hiển thị` — text, required
- `Email` — email, required, helper text `Dùng để đăng nhập.`
- Footer: `Lưu thay đổi` (primary), disabled until a field is dirty

### Password card

- `Mật khẩu hiện tại` — password, required
- `Mật khẩu mới` — password, required, with a strength meter beneath: 4px track, segments filling `#DC2626` → `#D97706` → `#16A34A`
- `Xác nhận mật khẩu mới` — password, required
- Helper under `Mật khẩu mới`: `Ít nhất 8 ký tự, có chữ hoa và số.`
- Footer: `Đổi mật khẩu` (primary), disabled until all three are filled

### Field-level errors

Errors map from the API's `VALIDATION_ERROR.details` object, keyed by field name. Render
beneath the field: 13px `#DC2626`, plus a `#DC2626` border on the input. Do **not** show
a toast for validation failures — the error belongs next to the field that caused it.

## 6. Data — use these exact values

```json
{
  "profile": { "nickname":"Bùi Anh Tuấn","email":"tuanbui@example.com","avatarUrl":null,
               "role":"admin","createdAt":"05/11/2025" },
  "validationErrorExample": {
    "email": ["Email đã được sử dụng"],
    "password": ["Mật khẩu phải có ít nhất 8 ký tự","Phải có chữ hoa và số"]
  }
}
```

Avatar is null — the mockup must show the initials-fallback avatar (`BT`, `#0F172A`
background, white Lexend 600 text), which is the common case.

## 7. States

Switcher: `Ready · Loading · Saving · Validation error · Error · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Both cards skeleton |
| **Ready** | Data above |
| **Saving** | The submitted card's button shows a 16px spinner + `Đang lưu…`, its fields disabled. **The other card stays fully interactive** |
| **Validation error** | Both example errors rendered inline, on email and on the new-password field |
| **Empty** | N/A — a signed-in user always has a profile |
| **Partial** | N/A |
| **Error** | Card-level banner above the failing card's fields |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Title | `Hồ sơ của tôi` |
| Card titles | `Thông tin cá nhân` · `Đổi mật khẩu` |
| Fields | `Tên hiển thị` · `Email` · `Mật khẩu hiện tại` · `Mật khẩu mới` · `Xác nhận mật khẩu mới` |
| Email helper | `Dùng để đăng nhập.` |
| Password helper | `Ít nhất 8 ký tự, có chữ hoa và số.` |
| Avatar actions | `Đổi ảnh` · `Xóa ảnh` |
| Submits | `Lưu thay đổi` · `Đổi mật khẩu` |
| Saving | `Đang lưu…` |
| Toasts | `Đã lưu hồ sơ` · `Đã đổi mật khẩu` |

## 9. Interactions

- Avatar upload shows an optimistic preview; on failure it reverts and shows an inline error
- Password strength meter updates on keystroke
- Submitting one card never disables the other
- Below 768px: cards full width, avatar block centres above the fields

## 10. Constraints — do NOT

- Do not merge the two forms behind one save button
- Do not allow changing own role or account status
- Do not show validation failures as toasts
- Do not add session/device management — out of scope

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
