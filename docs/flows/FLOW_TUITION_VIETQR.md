# 🧾 INVOICE_FLOW.md — Luồng Hóa đơn Học phí

---

## 1. Flow Tổng quan

```
Admin set StudentTuitionRate (học phí/tháng)
           │
           ▼
Admin tạo StudentInvoice cho period
           │
           ▼
StudentInvoice: UNPAID
           │
           │ Student hoặc Admin ghi nhận thanh toán
           ▼
TuitionPayment được tạo
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
// StudentTuitionRate: Học phí áp dụng cho student
// - effectiveFrom: Từ ngày nào áp dụng
// - rateAmount: Số tiền/period (VND)
// - Support thay đổi học phí theo thời gian

// StudentInvoice: Hóa đơn cho 1 kỳ học
// - periodStart, periodEnd: Kỳ học (thường 1 tháng)
// - totalAmount: Tổng phải nộp
// - status: unpaid | partially_paid | paid | void

// TuitionPayment: Mỗi lần thanh toán
// - amount: Số tiền đã trả lần này
// - paymentMethod: cash | bank_transfer | momo | ...
// - transactionReference: Mã giao dịch
```

---

## 3. Student View

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
