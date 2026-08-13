---
page: Admin · Invoice Detail
route: /admin/invoices/[invoiceId]
contract: ../../pages/admin-pages/admin-invoice-detail.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
last_updated: 2026-08-11
---

# Page Spec — Admin · Invoice Detail

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global
> do-NOTs. This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent
> colours, fonts or spacing — this product has a locked design system.

---

## 1. Purpose

one invoice — what is owed, every payment recorded against it, and the two actions that change it: record a payment, or void it.

## 2. Access

admin. No ownership rule. On denial → `/admin/invoices`.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Invoice + payments | `GET /api/v1/admin/invoices/:id` | `data.invoice` | `TODO(error-code)` |
| Record payment | `POST /api/v1/admin/invoices/:id/payments` | `data.payment` | `TODO(error-code)` |
| Void invoice | `PATCH /api/v1/admin/invoices/:id/void` | `data.invoice` | `TODO(error-code)` |

⛔ Response must embed `payments[]` — not stated in `API_ADMIN.md`.
⛔ No `INVOICE_*` error codes exist.

**Status is recomputed server-side** on every payment (`unpaid → partially_paid → paid`).
The UI renders the returned status and must never derive `paid` from `paid >= total`.

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
