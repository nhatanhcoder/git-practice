# 🧾 INVOICE_FLOW.md — Tuition Invoice Flow

---

## 1. Flow Overview

```
Admin sets a StudentTuitionRate (tuition per month)
           │
           ▼
Admin creates a StudentInvoice for the period
           │
           ▼
StudentInvoice: UNPAID
           │
           │ The student or admin records a payment
           ▼
A TuitionPayment is created
           │
    ┌──────┴──────┐
    │             │
    │ paid < total│  paid >= total
    │             │
    ▼             ▼
PARTIALLY_PAID   PAID
```

---

## 2. Entities

```typescript
// StudentTuitionRate: the tuition that applies to a student
// - effectiveFrom: the date it takes effect
// - rateAmount: amount per period (VND)
// - Supports tuition changes over time

// StudentInvoice: an invoice for one study period
// - periodStart, periodEnd: the period (usually one month)
// - totalAmount: the total owed
// - status: unpaid | partially_paid | paid | void

// TuitionPayment: one individual payment
// - amount: the amount paid this time
// - paymentMethod: cash | bank_transfer | momo | ...
// - transactionReference: the transaction ID
```

---

## 3. Student View

> Mockups below show the Vietnamese UI as built.

```
Student Dashboard → Hóa đơn
┌──────────────────────────────────────────────────────┐
│ 🧾 Lịch sử học phí                                   │
│                                                       │
│ Tháng 7/2026                         ⚠️ Chưa thanh toán│
│ Học phí: 2,500,000 VND                               │
│ Đã nộp:  1,000,000 VND                               │
│ Còn nợ:  1,500,000 VND               [Xem chi tiết →]│
│                                                       │
│ ─────────────────────────────────────────────────── │
│                                                       │
│ Tháng 6/2026                          ✅ Đã thanh toán │
│ Học phí: 2,500,000 VND                               │
│ Ngày nộp: 05/06/2026 - Chuyển khoản                 │
└──────────────────────────────────────────────────────┘
```

---

## 4. Admin View

```
Admin Dashboard → Invoicing
┌──────────────────────────────────────────────────────┐
│ 📊 Tình trạng học phí tháng 7/2026                   │
│                                                       │
│ Đã thu: 5/8 học sinh (62.5%)                         │
│ Tổng thu: 12,500,000 VND                             │
│ Còn nợ:  7,500,000 VND                               │
│                                                       │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Nguyễn Văn A    2,500,000đ  ✅ Đã nộp          │ │
│ │ Trần Thị B      2,500,000đ  ⚠️ Còn nợ 1.5tr   │ │
│ │ Lê Văn C        2,500,000đ  ❌ Chưa nộp        │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ [+ Tạo hóa đơn tháng 8]  [Ghi nhận thanh toán]      │
└──────────────────────────────────────────────────────┘
```
