---
scope: shared — all Admin/Teacher/Student page specs
status: active
last_updated: 2026-08-11
---

# Design System — HSK Learning Platform

> **Paste this file ONCE per design session, together with the page spec you want built.**
> It holds everything that is identical across every screen. Page specs hold only what
> differs. If you are given a page spec **without** this file, stop and ask for it —
> do not invent tokens.

---

## 1. Product & tone

**Product:** HSK Learning Platform — a Chinese-language teaching platform (HSK 1–9) with
three roles: Admin, Teacher, Student. All UI copy is Vietnamese.

**Tone:** internal management tool used by administrative and accounting staff handling
tuition and teacher payroll, often on a large monitor all day. Precise and trustworthy,
high information density, no decoration. Reference points: Linear, Stripe Dashboard.

**Explicitly rejected:** purple/gradient "AI dashboard" styling, dark+neon themes,
glassmorphism, large rounded corners, decorative illustrations, emoji as icons, gauges,
speedometers, progress rings. Ruled out deliberately — do not reintroduce.

---

## 2. Tokens

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
| Warning | `#D97706` | `pending`, `unpaid`, `partially_paid`, `completed_pending`, `finalized` |
| Danger | `#DC2626` | `suspended`, `rejected`, overdue invoice, `absent_unexcused` |
| Info | `#0284C7` | `draft`, `scheduled`, `in_progress` |
| Neutral | `#64748B` | `archived`, `void`, `dropped` |

Badge: background = status hex at **15% opacity**, text = status hex full strength.
Never a solid saturated fill.

### Colour — chart series (validated, do not substitute)

| Slot | Hex |
|---|---|
| Series 1 | `#2563EB` |
| Series 2 | `#EA580C` |

Adjacent-pair separation ΔE 31.3 protan / 34.6 tritan / 39.6 normal vision on white —
passes lightness band, chroma floor, CVD separation and 3:1 contrast.
**Status colours are never used for chart series.** Green-revenue/red-payroll is the
common instinct and it is wrong: it makes an ordinary month read as an error.

### Typography

```
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap');
```

- Headings and large values → **Lexend**
- Body, tables, forms → **Source Sans 3**
- Must render Vietnamese diacritics
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

`375px` · `768px` (sidebar → drawer) · `1024px` · `1440px` (content max-width caps)

### Icons

**Lucide only**, inline SVG, `stroke-width: 2`. Sizes `16px` inline, `20px` action, `24px` nav.

### Formats

Currency: `.` thousands separator, `₫` suffix — `12500000` → `12.500.000 ₫`.
Dates `dd/MM/yyyy`; datetimes `dd/MM/yyyy HH:mm`; null → `—`.

---

## 3. Layout shell

Sidebar `240px` (`#0F172A`) + sticky header `56px` + content area on `#F8FAFC`.

Admin nav: `Tổng quan` · `Tài khoản` · `Học phí` · `Lương` · `Giám sát`
Header: breadcrumb left; `bell` icon + avatar menu right.
Below 768px the sidebar becomes a hamburger drawer.

---

## 4. Standard components

**Data table** — sticky header (`#F8FAFC` bg, `#475569` uppercase 12px labels), row 40px,
divider `1px #E2E8F0`, row hover `#F8FAFC`. Money columns right-aligned, tabular-nums.
**Below 768px a table becomes a card list — never horizontal scroll.**

**Status pill** — `rounded-full`, `padding: 2px 10px`, `12px`, `font-weight: 500`,
colours from §2.

**KPI tile** — label 12px `#475569` uppercase above; value Lexend 600 30px `#0F172A`;
Lucide icon 24px top-right. Max 6 per page.

**Meter** — a flat track for a ratio: 6px height, `#E2E8F0` track, radius 3px.
Never a donut, ring or gauge.

**Empty state** — icon at 15% opacity + one heading + one body line + a CTA when there is
an action to take. Never a blank card.

**Modal** — centred, `max-width: 480px`, radius 8px, backdrop `#0F172A` @ 40%.
Buttons name their action (`Duyệt tài khoản`), never a generic `Xác nhận`.
Any destructive or irreversible action must state the consequence in words.

**Toast** — verb matches the button verb that produced it (`Duyệt` → `Đã duyệt`).

**Loading** — skeletons per region. **Never a full-page spinner.**

**Forms** — labels always visible; placeholders are not labels. Field errors render
beneath the field in `#DC2626` 13px, never as a toast.

---

## 5. The seven states

Every screen addresses all seven. A page spec marks N/A only with a reason.

`Loading` · `Ready` · `Empty` · `Partial` · `Error` · `Forbidden` · `Offline`

`Forbidden` is normally N/A (the route guard redirects before render).
`Offline` is N/A project-wide — no offline support in S0–S9.

**A mockup that renders only `Ready` is incomplete.**

---

## 6. Charts

- **One y-axis, always.** Never a second scale — two measures of different scale become two charts
- Lines 2px, no gradient fill, no glow; markers 8px on hover + final point only
- Horizontal gridlines only, `1px #E2E8F0`; no vertical gridlines, no plot border
- Axis labels `#475569` 12px
- ≥2 series → legend always present, plus direct labels at the final point
- 1 series → no legend; the card title names it
- Hover → crosshair + one shared tooltip per x-position
- **`Xem dạng bảng` toggle required** — information must never be colour-only
- An incomplete current period renders **dashed** with a note; never a solid line

---

## 7. Global do-NOT

- Do not use emoji as icons (Lucide inline SVG only)
- Do not invent status colours — use the §2 map
- Do not use `localStorage` / `sessionStorage`; hold state in JS variables
- Do not use dark themes, gradients, glassmorphism, neon accents
- Do not use placeholder text as a field label
- Do not horizontally scroll a table on mobile
- Do not render only the `Ready` state

---

## 8. Using `ui-ux-pro-max`

Use it for **layout, density and interaction quality** — spacing rhythm, scan-ability,
toolbar and table composition, empty-state craft.

**Do not run its design-system generator, and do not take its palette or font pairing.**
Where any suggestion conflicts with §2, §6 or §7 — or with a page spec's own do-NOT list —
**this file and the page spec win.** Keep only structure and anti-pattern advice.

---

## 9. Deliverable format

One self-contained `.html` file per page:

- All CSS in one `<style>` block, all JS in one `<script>` block
- Google Fonts via `@import`; Lucide icons inline SVG; charts as hand-written inline SVG
- No other network requests, no build step, no framework
- A **state switcher** fixed top-right, visibly marked as a review aid and not part of the
  design, wired to every state the page spec lists
- Renders correctly at 1440px, 1024px, 768px, 375px
- Text contrast ≥ 4.5:1 (the §2 palette satisfies this — do not deviate)
