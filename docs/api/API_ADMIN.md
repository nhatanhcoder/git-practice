# 🔌 API Admin

> Endpoints reserved for the Admin role.  
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

## Learning Catalog — moderation

> Added 2026-09-19 with [ADR-017](../shared/decisions/017-teacher-authored-learning-catalog.md).
> Module spec: [09-learning-catalog-moderation.md](./modules/09-learning-catalog-moderation.md).
> Admin **reviews** what teachers author — it never writes content. Approving a path is the single
> gate that lets its lessons reach students, so the per-unit unpublish below is what keeps that
> one-time gate honest (ADR-017 §2).
> The `LEARNING_PATH_*` codes are *proposed, not agreed* in `API_ERROR_CODES.md`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/learning-paths` | List every path (`?status=&teacherId=&page=`) |
| GET | `/api/v1/admin/learning-paths/:pathId` | Path detail + units + moderation audit |
| PATCH | `/api/v1/admin/learning-paths/:pathId/approve` | Approve (`pending_review` → `approved`) |
| PATCH | `/api/v1/admin/learning-paths/:pathId/reject` | Reject with `rejectionReason` (required, 10–2000 chars) |
| PATCH | `/api/v1/admin/learning-paths/:pathId/suspend` | Hide an approved path (`approved` → `suspended`) |
| PATCH | `/api/v1/admin/learning-paths/:pathId/restore` | Restore (`suspended` → `approved`) |
| GET | `/api/v1/admin/learning-units` | List published units across every path (`?teacherId=&pathId=&page=`) |
| PATCH | `/api/v1/admin/learning-units/:unitId/unpublish` | Remove a published unit — works even while its path stays `approved` |

**Rules that are not negotiable** (full list in the module spec §4):

- Every transition is an **atomic conditional update** on the source status. Two admins approving
  at once produce exactly one `200` and one `409`, and exactly one notification.
- `approve` requires the path to hold **at least one unit** — re-checked at approval time, not
  trusted from submission.
- Admin can **unpublish any published unit**, including one a teacher published after the path was
  approved. That is the compensating control for approving a path only once.
- `suspend` / `unpublish` **delete nothing**: `words` survive, `user_learning_progress` survives,
  and `restore` shows students exactly the units that were published before.
- Admin has no authoring right: no endpoint here creates, edits or deletes content or path
  metadata.

---

## ⛔ Referenced by FE contracts, not yet defined

These paths appear in `docs/front-end-design-docs/` (contracts + specs) but had no
definition anywhere in `docs/api/`. They are listed here so the FE and BE lanes stop
disagreeing about whether they exist. **Shape is proposed, not agreed** — a BE owner
must confirm each row before Sprint 3.

| Method | Path | Needed by | Blocked on |
|--------|------|-----------|------------|
| GET | `/api/v1/admin/payroll/:id` | `/admin/payroll/[periodId]` — the whole finalize path | period boundary undecided |
| GET | `/api/v1/admin/pay-rates` | `/admin/pay-rates` list + history | pay-rate unit basis undecided |
| GET | `/api/v1/admin/tuition-rates` | `/admin/tuition-rates` list + history | tuition model undecided |
| GET | `/api/v1/admin/invoices/summary` | `/admin/invoices` collection-summary header | — |
| POST | `/api/v1/admin/invoices/batch` | `/admin/invoices/generate` step 3 | partial-failure semantics |
| POST | `/api/v1/admin/invoices/batch/preview` | `/admin/invoices/generate` step 2 (dry run) | — |
| GET | `/api/v1/admin/monitoring/gemini` | `/admin/monitoring` — the entire screen | Gemini key model undecided |

Both rate endpoints are read-only history views over append-only tables
(see [ADR 008](../shared/decisions/008-append-only-rates.md)) — no PATCH, no DELETE.

---

## Related

- [FEATURES_ADMIN.md](../actors/admin/FEATURES_ADMIN.md)
- [FLOW_PAYROLL_CYCLE.md](../flows/FLOW_PAYROLL_CYCLE.md)
- [FLOW_TUITION_VIETQR.md](../flows/FLOW_TUITION_VIETQR.md)
