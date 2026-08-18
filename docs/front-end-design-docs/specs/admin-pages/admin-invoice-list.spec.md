---
page: Admin · Billing
route: /admin/invoices
contract: ../../pages/admin-pages/admin-invoice-list.md
requires: _DESIGN-SYSTEM.md
status: built
design_baseline: v2
last_updated: 2026-08-16
---

# Page Spec — Admin · Billing

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global
> do-NOTs. This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent
> colours, fonts or spacing — this product has a locked design system.

---

## 1. Purpose

the tuition collection view for one billing period — who has paid, who has not, and how much is still outstanding across all students.

## 2. Access

admin. No ownership rule — all students, system-wide. On denial → `/login`.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Invoice table | `GET /api/v1/admin/invoices?period=&status=` | `data[]`, `meta` | — |
| Row click | → `/admin/invoices/[invoiceId]` | — | — |
| Generate button | → `/admin/invoices/generate?period=` | — | — |

⛔ **No endpoint for the KPI summary** (đã thu n/total, tổng thu, còn nợ). Either extend
`GET /admin/invoices` with `meta.summary` or add `GET /admin/invoices/summary`.

---

## 4. Page structure — top to bottom

1. **Title row** — `h1` `Học phí` + month selector on the right + primary button `Tạo hóa đơn tháng…`
2. **KPI row** — 3 tiles (see §5)
3. **Filter toolbar** — search by student name, status select
4. **Invoice table**
5. **Pagination** — right-aligned

## 5. Component specs

### KPI tiles (3)

| # | Label | Value | Note |
|---|---|---|---|
| 1 | ĐÃ THU | `5/8 học sinh` | plus a thin progress track underneath: filled `#2563EB`, track `#E2E8F0`, height 6px, radius 3px |
| 2 | TỔNG THU | `12.500.000 ₫` | |
| 3 | CÒN NỢ | `7.500.000 ₫` | |

Tile 1's track is a **meter**, not a donut or ring. Value 30px Lexend 600.
Do not colour tile 3 red — an outstanding balance mid-month is normal, not an error.

### Invoice table

| Column | Content | Align |
|---|---|---|
| Học sinh | avatar 28px + `nickname` | left |
| Kỳ | `01/08 – 31/08/2026` | left |
| Tổng | amount | right |
| Đã nộp | amount | right |
| Còn nợ | amount, bold when > 0 | right |
| Trạng thái | status pill | left |

Sticky header, row 40px, row hover `#F8FAFC` + `cursor: pointer` (opens detail).
Money columns right-aligned with tabular-nums so digits line up.

### Status pills for invoices

| status | label | hex |
|---|---|---|
| `unpaid` | `Chưa nộp` | `#D97706` |
| `unpaid` **past period end** | `Quá hạn` | `#DC2626` |
| `partially_paid` | `Còn nợ một phần` | `#D97706` |
| `paid` | `Đã nộp` | `#16A34A` |
| `void` | `Đã hủy` | `#64748B` |

Note: `unpaid` and `partially_paid` share the warning hue; `Quá hạn` is a **derived**
state, not a stored enum value — it is `unpaid` after the period ends.

## 6. Data — use these exact values

```json
{
  "period": "08/2026",
  "summary": { "paidStudents": 5, "totalStudents": 8, "collected": 12500000, "outstanding": 7500000 },
  "invoices": [
    {"student":"Nguyễn Minh Anh","total":2500000,"paid":2500000,"status":"paid"},
    {"student":"Lê Quang Dũng","total":2500000,"paid":2500000,"status":"paid"},
    {"student":"Hoàng Văn Nam","total":2500000,"paid":2500000,"status":"paid"},
    {"student":"Vũ Ngọc Bích","total":2500000,"paid":2500000,"status":"paid"},
    {"student":"Đặng Thu Trang","total":2500000,"paid":2500000,"status":"paid"},
    {"student":"Trần Bảo Long","total":2500000,"paid":1000000,"status":"partially_paid"},
    {"student":"Ngô Khánh Vy","total":2500000,"paid":0,"status":"unpaid"},
    {"student":"Mai Tuấn Kiệt","total":2500000,"paid":0,"status":"void"}
  ]
}
```

Deliberate coverage: every one of the four enum values appears, including a partial
payment and a voided invoice.

## 7. States — render all, switchable

Switcher: `Ready · Loading · Empty · Partial · Error · Mobile`

| State | Appearance |
|---|---|
| **Loading** | KPI + table skeleton |
| **Ready** | Data above |
| **Empty** | No invoices for the selected month → `inbox` icon 15%, `Chưa tạo hóa đơn cho kỳ này`, body line, button `Tạo hóa đơn tháng 8` |
| **Partial** | Table rendered, KPI tiles still skeleton — the summary is a separate aggregate query |
| **Error** | Inline banner above the table, month selection preserved |
| **Forbidden** / **Offline** | N/A |

## 8. Copy — exact strings

| Location | String |
|---|---|
| Page title | `Học phí` |
| Primary button | `Tạo hóa đơn tháng…` |
| KPI labels | `ĐÃ THU` · `TỔNG THU` · `CÒN NỢ` |
| Columns | `Học sinh` · `Kỳ` · `Tổng` · `Đã nộp` · `Còn nợ` · `Trạng thái` |
| Search placeholder | `Tìm học sinh` |
| Empty heading | `Chưa tạo hóa đơn cho kỳ này` |
| Empty body | `Tạo hóa đơn hàng loạt cho tất cả học sinh đã có mức học phí.` |
| Error | `Không tải được danh sách hóa đơn.` · `Thử lại` |

## 9. Interactions

- Month selector → refetch (mockup: swaps to Empty state for any month ≠ 08/2026)
- Row click → invoice detail
- `Tạo hóa đơn tháng…` → the generate wizard
- Below 768px: table becomes card list, one card per invoice, money right-aligned inside the card

## 10. Constraints — do NOT

- Do not put a "record payment" action on this page — payment happens on the detail page only, so every payment has one audit path
- Do not colour the CÒN NỢ tile red
- Do not use a donut or ring for the collection ratio — flat meter only
- Do not add a per-row quick-pay button
