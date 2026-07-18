# ENTITY_TUITION_PAYMENT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| invoiceId | uuid | no | FK → StudentInvoice |
| amount | Decimal(10,2) | no | Amount paid in this transaction |
| paidAt | DateTime | no | Actual payment timestamp |
| paymentMethod | varchar(50) | no | e.g. `bank_transfer`, `cash`, `vietqr` |
| transactionReference | varchar(200) | yes | Bank ref / VietQR transaction ID |
| recordedBy | uuid | no | FK → User (Admin who recorded this payment) |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| invoice | many-to-one | → StudentInvoice |
| recordedBy | many-to-one | → User (admin) |

## Business Rules

- Created by Admin (A-INV-3) when payment is received
- After creation: `StudentInvoice.paidAmount += amount`; `status` recomputed
- `amount` must be > 0 and ≤ (`invoice.totalAmount - invoice.paidAmount`)
- `transactionReference` used to match against VietQR bank statements
- Immutable once created — no edit/delete; Admin must void the invoice if correction needed
