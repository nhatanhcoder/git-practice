---
page: Admin · Accounts
route: /admin/users
source_contract: ../pages/admin-pages/admin-users-list.md
status: ready-for-design
last_updated: 2026-08-11
---

# Design Spec — Admin · Accounts

> **Paste this entire file into Claude Design, together with the `ui-ux-pro-max` skill.**
> It is deliberately self-contained: every token, string, and data shape needed is below.
> Do not look for other files — there are none to find in that context.

---

## 0. Build target

A single self-contained HTML file (inline CSS + JS, no build step, no external assets
except Google Fonts and inline SVG icons). Desktop-first at 1440px, responsive down to
375px. Static mockup — no backend. All data hardcoded from §6.

---

## 1. Product context

**Product:** HSK Learning Platform — a Chinese-language teaching platform (HSK levels 1–9)
used by an Admin, Teachers, and Students.

**This page:** the Admin's account-governance screen. The Admin finds any account and
moves it between three states: `pending` → `active` → `suspended`.

**Audience and tone:** this is an internal management tool used by administrative and
accounting staff who handle tuition and teacher payroll. It must read as *precise and
trustworthy*, not playful. High information density is wanted; visual flourish is not.
The visual reference points are Linear and Stripe Dashboard.

**Explicitly rejected directions:** purple/gradient "AI dashboard" styling, dark+neon
themes, glassmorphism, oversized rounded corners, decorative illustrations, emoji as UI
icons. These have been ruled out deliberately — do not reintroduce them.

---

## 2. Design tokens — use these exact values

### Colour

| Role | Hex | Use |
|---|---|---|
| Primary | `#0F172A` | Sidebar background, headings, primary button |
| Primary hover | `#1E293B` | Primary hover |
| Accent | `#2563EB` | Links, active nav, focus ring, secondary CTA |
| Background | `#F8FAFC` | Page background |
| Surface | `#FFFFFF` | Cards, table, modal |
| Border | `#E2E8F0` | Card borders, table row dividers |
| Text primary | `#0F172A` | Headings, key content |
| Text secondary | `#475569` | Labels, captions, meta |

### Status colours — mapped from enum, never chosen ad hoc

| Meaning | Hex | Applies to |
|---|---|---|
| Success / Active | `#16A34A` | `status = active` |
| Warning / Pending | `#D97706` | `status = pending` |
| Danger / Suspended | `#DC2626` | `status = suspended` |
| Info | `#0284C7` | (unused on this page) |
| Neutral | `#64748B` | (unused on this page) |

Badge styling: background = status colour at **15% opacity**, text = the status colour at
full strength. Never a solid saturated fill.

### Typography

```
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap');
```

- Headings → **Lexend** (400/500/600/700)
- Body, tables, forms → **Source Sans 3** (400/500/600)
- Both must render Vietnamese diacritics correctly — this is non-negotiable, all UI copy is Vietnamese
- Numeric table columns use `font-variant-numeric: tabular-nums`

### Spacing, radius, elevation

| Token | Value |
|---|---|
| Base unit | `8px` (all spacing a multiple of 8; 4px only for very tight cases) |
| Card padding | `20px` desktop, `16px` mobile |
| Radius | `8px` cards/inputs, `6px` buttons/badges, `9999px` status pills |
| Shadow | `shadow-sm` default; `shadow-md` only on hoverable cards |
| Sidebar | `240px` expanded, `64px` icon-only collapsed |
| Header | `56px`, sticky |
| Table row | `40px` |

### Breakpoints

`375px` · `768px` (sidebar auto-collapses) · `1024px` · `1440px` (content max-width caps; tables must not stretch indefinitely)

### Icons

**Lucide only**, inline SVG, `stroke-width: 2`. Sizes: `16px` inline, `20px` button/table action, `24px` nav.
Icons needed here: `users`, `layout-dashboard`, `receipt`, `wallet`, `activity`, `search`, `chevron-down`, `more-horizontal`, `check`, `ban`, `rotate-ccw`, `bell`, `inbox`, `alert-circle`.

---

## 3. Layout shell

```
┌──────────────┬────────────────────────────────────────────┐
│              │  Header 56px sticky                        │
│  Sidebar     │  [Breadcrumb]            [bell] [avatar ▾] │
│  240px       ├────────────────────────────────────────────┤
│  #0F172A     │  Page title            [primary action]    │
│              │  ┌──────────────────────────────────────┐  │
│  Logo        │  │ Filter toolbar                       │  │
│  ─ Tổng quan │  ├──────────────────────────────────────┤  │
│  ─ Tài khoản◄│  │ Data table (sticky header)           │  │
│  ─ Học phí   │  │                                      │  │
│  ─ Lương     │  └──────────────────────────────────────┘  │
│  ─ Giám sát  │                                            │
└──────────────┴────────────────────────────────────────────┘
```

