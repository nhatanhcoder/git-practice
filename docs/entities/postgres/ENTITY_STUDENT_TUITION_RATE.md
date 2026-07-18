# ENTITY_STUDENT_TUITION_RATE

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| studentId | uuid | no | FK → User (role=student) |
| rateAmount | Decimal(10,2) | no | Monthly tuition amount in VND |
| billingCycle | enum | no | `monthly` (expandable later) |
| effectiveFrom | Date | no | Rate valid from this date |
| effectiveTo | Date | yes | Null = currently active rate |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| student | many-to-one | → User |
| StudentInvoice[] | one-to-many | Invoices generated using this rate |

## Business Rules

- Set exclusively by Admin (A-INV-1)
- To update rate: set `effectiveTo` on current, create new with new `effectiveFrom`
- Active rate = where `effectiveTo IS NULL` or `effectiveTo > today`
- System uses active rate as default `totalAmount` when Admin creates a StudentInvoice
- Tuition model (per-class / monthly flat / package) must be agreed before Sprint 7
