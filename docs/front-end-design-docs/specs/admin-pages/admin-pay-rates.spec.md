---
page: Admin · Teacher Pay Rates
route: /admin/pay-rates
contract: ../../pages/admin-pages/admin-pay-rates.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
last_updated: 2026-08-11
---

# Page Spec — Admin · Teacher Pay Rates

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global
> do-NOTs. This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent
> colours, fonts or spacing — this product has a locked design system.

---

## 1. Purpose

each teacher's pay rate — per session or per hour — and the history of past rates. Append-only, like tuition rates: finalized payroll periods depend on the rate that applied then.

## 2. Access

admin. No ownership rule. On denial → `/login`.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Rate table | ⛔ `GET /api/v1/admin/pay-rates` **does not exist** | — | — |
| History drawer | ⛔ `GET /api/v1/admin/pay-rates?teacherId=` **does not exist** | — | — |
| Set rate | `POST /api/v1/admin/pay-rates` | `data.rate` | `USER_NOT_FOUND`, `TODO(error-code)` |

⛔ `FEATURES_ADMIN` A-PAY-1 records the unit basis as undecided.

`per_hour` billing rounds **up to the nearest 0.5h** (`FLOW_PAYROLL_CYCLE` §3) — a 50-minute
session bills 1.0h. This drives a required UI warning; see §5.

---

## 4. Page structure

1. **Title row** — `h1` `Mức lương giáo viên` + primary button `Thiết lập mức lương`
2. **Info banner** — append-only note (same treatment as tuition rates)
3. **Rate table**
4. **History drawer** — right-side, on row click

## 5. Component specs

### Rate table

| Column | Content | Align |
|---|---|---|
| Giáo viên | avatar 28px + nickname | left |
| Hình thức | pill: `Theo buổi` (`#0284C7` @15%) or `Theo giờ` (`#64748B` @15%) | left |
| Đơn giá | `250.000 ₫/buổi` or `300.000 ₫/giờ` | right |
| Hiệu lực từ | `01/03/2026` | left |
| (actions) | `more-horizontal` → `Đổi mức`, `Xem lịch sử` | right |

`Hình thức` is a **neutral/info** pill, not a status pill — it describes a kind, not a state.

### Set-rate modal — the important one

`max-width: 520px`. Fields: `Giáo viên` (select), `Hình thức` (radio: Theo buổi / Theo giờ),
`Đơn giá (VND)` (numeric), `Hiệu lực từ` (date). Buttons `Hủy` / `Lưu mức mới`.

**When `Theo giờ` is selected**, reveal a warning note directly beneath the radio —
background `#D97706` @ 8%, left border `3px #D97706`:
`Thời lượng được làm tròn lên 0,5 giờ. Buổi 50 phút được tính 1 giờ.`

This must be visible **at the moment of choosing**, not in a tooltip and not after saving.
It is the single most surprising rule in the payroll model.

### History drawer

Same as tuition rates: timeline, newest first, each entry showing rate type, amount,
`Hiệu lực từ`, who set it and when, with `Đang áp dụng` on the current one.

## 6. Data — use these exact values

```json
{
  "rates": [
    {"teacher":"Phạm Thị Lan","rateType":"per_session","amount":250000,"effectiveFrom":"01/03/2026"},
    {"teacher":"Đỗ Hải Yến","rateType":"per_hour","amount":300000,"effectiveFrom":"01/06/2026"},
    {"teacher":"Nguyễn Hữu Phước","rateType":null,"amount":null,"effectiveFrom":null}
  ],
  "history": {
    "Phạm Thị Lan": [
      {"rateType":"per_session","amount":250000,"effectiveFrom":"01/03/2026","setAt":"27/02/2026","current":true},
      {"rateType":"per_session","amount":220000,"effectiveFrom":"01/11/2025","setAt":"29/10/2025","current":false}
    ]
  }
}
```

Both rate types plus one unset teacher — the unset row is what the payroll screen links here for.

## 7. States

Switcher: `Ready · Loading · Empty · Error · Drawer · Modal: theo giờ · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Table skeleton |
| **Ready** | Data above |
| **Empty** | `Chưa thiết lập mức lương cho giáo viên nào` + button |
| **Partial** | N/A |
| **Error** | Inline retry |
| **Forbidden** / **Offline** | N/A |

`Modal: theo giờ` must show the rounding warning — it is a required deliverable state.

## 8. Copy

| Location | String |
|---|---|
| Title | `Mức lương giáo viên` |
| Primary | `Thiết lập mức lương` |
| Columns | `Giáo viên` · `Hình thức` · `Đơn giá` · `Hiệu lực từ` |
| Rate types | `Theo buổi` · `Theo giờ` |
| Unit suffix | `₫/buổi` · `₫/giờ` |
| Rounding warning | `Thời lượng được làm tròn lên 0,5 giờ. Buổi 50 phút được tính 1 giờ.` |
| No rate | `Chưa thiết lập` |
| Modal submit | `Lưu mức mới` |
| Toast | `Đã lưu mức lương mới` |

## 9. Interactions

- Selecting `Theo giờ` reveals the rounding warning with a 150ms height transition
- Unit suffix in `Đơn giá` flips between `₫/buổi` and `₫/giờ` with the radio
- Below 768px: table → card list, drawer → full-screen sheet

## 10. Constraints — do NOT

- Do not present this as "edit the rate" — rates are append-only history
- Do not add a delete action; past invoices/payroll depend on old rates
- Do not hide superseded rates — the history is the point of the screen
- Do not put the rounding rule in a tooltip or `title` attribute
- Do not use status colours for the `Hình thức` pill
