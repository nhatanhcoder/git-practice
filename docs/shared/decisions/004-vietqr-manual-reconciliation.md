# ADR-004: VietQR + Manual Reconciliation cho Thanh toán Học phí

**Date**: 2026-07  
**Status**: Accepted  
**Deciders**: Team

---

## Context

Platform cần cho student thanh toán học phí. Các lựa chọn: cổng thanh toán tự động (Stripe, MoMo, VNPay), VietQR + đối soát tay, hoặc cash.

## Decision

**VietQR + đối soát thủ công bởi admin:**
1. Admin tạo `StudentInvoice` với totalAmount
2. Student xem hóa đơn, quét QR → chuyển khoản ngân hàng
3. Admin xác nhận nhận tiền → ghi `TuitionPayment` thủ công
4. Invoice status: `unpaid → partially_paid → paid`

## Consequences

**Positive:**
- Zero payment gateway fee (tiết kiệm 1-3% mỗi giao dịch)
- Không cần tích hợp SDK phức tạp
- Phù hợp với quy mô nhỏ (< 50 students)
- VietQR được hỗ trợ bởi hầu hết ngân hàng VN

**Negative:**
- Admin phải đối soát thủ công → tốn thời gian khi scale
- Không có webhook xác nhận tự động
- Dễ nhầm lẫn nếu không ghi nội dung chuyển khoản rõ ràng

## Upgrade Path

Khi > 100 students: tích hợp **Sepay webhook** hoặc **MoMo Business** để tự động hóa đối soát.

## Alternatives Considered

| Option | Lý do không chọn |
|--------|-----------------|
| Stripe | Không hỗ trợ VND, phí cao, KYC phức tạp ở VN |
| MoMo SDK | Cần đăng ký business, phí giao dịch |
| VNPay | Phức tạp tích hợp, phí setup |
