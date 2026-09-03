## [2026-09-03] — Local database setup, two API fixes, ENVIRONMENT_SETUP rewrite — Claude Code

**Context**: the owner asked to be walked through setting up the database. Two other agents
(`gemini` on Student UI, `codex` on the landing page) were working **in the same checkout**
at the time, so everything below stays inside the `claude` lane — `apps/api/**`, `docs/**`,
`ai/**` — and nothing was staged with `git add -A`.

**Done — the setup itself** (all verified, not narrated):
- Found `.env` was the pre-PR-#12 version: Postgres `localhost:5433/hsk`, Mongo
  `localhost:27018`. It was also the only surviving copy of the auth block that `.env.example`
  lost (`API-005`). Merged rather than overwritten; old file kept outside the repo.
- Docker Desktop was not running, and once started, two containers from a **2026-08-24 version
  of `docker-compose.yml`** auto-resumed under `restart: unless-stopped` — `hsk-postgres` on
  5433 and an `hsk-mongo` on 27018 that the current compose file no longer defines. Both were
  verified empty (no tables; only `admin`/`config`/`local` in Mongo) before the owner approved
  removing them. Compose then built `hsk-postgres` cleanly on 5432 with database `hsk_dev`.
- Migration `20260820000000_init_users` applied with `db:deploy` (not `migrate dev`, which
  prompts). Seeded 8 users.
- MongoDB is the owner's Atlas cluster. **The connection string they supplied had no database
  name** — it ended `/?ssl=true…`, which connects successfully but to `test`, so every
  collection would have landed in the wrong database. `/hsk_dev` inserted before the `?`.
- `pnpm --filter api db:check` → both OK. API boots; `GET /api/health` returns
  `{"status":"ok","databases":{"postgres":{"up":true},"mongodb":{"up":true}}}`.

**Two real bugs, fixed in `93d23db`** — recorded as `API-009`:
`tsconfig` compiles `scripts/` and `prisma/` alongside `src/`, so the emitted layout is
`dist/src/`, one level deeper than two paths assumed. `envFilePath` resolved to `apps/.env`
and the app died on *"MONGODB_URI is missing"* with a correct `.env` at the root; `"start"`
pointed at `dist/main.js`, which has never existed. The `db:*` scripts hid this because they
all wrap themselves in `dotenv -e ../../.env`.

**One bug left open on purpose — `API-008`**: `main.ts` hardcodes `setGlobalPrefix('api')`
while `.env` declares `API_PREFIX="api/v1"`, `NEXT_PUBLIC_API_URL` points at `/api/v1`, and
every path in `docs/api/**` is `/api/v1/...`. `API_PREFIX` is read by nothing. The first real
FE call will 404. Not fixed here because the version segment is an API-contract decision, not
a setup detail.

**Docs — `docs/shared/ENVIRONMENT_SETUP.md` §4–§6 rewritten.** The old §4 printed a
`docker-compose.yml` that **does not exist in this repo** (service `postgres`, database
`hsk_platform`, plus a `mongo` service), which would have produced a stack contradicting the
real file. §5 said to `cd apps/api` and call `prisma` directly — that cannot see the root
`.env` — and never mentioned `db:check`, the one command that names the cause instead of
printing a driver stack trace. §6 named a script that does not exist (`start:dev`) and
promised a Swagger UI that `main.ts` does not register. All three replaced with what was
actually run, including the two Atlas URI traps and the seed-account table. `DOC-009` updated
from Open to mostly-resolved with the remaining scope named.

**Not done, and why**:
- `ai/PROGRESS.md` has **uncommitted edits by another agent** right now, so it was not
  touched. The line for this work still needs adding once that settles.
- `.env.example` is missing the auth block (`API-005`), and the obvious fix is to copy it from
  the owner's `.env`. Left alone: `working-rules.md` says do not touch auth until the block is
  agreed, and `.env.example` is a frozen root config under `multi-agent-workflow.md` §2.
- The duplicate `## 7` headings in `ENVIRONMENT_SETUP.md` and the Supabase-vs-Cloudinary split
  are `CR-3` — picking a side there needs the owner.

**Next steps**:
- Decide `API-008` before any FE→API call is written.
- Add the PROGRESS line once the other agents' edits land.
