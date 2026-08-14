---
role: admin
status: contracted
last_updated: 2026-08-11
related:
  - ./_INDEX.md
  - docs/api/API_ADMIN.md
---

# Admin — UI Flow + API Map

> Screen-to-screen traversal. Every node is a route, every edge is a user action,
> every edge carries the endpoint it fires.
> `⛔` marks an endpoint that does not exist yet in `docs/api/API_ADMIN.md`.

---

## 0. Entry

```
Login
  │  POST /api/v1/auth/login
  ▼
role=admin ──► /admin
```

---

## 1. Dashboard — the hub

```
/admin  Dashboard                          GET /admin/dashboard/stats
│
├── KPI "Chờ duyệt"        ──────────────► /admin/users?status=pending
├── KPI "Buổi chờ duyệt"   ──────────────► /admin/payroll/sessions
├── KPI "Thu tháng này"    ──────────────► /admin/invoices
├── KPI "Chi lương tháng"  ──────────────► /admin/payroll
│
├── Queue row (pending user)    ─────────► /admin/users/[userId]
└── Queue row (pending session) ─────────► /admin/payroll/sessions
```

Dashboard never mutates. Every edge is navigation.

---

## 2. Accounts

```
/admin/users  User List                    GET /admin/users
│
├── Search / Filter ──► Filtered List      GET /admin/users?q=&role=&status=
│
├── Approve    → Confirm      → User List  PATCH /admin/users/:id/approve
├── Suspend    → Reason modal → User List  PATCH /admin/users/:id/suspend
├── Reactivate → Confirm      → User List  PATCH /admin/users/:id/activate
│
└── Click User
    ▼
    /admin/users/[userId]  User Detail     GET /admin/users/:id
    │
    ├── Approve    → Confirm      → User Detail   PATCH /admin/users/:id/approve
    ├── Suspend    → Reason modal → User Detail   PATCH /admin/users/:id/suspend
    ├── Reactivate → Confirm      → User Detail   PATCH /admin/users/:id/activate
    └── Back                      → User List
```

**No `Add User` node.** Registration is self-serve (F1.1); Admin approves, never creates.
**No `Delete` node.** UC-A-001 Alternative leaves reject-behaviour undecided — see
`_INDEX.md` open decision #5. Do not build a delete path until it is settled.
**No `Edit` node.** PERMISSIONS_ADMIN grants read on other profiles, not write.

---

## 3. Billing

```
/admin/tuition-rates  Tuition Rates        ⛔ GET /admin/tuition-rates
│
├── "Thiết lập học phí" → Modal → Submit → Tuition Rates   POST /admin/tuition-rates
└── Click Row           → History Drawer                   ⛔ GET /admin/tuition-rates?studentId=
│
│   (prerequisite: a student needs an active rate before invoicing)
▼
/admin/invoices  Invoice List              GET /admin/invoices
│
├── Period selector ──► Filtered List      GET /admin/invoices?period=&status=
│
├── "Tạo hóa đơn tháng…"
│   ▼
│   /admin/invoices/generate  Generate
│   │
│   ├── Step 1 period      → Step 2 preview   ⛔ invoice preview endpoint
│   ├── Step 2 deselect    → Step 3 confirm
│   └── Step 3 "Chạy"      → Result panel     ⛔ POST /admin/invoices/batch
│       ├── all created    → /admin/invoices
│       └── partial failed → stay on Result, retry failed rows only
│
└── Click Invoice
    ▼
    /admin/invoices/[invoiceId]  Invoice Detail   GET /admin/invoices/:id
    │
    ├── "Ghi nhận thanh toán" → Modal → Submit → Invoice Detail
    │       POST /admin/invoices/:id/payments
    ├── "Hủy hóa đơn" → Confirm + Reason → Invoice Detail
    │       PATCH /admin/invoices/:id/void
    └── Back → Invoice List
```

---

## 4. Payroll

```
/admin/pay-rates  Pay Rates                ⛔ GET /admin/pay-rates
│
├── "Thiết lập mức lương" → Modal → Submit → Pay Rates   POST /admin/pay-rates
└── Click Row             → History Drawer               ⛔ GET /admin/pay-rates?teacherId=
│
│   (prerequisite: a teacher needs a rate before a period means anything)
▼
/admin/payroll/sessions  Session Review     GET /admin/sessions/pending
│
├── Filter (teacher, date) ──► Filtered Queue
│
└── Click Row
    ▼
    Review Drawer  (no route change)
    │
    ├── Approve → Confirm       → Queue, row leaves   PATCH /admin/sessions/:id/approve
    └── Reject  → Reason modal  → Queue, row leaves   PATCH /admin/sessions/:id/reject
│
│   (approved sessions accumulate until a period aggregates them)
▼
/admin/payroll  Payroll Periods            GET /admin/payroll
│
├── "Tạo kỳ lương" → Modal (date range) → Submit → Period Detail
│       POST /admin/payroll
│
└── Click Period
    ▼
    /admin/payroll/[periodId]  Period Detail   ⛔ GET /admin/payroll/:id
    │
    ├── Expand teacher → Breakdown rows  (client-side, no fetch)
    ├── "Chốt kỳ lương" → Confirm (one-way) → Period Detail
    │       PATCH /admin/payroll/:id/finalize
    ├── "Đã trả lương"  → Confirm (one-way) → Period Detail
    │       PATCH /admin/payroll/:id/pay
    └── Back → Payroll Periods
```

