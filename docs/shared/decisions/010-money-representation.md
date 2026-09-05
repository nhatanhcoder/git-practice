# ADR-010: Money Representation in VND

**Status**: Accepted  
**Date**: 2026-09-05  
**Applies to**: `TeacherPayRate`, `PayrollPeriod`, `StudentTuitionRate`, `StudentInvoice`, `TuitionPayment`  
**Related**: Q-BILL-1, Cases R2, R5, R7 in `06-billing.md` §15, `05-payroll.md` §15

---

## Context

The system processes financial transactions for teacher payroll and student tuition in Vietnamese Dong (VND).
Three architectural challenges existed in the initial specifications:
1. **Subunit absence**: VND has no minor units (no cents, hào, or xu). Permitting decimal fractions allowed fractional residues (e.g. `2,500,000 / 3 = 833,333.33 × 3 = 2,499,999.99` leaving a `0.01đ` residue that cannot be paid in cash, keeping invoices permanently in `partially_paid` state — Case R2).
2. **Column scale asymmetry**: `TuitionPayment.amount` was typed `Decimal(10,2)` (cap ~99,999,999.99 VND), while `StudentInvoice.totalAmount` was `Decimal(12,2)` (cap ~9,999,999,999.99 VND). An invoice over 100 million VND could not be paid in a single payment without triggering a PostgreSQL numeric overflow (Case R7).
3. **Serialization precision loss**: Raw `Prisma.Decimal` instances are `Decimal.js` objects that serialize into JSON as `{ "s": 1, "e": 6, "d": [2500000] }` unless explicitly transformed, and using JavaScript native `Number` or `parseFloat` on financial paths introduces floating-point drift (Case R5).

---

## Decision

1. **Uniform Column Scale**: Standardize all monetary columns across PostgreSQL tables to `Decimal(12, 2)`:
   - `TeacherPayRate.rateAmount`
   - `PayrollPeriod.totalAmount`
   - `StudentTuitionRate.rateAmount`
   - `StudentInvoice.totalAmount`
   - `StudentInvoice.paidAmount`
   - `TuitionPayment.amount`
2. **Integer VND Enforcement**: Monetary amounts are whole VND values. PostgreSQL schema enforces `CHECK (col = trunc(col))` where appropriate, and API DTO validation rejects fractional subunits (> 0 decimal places or fractional values).
3. **String Serialization over HTTP**: Every monetary field returned over the API envelope is serialized as a string (e.g. `"2500000.00"` or `"2500000"`), never a raw Decimal object and never a floating-point number.
4. **Zero Float Arithmetic**: All arithmetic in services uses `Prisma.Decimal` (or `Decimal.js`) methods (`.add()`, `.sub()`, `.mul()`, `.dividedToIntegerBy()`). JavaScript primitive `Number` arithmetic on monetary variables is strictly prohibited.

---

## Consequences

**Positive:**
- Eliminates the scale mismatch: single payments up to ~10 billion VND can be recorded cleanly without overflow.
- Prevents fractional residues and rounding dead-ends in invoice reconciliation.
- Consistent API contracts across Web frontend and API backend.

**Negative / Trade-offs:**
- Requires serialization interceptor in NestJS to ensure `Prisma.Decimal` fields are converted to string format uniformly.
