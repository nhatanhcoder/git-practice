---
page: Admin · Tuition Rates
route: /admin/tuition-rates
contract: ../../pages/admin-pages/admin-tuition-rates.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
last_updated: 2026-08-11
---

# Page Spec — Admin · Tuition Rates

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global
> do-NOTs. This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent
> colours, fonts or spacing — this product has a locked design system.

---

## 1. Purpose

what each student pays per period, and the full history of past rates. Rates are append-only: a new rate supersedes the old one from a date, it never overwrites it.

## 2. Access

admin. No ownership rule. On denial → `/login`.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Rate table | ⛔ `GET /api/v1/admin/tuition-rates` **does not exist** | — | — |
| History drawer | ⛔ `GET /api/v1/admin/tuition-rates?studentId=` **does not exist** | — | — |
| Set rate | `POST /api/v1/admin/tuition-rates` | `data.rate` | `USER_NOT_FOUND`, `TODO(error-code)` |

⛔ **The real blocker is upstream of the API.** `FEATURES_ADMIN` A-INV-1 records the
billing model itself as undecided ("theo lớp / gói / tháng"). This screen cannot be
finalised until that is settled.

---

## 4. Page structure

1. **Title row** — `h1` `Mức học phí` + primary button `Thiết lập học phí`
2. **Info banner** — a persistent, non-dismissible note explaining append-only behaviour
3. **Rate table** — current rate per student
4. **History drawer** — right-side, opens on row click

## 5. Component specs

### Info banner

Background `#0284C7` at 8%, left border `3px #0284C7`, `info` icon 16px, 13px text:
`Mỗi lần thiết lập sẽ tạo một mức mới có hiệu lực từ ngày bạn chọn. Mức cũ được giữ lại để giải thích các hóa đơn đã phát hành.`

### Rate table

| Column | Content | Align |
|---|---|---|
| Học sinh | avatar 28px + nickname | left |
| Mức hiện tại | `2.500.000 ₫` | right |
| Hiệu lực từ | `01/03/2026` | left |
| Số lần thay đổi | `2` | right |
| (actions) | `more-horizontal` → `Đổi mức`, `Xem lịch sử` | right |

A student with no rate shows `Chưa thiết lập` in `#475569` italic and an inline
`Thiết lập` link instead of an amount. These rows sort to the top.

### History drawer

Width `420px`, slides from the right, backdrop `#0F172A` @ 40%.
Header: student name + `Đóng`. Body: vertical timeline, newest first —
each entry `2.500.000 ₫` (Lexend 600, 18px), `Hiệu lực từ 01/03/2026`, `Thiết lập bởi Admin · 28/02/2026`.
The current entry carries a small `Đang áp dụng` pill in success green.

### Set-rate modal

`max-width: 480px`. Fields: `Học sinh` (select, prefilled if opened from a row),
`Mức học phí (VND)` (numeric, required), `Hiệu lực từ` (date, required, defaults to the
1st of next month). Buttons `Hủy` / `Lưu mức mới`.

Below the fields, a live preview line: `Mức mới sẽ áp dụng cho các hóa đơn từ 01/09/2026.`

## 6. Data — use these exact values

```json
{
  "rates": [
    {"student":"Mai Tuấn Kiệt","current":null,"effectiveFrom":null,"changes":0},
    {"student":"Nguyễn Minh Anh","current":2500000,"effectiveFrom":"01/03/2026","changes":2},
    {"student":"Lê Quang Dũng","current":2500000,"effectiveFrom":"01/03/2026","changes":1},
    {"student":"Hoàng Văn Nam","current":2800000,"effectiveFrom":"01/06/2026","changes":2},
    {"student":"Trần Bảo Long","current":2500000,"effectiveFrom":"01/07/2026","changes":1}
  ],
  "history": {
    "Nguyễn Minh Anh": [
      {"amount":2500000,"effectiveFrom":"01/03/2026","setAt":"28/02/2026","current":true},
      {"amount":2200000,"effectiveFrom":"01/01/2026","setAt":"30/12/2025","current":false}
    ]
  }
}
```

## 7. States

Switcher: `Ready · Loading · Empty · Error · Drawer · Modal · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Table skeleton |
| **Ready** | Data above — note the first row has no rate set |
| **Empty** | No rates at all → `Chưa thiết lập học phí cho học sinh nào` + button |
| **Partial** | N/A |
| **Error** | Inline retry above the table |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Title | `Mức học phí` |
| Primary | `Thiết lập học phí` |
| Columns | `Học sinh` · `Mức hiện tại` · `Hiệu lực từ` · `Số lần thay đổi` |
| No rate | `Chưa thiết lập` / `Thiết lập` |
| Menu | `Đổi mức` · `Xem lịch sử` |
| Drawer title | `Lịch sử mức học phí` |
| Current pill | `Đang áp dụng` |
| Modal fields | `Học sinh` · `Mức học phí (VND)` · `Hiệu lực từ` |
| Modal submit | `Lưu mức mới` |
| Toast | `Đã lưu mức học phí mới` |
| Empty | `Chưa thiết lập học phí cho học sinh nào` |

## 9. Interactions

- Row click → history drawer; `Đổi mức` → modal
- Changing `Hiệu lực từ` updates the preview line live
- `Esc` closes drawer and modal
- Below 768px: drawer becomes a full-screen sheet; table becomes card list

## 10. Constraints — do NOT

- Do not present this as "edit the rate" — rates are append-only history
- Do not add a delete action; past invoices/payroll depend on old rates
- Do not hide superseded rates — the history is the point of the screen
- Do not sort students with no rate to the bottom — they are the actionable rows
