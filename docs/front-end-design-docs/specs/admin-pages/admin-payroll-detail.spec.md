---
page: Admin · Payroll Period Detail
route: /admin/payroll/[periodId]
contract: ../../pages/admin-pages/admin-payroll-detail.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
last_updated: 2026-08-11
---

# Page Spec — Admin · Payroll Period Detail

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global
> do-NOTs. This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent
> colours, fonts or spacing — this product has a locked design system.

---

## 1. Purpose

one pay period, line by line: which sessions were counted, at what rate, for how much — then the two one-way actions that close it out, finalize and mark-paid.

## 2. Access

admin. No ownership rule. On denial → `/admin/payroll`.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Period + breakdown | ⛔ `GET /api/v1/admin/payroll/:id` **does not exist** | — | — |
| Finalize | `PATCH /api/v1/admin/payroll/:id/finalize` | `data.period` | `PAYROLL_PERIOD_FINALIZED`, `PAYROLL_PERIOD_NOT_FOUND` |
| Mark paid | `PATCH /api/v1/admin/payroll/:id/pay` | `data.period` | `PAYROLL_PERIOD_NOT_FOUND` |

⛔ **The biggest gap in the Admin surface.** The per-session breakdown is already computed
server-side by `calculatePeriodAmount` (`FLOW_PAYROLL_CYCLE` §3: sessionDate, className,
duration, amount, per teacher) but there is no endpoint to fetch it.

Both mutations are **one-way**. `paid` also flips every member session to `paid`.

---

## 4. Page structure

1. **Back link** — `Quay lại danh sách kỳ lương`
2. **Header card** — period range, status pill, grand total, action bar
3. **Per-teacher summary** — one card per teacher, expandable
4. **Breakdown table** — inside each expanded teacher card

## 5. Component specs

### Header card

Left: `01/07 – 31/07/2026` (Lexend 600, 22px) + status pill + `Tạo lúc 01/08/2026`.
Right: `TỔNG CHI` label, **36px Lexend 600** value — the headline figure of the page.
Action bar sits below, right-aligned.

### Action bar — one-way actions

| Status | Buttons shown |
|---|---|
| `draft` | `Chốt kỳ lương` (primary) |
| `finalized` | `Đánh dấu đã trả` (primary) |
| `paid` | none — show text `Đã trả lương ngày 03/08/2026` |

`Chốt kỳ lương` is **hidden, not disabled**, once status is `finalized` or `paid`.
A disabled button invites the question "why can't I?"; an absent one does not.

### Confirm modals — must state irreversibility in words

**Chốt kỳ lương** — body:
`Kỳ lương sẽ được chốt ở mức 7.500.000 ₫ và không thể chỉnh sửa sau đó.`
Buttons `Hủy` / `Chốt kỳ lương`.

**Đánh dấu đã trả** — body:
`Xác nhận đã thanh toán 7.500.000 ₫ cho 2 giáo viên. Các buổi học trong kỳ sẽ chuyển sang trạng thái đã trả.`
Buttons `Hủy` / `Đánh dấu đã trả`.

Never a bare `Xác nhận?` — the button names the action and the body names the consequence.

### Per-teacher summary card

Collapsed row: avatar + name · rate applied (`250.000 ₫/buổi`) · `12 buổi` · subtotal
(right, Lexend 600, 18px) · `chevron-down`.
Expanded: the breakdown table below, inside the same card.

### Breakdown table

| Column | Content | Align |
|---|---|---|
| Ngày | `05/07/2026` | left |
| Lớp | class name | left |
| Thời lượng | `90 phút`, or `—` when the rate is per-session | right |
| Thành tiền | `250.000 ₫` | right |

For a `per_session` teacher the `Thời lượng` column shows `—`: duration does not affect
pay, and showing minutes there implies it does.
For a `per_hour` teacher show both raw and billed: `75 phút → 1,5 giờ`.

## 6. Data — use these exact values

```json
{
  "period": {"range":"01/07 – 31/07/2026","status":"draft","createdAt":"01/08/2026","total":7500000},
  "teachers": [
    {"name":"Phạm Thị Lan","rateType":"per_session","rate":250000,"sessions":12,"subtotal":3000000,
     "breakdown":[
       {"date":"05/07/2026","class":"HSK 2 — Nhóm A","duration":null,"amount":250000},
       {"date":"08/07/2026","class":"HSK 2 — Nhóm A","duration":null,"amount":250000},
       {"date":"12/07/2026","class":"HSK 2 — Nhóm A","duration":null,"amount":250000}
     ]},
    {"name":"Đỗ Hải Yến","rateType":"per_hour","rate":300000,"sessions":15,"subtotal":4500000,
     "breakdown":[
       {"date":"06/07/2026","class":"HSK 3 — Nhóm B","duration":"75 phút → 1,5 giờ","amount":450000},
       {"date":"09/07/2026","class":"HSK 3 — Nhóm B","duration":"90 phút → 1,5 giờ","amount":450000},
       {"date":"13/07/2026","class":"HSK 1 — Nhóm C","duration":"60 phút → 1,0 giờ","amount":300000}
     ]}
  ]
}
```

Note the second teacher: 75 minutes and 90 minutes both bill 1.5 hours. That rounding is
the model working as specified — show it plainly rather than hiding it.

## 7. States

Switcher: `Ready: draft · Ready: finalized · Ready: paid · Loading · Empty · Error 404 · Modal: chốt · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Header + teacher cards skeleton |
| **Ready** | Three status variants — the action bar differs in each |
| **Empty** | A draft with zero approved sessions → `Không có buổi học được duyệt trong kỳ này`, and **`Chốt kỳ lương` must be disabled** with helper text `Không thể chốt kỳ lương rỗng.` This is the one place a disabled button is right, because the fix is elsewhere |
| **Partial** | Header total resolved, teacher cards still skeleton |
| **Error 404** | Full-page not-found + back link |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Back | `Quay lại danh sách kỳ lương` |
| Total label | `TỔNG CHI` |
| Actions | `Chốt kỳ lương` · `Đánh dấu đã trả` |
| Paid text | `Đã trả lương ngày {date}` |
| Finalize body | `Kỳ lương sẽ được chốt ở mức {total} và không thể chỉnh sửa sau đó.` |
| Pay body | `Xác nhận đã thanh toán {total} cho {n} giáo viên. Các buổi học trong kỳ sẽ chuyển sang trạng thái đã trả.` |
| Breakdown columns | `Ngày` · `Lớp` · `Thời lượng` · `Thành tiền` |
| Empty | `Không có buổi học được duyệt trong kỳ này` / `Không thể chốt kỳ lương rỗng.` |
| Toasts | `Đã chốt kỳ lương` · `Đã đánh dấu đã trả lương` |

## 9. Interactions

- Teacher card expand/collapse, 200ms height transition, all collapsed by default
- Confirming an action updates the status pill and swaps the action bar in place — no navigation
- Below 768px: header figures stack; breakdown tables become card lists

## 10. Constraints — do NOT

- Do not allow editing any amount, rate or session on this page
- Do not show `Chốt kỳ lương` once the period is finalized or paid — hide it
- Do not use a bare `Xác nhận?` in either modal
- Do not show minutes in `Thời lượng` for a per-session teacher
- Do not add an "unfinalize" or "revert to draft" action