Sidebar nav items (Vietnamese, active item = **Tài khoản**):
`Tổng quan` · `Tài khoản` · `Học phí` · `Lương` · `Giám sát`

Breadcrumb: `Trang chủ / Tài khoản`

---

## 4. Page structure — top to bottom

1. **Title row** — `h1` "Tài khoản" (Lexend 600, 24px) + result count as secondary text
2. **Filter toolbar** — one card, horizontal row:
   - Search input with leading `search` icon, placeholder `Tìm theo tên hoặc email`
   - Select: `Vai trò` → Tất cả / Admin / Giáo viên / Học sinh
   - Select: `Trạng thái` → Tất cả / Chờ duyệt / Đang hoạt động / Đã khóa
   - Text button `Xóa bộ lọc` (only visible when a filter is active)
3. **Data table** — one card, sticky header
4. **Pagination** — right-aligned below the table

**No KPI row on this page.** Counters live on the dashboard. Do not add stat tiles.

---

## 5. Component specs

### Data table

Columns, in order:

| Column | Content | Alignment | Notes |
|---|---|---|---|
| Người dùng | avatar (28px circle) + `nickname` above `email` in secondary text | left | Two-line cell |
| Vai trò | plain text: Admin / Giáo viên / Học sinh | left | Not a badge — role is not a status |
| Trạng thái | status pill | left | Colour map in §2 |
| Ngày đăng ký | `dd/MM/yyyy` | left | tabular-nums |
| Đăng nhập gần nhất | `dd/MM/yyyy HH:mm`, or `—` if null | left | tabular-nums |
| (actions) | `more-horizontal` icon button → dropdown menu | right | 40px wide |

- Sticky header, `#F8FAFC` background, `#475569` uppercase 12px labels
- Row height 40px, divider `1px #E2E8F0`
- Row hover: background `#F8FAFC`, `cursor: pointer` (row click opens detail)
- Sortable: Ngày đăng ký, Đăng nhập gần nhất — show a sort chevron on the active column only

### Row action menu

Contents depend on `status` — show only valid transitions:

- `pending` → **Duyệt tài khoản**, Xem chi tiết
- `active` → **Khóa tài khoản**, Xem chi tiết
- `suspended` → **Mở khóa tài khoản**, Xem chi tiết

Destructive item (`Khóa tài khoản`) uses `#DC2626` text.

### Status pill

`border-radius: 9999px`, `padding: 2px 10px`, `font-size: 12px`, `font-weight: 500`.

| status | label | text | background |
|---|---|---|---|
| `pending` | Chờ duyệt | `#D97706` | `#D97706` @ 15% |
| `active` | Đang hoạt động | `#16A34A` | `#16A34A` @ 15% |
| `suspended` | Đã khóa | `#DC2626` | `#DC2626` @ 15% |

### Modals

Three, all centred, `max-width: 480px`, radius 8px, backdrop `#0F172A` @ 40%.

1. **Duyệt tài khoản** — title, body naming the user, buttons `Hủy` / `Duyệt tài khoản`
2. **Khóa tài khoản** — title, body, **required** textarea `Lý do khóa`, buttons `Hủy` / `Khóa tài khoản` (danger). Submit disabled while the textarea is empty
3. **Mở khóa tài khoản** — title, body, buttons `Hủy` / `Mở khóa`

Buttons name their action. Never a generic "Xác nhận".

---

## 6. Data — use these exact sample rows

```json
[
  {"nickname":"Nguyễn Minh Anh","email":"minhanh@example.com","role":"student","status":"pending","createdAt":"2026-08-09","lastLoginAt":null},
  {"nickname":"Trần Thu Hà","email":"thuha.teacher@example.com","role":"teacher","status":"pending","createdAt":"2026-08-08","lastLoginAt":null},
  {"nickname":"Lê Quang Dũng","email":"quangdung@example.com","role":"student","status":"active","createdAt":"2026-05-21","lastLoginAt":"2026-08-11 09:14"},
  {"nickname":"Phạm Thị Lan","email":"lan.pham@example.com","role":"teacher","status":"active","createdAt":"2026-03-02","lastLoginAt":"2026-08-11 07:42"},
  {"nickname":"Hoàng Văn Nam","email":"namhoang@example.com","role":"student","status":"active","createdAt":"2026-06-14","lastLoginAt":"2026-08-10 20:05"},
  {"nickname":"Vũ Ngọc Bích","email":"bichvu@example.com","role":"student","status":"suspended","createdAt":"2026-04-30","lastLoginAt":"2026-07-28 15:33"},
  {"nickname":"Đỗ Hải Yến","email":"haiyen.teacher@example.com","role":"teacher","status":"active","createdAt":"2026-01-19","lastLoginAt":"2026-08-11 08:58"},
  {"nickname":"Bùi Anh Tuấn","email":"tuanbui@example.com","role":"admin","status":"active","createdAt":"2025-11-05","lastLoginAt":"2026-08-11 09:31"}
]
```

