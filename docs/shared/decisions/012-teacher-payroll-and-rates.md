# ADR-012: Teacher Pay Rates & Payroll Period Lifecycle

**Status**: Accepted  
**Date**: 2026-09-05  
**Applies to**: `TeacherPayRate`, `PayrollPeriod`, `ClassSession`  
**Related**: API-003, Q-PAY-1, Q-PAY-3, Q-PAY-6, Q-PAY-9, `05-payroll.md`

---

## Context

The teacher compensation pipeline manages rate setting, approved session collection, monthly payroll computation, and disbursement tracking.
Key operational ambiguities required settlement:
1. **Pay Rate Basis (Q-PAY-9)**: Whether rates should support monthly fixed salaries or session/hourly rates.
2. **Timezone & Period Boundaries (Q-PAY-1)**: `ClassSession.actualStart` is UTC DateTime, whereas classes run on Vietnam local time (UTC+7). Anchoring collection on UTC could shift early morning classes into the previous month.
3. **Draft Period Cancellation (API-003 / Q-PAY-6)**: Grouping approved sessions into a draft `PayrollPeriod` sets `payrollPeriodId`. If an admin creates a draft period by mistake, there was no endpoint to cancel it, permanently locking the assigned sessions from any future payroll period.
4. **Period Overlap (Q-PAY-3)**: Sessions must belong to exactly one payroll period without duplicate disbursements.

---

## Decision

1. **Dual-Mode Rates**: `TeacherPayRate.rateType` strictly supports `per_session` and `per_hour`. `fixed_monthly` is excluded from the system domain.
2. **Hourly Billing Precision**: Hourly pay is calculated as `hours = minutes / 60` using exact durations. Sessions missing `actualStart` or `actualEnd` fail period generation outright (`PAYROLL_SESSION_HOURLY_MISSING_TIME` / 400) per INV-PAYROLL-17, preventing silent zero-payment errors.
3. **Session Collection & Timezone Anchor**: Session aggregation queries anchor on `ClassSession.scheduledDate` (stored as the local Vietnam Date, UTC+7), using a closed interval `[periodStart, periodEnd]`.
4. **Cancellation Endpoint for Draft Periods (Resolving API-003)**:
   - Provide `DELETE /api/v1/admin/payroll/:id`.
   - Allowed **only** when `PayrollPeriod.status = 'draft'`.
   - Executed within a single database transaction:
     ```sql
     UPDATE "ClassSession" SET "payrollPeriodId" = NULL WHERE "payrollPeriodId" = :periodId;
     DELETE FROM "PayrollPeriod" WHERE id = :periodId;
     ```
   - Attempting to delete a `finalized` or `paid` period is rejected with 409 (`PAYROLL_PERIOD_FINALIZED`).
5. **Overlap Prevention**: Enforce that a teacher cannot have overlapping payroll periods via database constraints and pre-creation queries: `WHERE teacherId = :teacherId AND periodStart <= :end AND periodEnd >= :start`.

---

## Consequences

**Positive:**
- Closes API-003: Administrative mistakes in draft payroll creation are cleanly recoverable without database surgery.
- Eliminates timezone boundary drift for sessions near month boundaries.
- Guarantees financial integrity: sessions can never be paid twice across periods.

**Negative / Trade-offs:**
- Requires transactional rollback tests and strict state validation on `DELETE /admin/payroll/:id`.
