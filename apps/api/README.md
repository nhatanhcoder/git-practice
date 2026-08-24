# apps/api — database layer

PostgreSQL runs locally in Docker. MongoDB runs on Atlas. This app currently
contains the database wiring and a health endpoint, nothing else — no auth, no
business endpoints. That is intentional; see "What is deliberately missing".

## First run

From the repo root:

```powershell
Copy-Item .env.example .env     # then edit MONGODB_URI with your Atlas details
docker compose up -d            # PostgreSQL on localhost:5432
pnpm install
pnpm --filter api db:migrate    # creates the users table
pnpm --filter api db:seed       # 8 test accounts
pnpm --filter api db:check      # verifies BOTH databases
```

`db:check` exits 0 only when Postgres and Atlas both answer. Run it first
whenever something looks broken — it names the likely cause instead of printing
a driver stack trace.

Then:

```powershell
pnpm --filter api dev
curl http://localhost:3001/api/health
```

## Seed accounts

All use the password `Password123!`.

| Email | Role | Status | Why it exists |
|---|---|---|---|
| `admin@hsk.local` | admin | active | primary admin |
| `admin2@hsk.local` | admin | active | register's notification fan-out must be a bulk insert, not a loop |
| `teacher@hsk.local` | teacher | active | happy path |
| `teacher.pending@hsk.local` | teacher | pending | login must reject |
| `student@hsk.local` | student | active | happy path |
| `student.suspended@hsk.local` | student | suspended | every JWT must be rejected with 401 |
| `never.logged.in@hsk.local` | student | active | `lastLoginAt = null` — INV-AUTH-24 |
| `MiXeD.CaSe@HSK.Local` | student | active | email case-insensitivity |

## Decisions taken here

Two questions had to be answered to write a migration at all. Both are cheap to
reverse **now** and expensive once real data exists.

**C1 — `nickname`, not `fullName`.** Chosen 2026-08-20, matching
`ENTITY_USER.md` and `_FACTS.md`. `API_AUTH.md`, `API_ERROR_CODES.md` and the FE
register/profile forms still say `fullName` and have to be brought in line.

**Email uniqueness — `citext`.** `01-auth.md` §12 listed three options. The
column type is case-insensitive, so uniqueness is enforced by PostgreSQL and no
service, script or manual `INSERT` can bypass it. Costs one
`CREATE EXTENSION citext` in the migration; Supabase supports it.

The migration also adds four `CHECK` constraints for rules that `ENTITY_USER.md`
states as prose: HSK range 1–9, `hskLevelGoal` for students only, `bio` for
teachers only, `nickname` not blank when present. Prisma cannot express these and
its diff engine leaves them alone.

## What is deliberately missing

**`RefreshToken`.** `01-auth.md` §12 says *"No coding before the table is
locked"* — it has no ENTITY spec, and three of its columns (`familyId`,
`replacedById`, `revokedReason`) are marked *proposed* by the spec itself.

**Everything else.** Classes and enrollment are blocked by SCOPE-01; payroll and
billing by API-002 (two conflicting rate-reading formulas) and by the money
representation question, which ADR-010 has never actually been asked. Writing
those tables now would mean inventing a schema no document authorises.

`docs/shared/DATABASE_SCHEMA.md` does contain models for all of them, but it is
dated 2026-07-10 and contradicts the accepted `01-auth.md` on three points
(`cuid` vs `uuid`, `fullName` vs `nickname`, `preferredLanguage` vs
`bio`/`lastLoginAt`). It was not used as a source.

## Resetting

```powershell
pnpm --filter api db:reset      # drop, re-migrate, re-seed
docker compose down -v          # nuclear: also deletes the volume
```
