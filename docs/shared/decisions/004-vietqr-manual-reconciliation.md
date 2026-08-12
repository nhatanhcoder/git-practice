# ADR-004: VietQR + Manual Reconciliation for Tuition Payments

**Date**: 2026-07  
**Status**: Accepted  
**Deciders**: Team

---

## Context

The platform needs a way for students to pay tuition. The options were: an automated payment gateway (Stripe, MoMo, VNPay), VietQR with manual reconciliation, or cash.

## Decision

**VietQR + manual reconciliation by an admin:**
1. Admin creates a `StudentInvoice` with a `totalAmount`
2. Student views the invoice, scans the QR code → makes a bank transfer
3. Admin confirms the money arrived → records a `TuitionPayment` manually
4. Invoice status: `unpaid → partially_paid → paid`

## Consequences

**Positive:**
- Zero payment gateway fees (saves 1–3% per transaction)
- No complex SDK integration required
- Appropriate at small scale (< 50 students)
- VietQR is supported by most Vietnamese banks

**Negative:**
- The admin has to reconcile by hand → time-consuming as the platform scales
- No webhook for automatic confirmation
- Easy to mix up payments if the transfer memo is not written clearly

## Upgrade Path

Beyond ~100 students: integrate a **Sepay webhook** or **MoMo Business** to automate reconciliation.

## Alternatives Considered

| Option | Why it was not chosen |
|--------|-----------------|
| Stripe | No VND support, high fees, complex KYC in Vietnam |
| MoMo SDK | Requires a business registration, per-transaction fees |
| VNPay | Complex integration, setup fees |
