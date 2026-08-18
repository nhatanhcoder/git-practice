---
page: Admin · Generate Invoices
route: /admin/invoices/generate
contract: ../../pages/admin-pages/admin-invoice-generate.md
requires: _DESIGN-SYSTEM.md
status: built
design_baseline: v2
last_updated: 2026-08-16
---

# Page Spec — Admin · Generate Invoices

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global
> do-NOTs. This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent
> colours, fonts or spacing — this product has a locked design system.

---

## 1. Purpose

a three-step wizard that issues one month of tuition invoices for every eligible student in a single reviewed run. This is a long operation, so it is a full page, not a modal.

## 2. Access

admin. No ownership rule. On denial → `/login`.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Step 2 preview | ⛔ **no endpoint** — needs students with an active rate for the period, resolved amount, and an already-invoiced flag | — | — |
| Step 3 run | ⛔ `POST /api/v1/admin/invoices/batch` **does not exist** | — | `TODO(error-code)` |
| Fallback | `POST /api/v1/admin/invoices` (single student, loop client-side) | `data.invoice` | `TODO(error-code)` |

**Two blockers.** The batch endpoint is preferred — one transaction, one result set. The
client-side loop is the fallback and is why `Partial` is a first-class state below.

⛔ **No `INVOICE_*` error codes exist** in `API_ERROR_CODES.md` — the whole family is absent.

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
