---
page: Admin · Payroll Periods
route: /admin/payroll
contract: ../../pages/admin-pages/admin-payroll-list.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
last_updated: 2026-08-11
---

# Page Spec — Admin · Payroll Periods

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global
> do-NOTs. This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent
> colours, fonts or spacing — this product has a locked design system.

---

## 1. Purpose

every pay period and its state, and the entry point for opening a new draft over the sessions approved so far.

## 2. Access

admin. No ownership rule. On denial → `/login`.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Period table | `GET /api/v1/admin/payroll?teacherId=&year=` | `data[]`, `meta` | — |
| Create draft | `POST /api/v1/admin/payroll` | `data.period` | `PAYROLL_PERIOD_NOT_FOUND` |
| Row click | → `/admin/payroll/[periodId]` | — | — |

⛔ The create modal's live preview ("sẽ tổng hợp N buổi của M giáo viên") has no endpoint.
⛔ Period boundaries are **undecided** (`FEATURES_ADMIN` A-PAY-4) — the modal must accept an
arbitrary date range, not assume calendar months.

---

## 4. Page structure

1. **Title row** — `h1` `Kỳ lương` + primary button `Tạo kỳ lương`
2. **Filter toolbar** — teacher select, year select
3. **Period table**
4. **Pagination**

## 5. Component specs

### Period table

| Column | Content | Align |
|---|---|---|
| Kỳ | `01/07 – 31/07/2026` | left |
| Số giáo viên | `2` | right |
| Số buổi | `24` | right |
| Tổng chi | `7.500.000 ₫` | right |
| Trạng thái | status pill | left |
| Ngày chốt | `02/08/2026` or `—` | left |

Status pills use the §2 map: `draft` → Info `#0284C7` `Nháp`, `finalized` → Warning
`#D97706` `Đã chốt`, `paid` → Success `#16A34A` `Đã trả`.

Row click → period detail. Sortable by `Kỳ` (default, newest first).

### Create-period modal

`max-width: 480px`. Fields `Từ ngày` and `Đến ngày` (both date, required), defaulting to
the previous calendar month. Buttons `Hủy` / `Tạo kỳ lương`.

Below the fields, a live preview line queried from the selected range:
`Sẽ tổng hợp 24 buổi học đã duyệt của 2 giáo viên.`
If the range contains zero approved sessions, the preview reads
`Không có buổi học đã duyệt trong khoảng này.` and the submit button is disabled.

**Do not hardcode a calendar month.** The period boundary is an open project decision, so
the modal must accept an arbitrary range.

## 6. Data — use these exact values

```json
{
  "periods": [
    {"range":"01/07 – 31/07/2026","teachers":2,"sessions":24,"total":7500000,"status":"finalized","finalizedAt":"02/08/2026"},
    {"range":"01/06 – 30/06/2026","teachers":2,"sessions":27,"total":8750000,"status":"paid","finalizedAt":"01/07/2026"},
    {"range":"01/05 – 31/05/2026","teachers":2,"sessions":26,"total":8250000,"status":"paid","finalizedAt":"02/06/2026"},
    {"range":"01/04 – 30/04/2026","teachers":2,"sessions":22,"total":7000000,"status":"paid","finalizedAt":"01/05/2026"}
  ],
  "createPreview": { "sessions": 18, "teachers": 2 }
}
```

## 7. States

Switcher: `Ready · Loading · Empty · Error · Modal · Modal: no sessions · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Table skeleton |
| **Ready** | Four rows above |
| **Empty** | `Chưa có kỳ lương nào` + body + button `Tạo kỳ lương đầu tiên` |
| **Partial** | N/A |
| **Error** | Inline retry |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Title | `Kỳ lương` |
| Primary | `Tạo kỳ lương` |
| Columns | `Kỳ` · `Số giáo viên` · `Số buổi` · `Tổng chi` · `Trạng thái` · `Ngày chốt` |
| Pills | `Nháp` · `Đã chốt` · `Đã trả` |
| Modal fields | `Từ ngày` · `Đến ngày` |
| Preview | `Sẽ tổng hợp {n} buổi học đã duyệt của {m} giáo viên.` |
| Preview empty | `Không có buổi học đã duyệt trong khoảng này.` |
| Empty | `Chưa có kỳ lương nào` |
| Toast | `Đã tạo kỳ lương` |

## 9. Interactions

- Changing either date refetches the preview line
- Creating navigates straight to the new period's detail page
- Below 768px: table → card list with `Tổng chi` as the card's headline figure

## 10. Constraints — do NOT

- Do not assume calendar months — the range is user-chosen
- Do not put finalize or mark-paid actions on this page; they live on the detail page next to the numbers they act on
- Do not add a delete-period action
