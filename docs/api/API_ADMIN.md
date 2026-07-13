# 🔌 API Admin

> Endpoints dành riêng cho role Admin.  
> Conventions: [API_CONVENTIONS.md](./API_CONVENTIONS.md)  
> Permissions: [PERMISSIONS_ADMIN.md](../actors/admin/PERMISSIONS_ADMIN.md)

All routes require: `Authorization: Bearer <token>` + `role=admin`

---

## User Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/users` | List all users (filter: role, status, search) |
| GET | `/api/v1/admin/users/:id` | Get user detail |
| PATCH | `/api/v1/admin/users/:id/approve` | Approve pending user |
| PATCH | `/api/v1/admin/users/:id/suspend` | Suspend active user |
| PATCH | `/api/v1/admin/users/:id/activate` | Reactivate suspended user |

---

## Finance — Payroll

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/sessions/pending` | List sessions pending approval |
| PATCH | `/api/v1/admin/sessions/:id/approve` | Approve session |
| PATCH | `/api/v1/admin/sessions/:id/reject` | Reject session with reason |
| POST | `/api/v1/admin/payroll` | Create PayrollPeriod (draft) |
| GET | `/api/v1/admin/payroll` | List payroll periods |
| PATCH | `/api/v1/admin/payroll/:id/finalize` | Finalize payroll |
| PATCH | `/api/v1/admin/payroll/:id/pay` | Mark as paid |
| POST | `/api/v1/admin/pay-rates` | Set teacher pay rate |

---

## Finance — Invoicing

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/admin/tuition-rates` | Set student tuition rate |
| POST | `/api/v1/admin/invoices` | Create student invoice |
| GET | `/api/v1/admin/invoices` | List all invoices |
| GET | `/api/v1/admin/invoices/:id` | Get invoice detail |
| PATCH | `/api/v1/admin/invoices/:id/void` | Void invoice |
| POST | `/api/v1/admin/invoices/:id/payments` | Record payment |

---

## Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/dashboard/stats` | User stats, financial summary |

---

## Liên quan

- [FEATURES_ADMIN.md](../actors/admin/FEATURES_ADMIN.md)
- [FLOW_PAYROLL_CYCLE.md](../flows/FLOW_PAYROLL_CYCLE.md)
- [FLOW_TUITION_VIETQR.md](../flows/FLOW_TUITION_VIETQR.md)
