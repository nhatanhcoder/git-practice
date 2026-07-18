# ENTITY_TEACHER_PAY_RATE

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| teacherId | uuid | no | FK → User (role=teacher) |
| rateType | enum | no | `per_session` / `per_hour` |
| rateAmount | Decimal(10,2) | no | Amount in VND |
| effectiveFrom | Date | no | Rate valid from this date |
| effectiveTo | Date | yes | Null = currently active rate |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| teacher | many-to-one | → User |

## Business Rules

- Set exclusively by Admin (A-PAY-1)
- To update rate: set `effectiveTo` on current, create new record with new `effectiveFrom`
- Active rate = where `effectiveTo IS NULL` or `effectiveTo > today`
- Used when calculating PayrollPeriod totals: sum of (approved sessions × applicable rate)
- `rateType = per_session`: one rate amount per approved session
- `rateType = per_hour`: rate × actual hours (`actualEnd - actualStart`)