Note the deliberate mix: 2 pending (the queue the Admin came for), 1 suspended, both
teacher and student roles, and null `lastLoginAt` on never-logged-in accounts so the `—`
fallback is visible in the mockup.

---

## 7. States — render all seven, switchable

Include a small **state switcher** fixed to the top-right, clearly marked as a review aid
and not part of the design (monospace, muted, thin border). Buttons:
`Ready · Loading · Empty · Error · Modal: duyệt · Modal: khóa · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Skeleton rows (8) with shimmer. Toolbar stays fully interactive. **Never a full-page spinner.** |
| **Ready** | The default — table with the 8 rows above |
| **Empty** | Inside the table card: `inbox` icon at 15% opacity, heading `Không có tài khoản nào khớp`, one line of body, button `Xóa bộ lọc`. Never a blank card |
| **Partial** | N/A — single query. Say so; do not invent one |
| **Error** | Inline banner above the table: `alert-circle`, message, `Thử lại` button. Toolbar and filter values stay visible and intact — the page shell must not disappear |
| **Forbidden** | N/A — the route guard redirects before render |
| **Offline** | N/A — no offline support |

The **Empty** and **Error** states are as important as Ready. A mockup that only shows
Ready is incomplete for this project.

---

## 8. Copy — exact strings, Vietnamese

| Location | String |
|---|---|
| Page title | `Tài khoản` |
| Result count | `8 tài khoản` |
| Search placeholder | `Tìm theo tên hoặc email` |
| Filter labels | `Vai trò` · `Trạng thái` |
| Clear filters | `Xóa bộ lọc` |
| Column headers | `Người dùng` · `Vai trò` · `Trạng thái` · `Ngày đăng ký` · `Đăng nhập gần nhất` |
| Role values | `Admin` · `Giáo viên` · `Học sinh` |
| Empty heading | `Không có tài khoản nào khớp` |
| Empty body | `Thử bỏ bớt bộ lọc để xem thêm kết quả.` |
| Error message | `Không tải được danh sách tài khoản.` |
| Retry | `Thử lại` |
| Approve modal title | `Duyệt tài khoản` |
| Approve modal body | `Tài khoản {nickname} sẽ được kích hoạt và có thể đăng nhập ngay.` |
| Suspend modal title | `Khóa tài khoản` |
| Suspend modal body | `{nickname} sẽ không thể đăng nhập cho đến khi được mở khóa.` |
| Suspend reason label | `Lý do khóa` |
| Toasts | `Đã duyệt tài khoản` · `Đã khóa tài khoản` · `Đã mở khóa tài khoản` |

Toast verb must match the button verb that produced it.

---

## 9. Interactions

- Row click → user detail (mockup: no-op, but the row must show `cursor: pointer` + hover)
- Action menu → opens the matching modal
- Modal confirm → close, show toast, update that row's badge optimistically
- Transitions 150–300ms; honour `prefers-reduced-motion`
- Keyboard: visible focus ring (`#2563EB`, 2px offset) on every interactive element.
  Admins work this screen with Tab and Enter — focus states are a primary requirement here, not a polish item
- Below 768px: **the table becomes a card list**, one card per user. Never horizontally scroll the table

---

## 10. Constraints — do NOT

- Do not use emoji as icons (Lucide inline SVG only)
- Do not invent status colours — use the §2 map exactly
- Do not use `localStorage` / `sessionStorage`; hold state in JS variables
- Do not add a KPI/stat row (belongs on the dashboard)
- Do not add "Add user", "Edit user", or "Delete user" — registration is self-serve, and
  Admin has read-only access to other users' profile fields. Only the three status
  transitions exist
- Do not use a dark theme, gradients, glassmorphism, or neon accents
- Do not use placeholder text as a substitute for a field label
- Do not render Ready only — Empty and Error are required deliverables

---

## 11. Instructions for `ui-ux-pro-max`

Use it for **layout, density, and table-interaction quality** on a data-dense B2B admin
screen — spacing rhythm, scan-ability, toolbar composition, action-menu affordance,
empty-state craft.

**Do not run its design-system generator, and do not take its palette or font pairing.**
This project has a locked design system, reproduced in §2 above. If a recommendation
conflicts with §2 or §10, §2 and §10 win. Keep only structure and its anti-pattern advice.

---

## 12. Deliverable

One `.html` file:

- All CSS in a single `<style>` block; all JS in a single `<script>` block
- Google Fonts via `@import`; Lucide icons as inline SVG; no other network requests
- The §7 state switcher wired and working
- Renders correctly at 1440px, 1024px, 768px, 375px
- Text contrast ≥ 4.5:1 everywhere (the §2 palette already satisfies this — do not deviate from it)
