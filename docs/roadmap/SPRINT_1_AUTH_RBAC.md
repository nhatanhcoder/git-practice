# Sprint 1 — Auth & RBAC

**Duration**: 2 weeks  
**Goal**: Users can register, login, and be approved by admin. Role-based access enforced.

---

## Deliverables

- [ ] `POST /auth/register` (teacher + student)
- [ ] `POST /auth/login` → JWT access + refresh cookie
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/logout`
- [ ] `GET /auth/me`
- [ ] Admin: list users, approve, suspend
- [ ] NestJS `RolesGuard` + `@Roles()` decorator
- [ ] Ownership guard middleware
- [ ] Notification: `account_approved`, `account_suspended`

## Dependencies

- Supabase PostgreSQL setup
- Prisma schema: User, Notification
- JWT secrets in `.env`

## Acceptance Criteria

- Student registers → status=pending → admin approves → student can login
- Suspended user gets 403 on all protected routes
- Refresh token rotates on each use