---

## 5. Monitoring & Profile

```
/admin/monitoring  Monitoring              ⛔ GET /admin/monitoring/gemini
└── Range selector → refetch                (read-only; no outbound edges)

Header avatar ──► /admin/profile  My Profile
                  ├── Save profile    → toast → stays     PATCH /auth/me
                  ├── Change password → toast → stays     POST /auth/change-password
                  └── Upload avatar   → optimistic        (Supabase Storage)
```

---

## 6. Full transition table

| # | From | Action | To | API | Errors |
|---|---|---|---|---|---|
| 1 | Login | submit | `/admin` | `POST /auth/login` | `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_SUSPENDED` |
| 2 | `/admin` | KPI click | `/admin/users?status=pending` | — | — |
| 3 | `/admin/users` | search | same | `GET /admin/users` | — |
| 4 | `/admin/users` | approve | same | `PATCH /admin/users/:id/approve` | `USER_ALREADY_APPROVED`, `USER_NOT_FOUND` |
| 5 | `/admin/users` | suspend | same | `PATCH /admin/users/:id/suspend` | `USER_NOT_FOUND` |
| 6 | `/admin/users` | reactivate | same | `PATCH /admin/users/:id/activate` | `USER_NOT_FOUND` |
| 7 | `/admin/users` | row click | `/admin/users/[userId]` | `GET /admin/users/:id` | `USER_NOT_FOUND` |
| 8 | `/admin/tuition-rates` | set rate | same | `POST /admin/tuition-rates` | `USER_NOT_FOUND`, `TODO(error-code)` |
| 9 | `/admin/invoices` | generate | `/admin/invoices/generate` | — | — |
| 10 | `…/generate` step 1 | pick period | step 2 | ⛔ preview | — |
| 11 | `…/generate` step 3 | run | result panel | ⛔ `POST /admin/invoices/batch` | `TODO(error-code)` |
| 12 | `/admin/invoices` | row click | `/admin/invoices/[invoiceId]` | `GET /admin/invoices/:id` | `TODO(error-code)` |
| 13 | `…/[invoiceId]` | record payment | same | `POST /admin/invoices/:id/payments` | `TODO(error-code)` |
| 14 | `…/[invoiceId]` | void | same | `PATCH /admin/invoices/:id/void` | `TODO(error-code)` |
| 15 | `/admin/pay-rates` | set rate | same | `POST /admin/pay-rates` | `USER_NOT_FOUND`, `TODO(error-code)` |
| 16 | `/admin/payroll/sessions` | approve | same, row leaves | `PATCH /admin/sessions/:id/approve` | `PAYROLL_SESSION_NOT_FOUND`, `PAYROLL_SESSION_NOT_COMPLETED` |
| 17 | `/admin/payroll/sessions` | reject | same, row leaves | `PATCH /admin/sessions/:id/reject` | `PAYROLL_SESSION_NOT_FOUND` |
| 18 | `/admin/payroll` | create draft | `/admin/payroll/[periodId]` | `POST /admin/payroll` | `PAYROLL_PERIOD_NOT_FOUND` |
| 19 | `…/[periodId]` | finalize | same | `PATCH /admin/payroll/:id/finalize` | `PAYROLL_PERIOD_FINALIZED` |
| 20 | `…/[periodId]` | mark paid | same | `PATCH /admin/payroll/:id/pay` | `PAYROLL_PERIOD_NOT_FOUND` |

---

## 7. Entity state transitions driven by this flow

```
User          pending ──approve──► active ──suspend──► suspended
                                     ▲                     │
                                     └─────activate────────┘

ClassSession  completed_pending ──approve──► approved ──(period paid)──► paid
                     ▲                  │
                     └──reject──► rejected ──teacher resubmits──┘

PayrollPeriod draft ──finalize──► finalized ──pay──► paid
                                   (one-way from here)

StudentInvoice unpaid ──payment < total──► partially_paid ──payment──► paid
                     └──────void──────► void
```

Invoice status is **recomputed server-side** on every payment. The UI renders the
returned status; it must never derive `paid` from `paid >= total` locally.

---

## 8. Endpoints this flow needs that do not exist

| Endpoint | Blocks |
|---|---|
| `GET /api/v1/admin/payroll/:id` | period detail — the entire finalize path |
| `GET /api/v1/admin/pay-rates` | rate list + history |
| `GET /api/v1/admin/tuition-rates` | rate list + history |
| `POST /api/v1/admin/invoices/batch` | batch generation |
| invoice preview endpoint | generate step 2 |
| `GET /api/v1/admin/monitoring/gemini` | monitoring, entirely |
| `INVOICE_*` error codes | every billing transition (13, 14, 11, 12) |
