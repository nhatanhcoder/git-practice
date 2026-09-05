# ADR-013: Student Tuition Billing, Rates, and Invoicing Lifecycle

**Status**: Accepted  
**Date**: 2026-09-05  
**Applies to**: `StudentTuitionRate`, `StudentInvoice`, `TuitionPayment`  
**Related**: ADR-008, Q-BILL-1, Q-BILL-2, Q-BILL-3, Q-BILL-5, Q-BILL-6, Q-BILL-10, Q-BILL-16, `06-billing.md`

---

## Context

Managing student tuition revenue requires strict financial rules governing tuition rate validity, invoice generation, payment allocation, and voiding.
Several key edge cases needed formal policy:
1. **Tuition Model (Q-BILL-2)**: Whether tuition is charged per-class, per-package, or flat monthly.
2. **Voiding with Payments (Q-BILL-5)**: Voiding an invoice that already contains recorded payments (`paidAmount > 0`) would leave student funds in an unexplainable state without a formal ledger credit or refund.
3. **Overpayment (Q-BILL-6)**: Whether the payment recording endpoint should accept amounts exceeding the invoice balance.
4. **Due Date Default (Q-BILL-10)**: Establishing deterministic defaults when invoice creation omits `dueDate`.
5. **Batch Invoicing Integrity (Q-BILL-3, Q-BILL-16)**: Ensuring the batch creation wizard does not suffer from data drift between the preview step and the batch execution step.

---

## Decision

1. **Flat Monthly Tuition Model**: Tuition rates use `billingCycle = 'monthly'` per student. Changing a tuition rate is append-only per ADR-008; rates are resolved at invoice generation time via:
   ```sql
   SELECT "rateAmount"
   FROM "StudentTuitionRate"
   WHERE "studentId" = :studentId AND "effectiveFrom" <= :periodStart
   ORDER BY "effectiveFrom" DESC
   LIMIT 1;
   ```
2. **Hard Block on Voiding Paid Invoices**:
   - Invoices with `paidAmount > 0` **cannot be voided** via `PATCH /admin/invoices/:id/void`. The request is rejected with `409 INVOICE_VOID_WITH_PAYMENTS_FORBIDDEN`.
   - Invoices with `status = 'paid'` are rejected with `409 INVOICE_ALREADY_PAID`.
   - Only invoices with `paidAmount = 0` and `status = 'unpaid'` may transition to `status = 'void'`.
3. **Hard Block on Overpayment**:
   - Payments must satisfy `0 < amount <= (totalAmount - paidAmount)`.
   - Any payment exceeding the outstanding balance is rejected with `400 INVOICE_PAYMENT_EXCEEDS_TOTAL`.
4. **Default Due Date**: When `dueDate` is omitted in single or batch invoice generation requests, the server defaults to `periodEnd + 10 days`.
5. **Batch Generation with Preview Hash**:
   - `POST /api/v1/admin/invoices/batch/preview` computes applicable tuition rates for all eligible active students and computes a SHA-256 `previewHash` of the student list, period, and rate snapshot.
   - `POST /api/v1/admin/invoices/batch` verifies the supplied `previewHash` matches the current calculation before executing. An invalid or drifted hash is rejected with `409 INVOICE_PREVIEW_HASH_MISMATCH`.
   - Batch creation is transactional (all-or-nothing for selected students).

---

## Consequences

**Positive:**
- Eliminates financial discrepancies and orphaned funds.
- Prevents race conditions and invoice drift between UI wizard steps.
- Strictly protects payment vouchers and invoice status consistency (`paidAmount == SUM(payments)`).

**Negative / Trade-offs:**
- Admin cannot record single payments that exceed an invoice balance (students over-transferring must receive change or record against distinct periods).
