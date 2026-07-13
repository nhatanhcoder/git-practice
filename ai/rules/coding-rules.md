# AI Coding Rules — HSK Learning Platform

> Rules specific to AI tool behavior on this repo.
> General coding conventions: docs/shared/CONVENTIONS.md (read that first).

---

## CRITICAL: Always Read RBAC Before Modifying Routes

Before adding or changing any route or guard:
1. Read `docs/shared/RBAC_MATRIX.md`
2. Check `docs/actors/<role>/PERMISSIONS_<ROLE>.md`
3. Verify ownership checks in service layer (not just role guards)

## Database Rules

- PostgreSQL = Prisma. Never raw SQL unless profiling shows necessity.
- MongoDB = Mongoose. Keep schemas in `src/mongodb/schemas/`
- Cross-DB transactions are NOT possible. Design flows to tolerate partial failure.
- `questionIds` in Assignment = MongoDB ObjectId strings stored as JSON array in Postgres.

## API Rules

- All responses follow the envelope format in `docs/api/API_CONVENTIONS.md`
- Error codes come from `docs/api/API_ERROR_CODES.md` — never invent new codes
- All DateTime = UTC ISO 8601

## Auth Rules

- Access token stored in Zustand (memory only, never localStorage)
- Refresh token in httpOnly cookie
- On 401: auto-call `/auth/refresh` once, then redirect to login

## Testing Rules

- Every new service method = unit test
- Every new API route = integration test
- See `docs/testing/TEST_STRATEGY.md` for tool config

## File Naming

- NestJS modules: `<feature>.module.ts`, `<feature>.service.ts`, `<feature>.controller.ts`
- DTOs: `create-<entity>.dto.ts`, `update-<entity>.dto.ts`
- Mongoose schemas: `<entity>.schema.ts` in `src/mongodb/schemas/`
