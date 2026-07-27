# AI Coding Rules — HSK Learning Platform

> Rules specific to AI tool behavior on this repo.
> General coding conventions: docs/shared/CONVENTIONS.md (read that first).

---

## MANDATORY: Workflow Order for Every Task

For any task beyond a trivial one-line fix, follow this exact order:

1. **Analyze** — Read the relevant docs (RBAC matrix, entity spec, ADRs, `ai/context/HANDOFF.md`, `ai/PROGRESS.md`) and the current code before writing anything.
2. **Create a plan** — Write a short plan: what will change, which files/modules are affected, edge cases, and any open questions. Present this plan to the user.
3. **Wait for approval** — Do NOT write or edit any code until the user explicitly approves the plan. If the user's request already contains enough detail that no reasonable person would need to ask more, state the plan briefly and proceed — but for anything touching DB schema, auth, RBAC, or payment, always wait for explicit approval regardless.
4. **Begin work** — Implement only after approval. When done, update `ai/PROGRESS.md`, `ai/context/HANDOFF.md`, and `ai/known-issues/KNOWN_ISSUES.md` as needed.

Do not skip straight to writing code just because a request looks simple — step 1–2 still apply, they can just be quick.

---

## CRITICAL: Always Read RBAC Before Modifying Routes

Before adding or changing any route or guard:
1. Read `docs/shared/RBAC_MATRIX.md`
2. Check `docs/actors/<role>/PERMISSIONS_<ROLE>.md`
3. Verify ownership checks in the service layer (not just role guards)

## Database Rules

- PostgreSQL = Prisma. Never raw SQL unless profiling shows it's necessary.
- MongoDB = Mongoose. Keep schemas in `src/mongodb/schemas/`
- Cross-DB transactions are NOT possible. Design flows to tolerate partial failure.
- `questionIds` in Assignment = MongoDB ObjectId strings stored as a JSON array in Postgres.

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
