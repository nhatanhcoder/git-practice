# ENTITY_PAYROLL_PERIOD

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| teacherId | uuid | no | FK → User (role=teacher) |
| periodStart | Date | no | Start of the pay period (e.g. 2026-07-01) |
| periodEnd | Date | no | End of the pay period (e.g. 2026-07-31) |
| status | enum | no | `draft` / `finalized` / `paid` |
| totalSessions | int | no | Count of approved ClassSessions in this period |
| totalAmount | Decimal(12,2) | no | Computed from sessions × applicable rate |
| paidAt | DateTime | yes | Timestamp when Admin marks as paid |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| teacher | many-to-one | → User |
| ClassSession[] | one-to-many | Sessions included in this period (`payrollPeriodId` set on session) |

## Business Rules

- Created by Admin (A-PAY-4) in `draft` status
- System aggregates all `approved` ClassSessions for the teacher in `periodStart..periodEnd`
- `totalAmount` = sum of (session duration or count) × active `TeacherPayRate`
- `draft → finalized`: Admin reviews and confirms amount (A-PAY-5)
- `finalized → paid`: Admin marks after actual bank transfer (A-PAY-6)
- Once `finalized`, sessions linked to this period cannot be modified
- Teacher can view own PayrollPeriods (read-only)
- Fills "monthly payroll" slot in Admin Dashboard after Sprint 7
