# ENTITY_STUDENT_INVOICE

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| studentId | uuid | no | FK → User (role=student) |
| periodStart | Date | no | Start of billing period |
| periodEnd | Date | no | End of billing period |
| totalAmount | Decimal(12,2) | no | Total due for the period |
| paidAmount | Decimal(12,2) | no | Accumulated from TuitionPayment records (default 0) |
| status | enum | no | `unpaid` / `partially_paid` / `paid` / `void` |
| dueDate | Date | no | Payment deadline |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| student | many-to-one | → User |
| TuitionPayment[] | one-to-many | Payments recorded against this invoice |

## Business Rules

- Created by Admin (A-INV-2); `status = unpaid` on creation
- On creation → triggers `new_invoice` Notification to student
- `paidAmount` auto-updated as TuitionPayment records are created
- `status` computed/updated: `paidAmount = 0` → `unpaid`; `0 < paidAmount < totalAmount` → `partially_paid`; `paidAmount >= totalAmount` → `paid`
- `void`: Admin manually cancels; no further payments accepted
- Admin sees all invoices; Student sees only own invoices (S-BILL-1)
- Same table / backend, different query scope per role
