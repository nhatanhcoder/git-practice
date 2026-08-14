# Multi-Agent Workflow — Codex + Claude in Parallel

> Read this **before** starting work whenever more than one AI agent is active on this repo.
> Companion to `ai/rules/working-rules.md` (that file = how to code; this file = how to not collide).
>
> Agent IDs used throughout: **`claude`** (Claude Code) and **`codex`** (OpenAI Codex).
> If a third agent joins (Antigravity, Cursor), give it a lowercase ID and apply the same rules.

---

## 0. The one-paragraph version

Two agents in one repo fail for exactly three reasons: (1) they edit the same file at
the same time, (2) they both grab the same task, (3) they disagree about the API contract
between backend and frontend. This document kills all three with: **static lane ownership**,
**a claim protocol in `ai/PROGRESS.md`**, and **contract-first development**. Everything
else here is detail.

---

## 1. Roles — who does what

The split is by **strength**, not by convenience.

| | **Claude** | **Codex** |
|---|---|---|
| Primary role | Architect / planner / reviewer | Implementer / test writer |
| Owns | Backend: `apps/api/**`, Prisma schema, Mongo schemas, ADRs, `docs/**` | Frontend: `apps/web/**`, UI components, E2E tests |
| Good at | Multi-file reasoning, RBAC/permission logic, docs, cross-cutting refactors, spotting drift between docs and code | Fast mechanical implementation of a well-specified slice, boilerplate, unit tests, repetitive CRUD |
| Should NOT | Write large amounts of boilerplate by hand | Make architecture decisions, invent API contracts, touch the Prisma schema |

**Practical consequence:** Claude writes the spec (plan + types + error codes), Codex builds
against it. When a task is ambiguous, that is a Claude task by definition.

> This mapping is a default, not a law. For a sprint that is 90% frontend, flip the lanes —
> but write the flip into `ai/PROGRESS.md` at the top of the sprint so both agents see it.

---

## 2. Lane ownership — the anti-collision rule

**Only the lane owner writes to a path. No exceptions, no "small fixes" across the line.**

| Path | Owner | Notes |
|---|---|---|
| `apps/api/**` | claude | including DTOs, guards, services |
| `prisma/schema.prisma`, `prisma/migrations/**` | claude | **never** touched by two agents |
| `apps/api/src/mongodb/schemas/**` | claude | |
| `apps/web/**` | codex | pages, components, stores, hooks |
| `packages/types/**` (shared API contract) | **claude writes, codex reads** | see §4 |
| `docs/**`, `ai/rules/**`, `docs/shared/decisions/**` | claude | |
| Root configs (`package.json`, `turbo.json`, `eslint.config.mjs`, `.env.example`) | **frozen** | see below |
| `ai/PROGRESS.md` | shared, line-scoped | see §3 |
| `ai/context/sessions/**` | one file per agent | see §5 |

**Frozen files.** Root configs and `pnpm-workspace.yaml` are edited by **one agent at a time,
never during active parallel work**. If a lane needs a new dependency: add it to the
`## Needs from the other lane` block in `ai/PROGRESS.md` and keep going with a stub. Batch
these and apply them in a merge window (§6).

**If you must cross the line** (e.g. frontend needs a backend field that doesn't exist):
do not edit the other lane. Write a request (§4), stub the value locally, and move on.

---

## 3. Task claiming — never work the same item twice

`ai/PROGRESS.md` is the single source of truth for "who has what". It is cheap to read —
**scan it before picking up anything**, and you do not need to read the other agent's
session notes to stay out of their way.

Claim format, on the checklist line itself:

```
- 🔶 (codex · 2026-08-11) F2.3 Join class
```

Rules:

1. **Claim before you code.** Edit the line to `🔶 (agent · date)`, save, commit that single
   line change immediately (`chore(progress): claim F2.3`). Then start work.
2. **One claim at a time per agent**, unless items are trivially small and in the same file.
3. **Release on finish**: `✅ F2.3 Join class` — drop the agent tag.
4. **Release on abandon**: back to `⬜` plus a one-line note in your session file about why.
5. **Stale claims expire after 24h.** If a `🔶` is older than 24h and its branch has no new
   commits, any agent may take it — but say so in the session file.
6. **Blocked**: `⛔ (codex · 2026-08-11 · waiting on POST /classes/join contract)`.

Add these two blocks at the bottom of `ai/PROGRESS.md` and keep them current:

```markdown
## Needs from the other lane
- [ ] (codex → claude) need `GET /classes/:id/students` to return `hskLevel`
- [ ] (claude → codex) `packages/types` v3 landed — regenerate web API client

## Frozen-file requests (apply in next merge window)
- [ ] (codex) add `@tanstack/react-query` to apps/web
```

---

## 4. Contract-first — the rule that removes most coordination

Backend and frontend do not negotiate at integration time. They negotiate **up front**, once.

For every feature slice, in this order:

1. **claude** writes the contract into `packages/types`: request/response DTO types, error
   codes (from `docs/api/API_ERROR_CODES.md` — never invented), and the envelope shape from
   `docs/api/API_CONVENTIONS.md`. Commit and push it **before** either lane implements.
2. **claude** announces it: tick a line under `## Needs from the other lane`.
3. Both lanes now build against those types independently. **codex** mocks the endpoint
   (MSW or a local fixture) and never waits for the real API to exist.
4. Integration is then a type-check, not a discovery process.

**Contract changes after step 1** are a small event, not a silent edit: claude bumps the
type, adds a line to `## Needs from the other lane`, and notes it in the session file.
Never change a shipped contract shape inside an unrelated commit.

---

## 5. Git — separate working directories, always

Two agents in **one working directory will clobber each other's uncommitted edits.** This is
the single most common way parallel agents destroy work. Use one of:

**Preferred — git worktrees** (one checkout per agent, shared history, no clone bloat):

```bash
git worktree add ../Real-claude  -b feat/s1-api-auth
git worktree add ../Real-codex   -b feat/s1-web-auth
```

Point Claude Code at `../Real-claude` and Codex at `../Real-codex`.

> ⚠️ **The `../` is not a style preference — it is the rule. A worktree must live OUTSIDE
> the repository directory.**
>
> A worktree created *inside* the repo (e.g. `.claude/worktrees/<name>`) checks out a second
> full copy of `docs/` and `ai/` on disk. Every doc then exists twice, and:
>
> - grep, file search and AI context all return **two versions of every file**, one of them stale
> - an agent can silently read the outdated copy and "fix" something that was already fixed
> - the worktree's `.git` file holds an absolute host path, so git commands run from any other
>   environment (WSL, a mounted share, a container) fail with
>   `fatal: not a git repository: .../worktrees/<name>`
>
> This happened on 2026-08-13: `.claude/worktrees/updatedocs-to-english` duplicated 88 markdown
> files against 118 real ones, and its `ai/skills/*.md` were still the empty 0-byte versions.
>
> If a worktree already exists inside the repo:
>
> ```bash
> git worktree remove .claude/worktrees/<name>     # or: git worktree prune
> git worktree add ../Real-<name> <branch>          # recreate as a SIBLING
> ```
>
> `.claude/` is gitignored, so an inside-repo worktree is never committed — it only ever
> pollutes local search and agent context.

**Branch naming:** `feat/s<sprint>-<lane>-<slice>` → `feat/s1-api-auth`, `feat/s1-web-auth`.

**Rules:**

- Never commit directly to `main`. Every merge to `main` is a PR.
- **Rebase on `main` at least once per work session**, and always before opening a PR.
- Commit small and often — a claimed item should be several commits, not one giant one.
- **Cross-review:** the agent that did *not* write the code reviews the PR. Claude reviews
  Codex's frontend PRs for contract/RBAC correctness; Codex reviews Claude's backend PRs for
  test coverage and obvious defects. A PR merged with zero review is a rule violation.
- Prisma migrations merge to `main` **first**, alone, before any code depending on them.

---

## 6. Merge windows — the only time lanes touch

A **merge window** is a deliberate pause where parallel work stops:

1. Both agents commit and push everything; no uncommitted work anywhere.
2. Both `⛔`/`🔶` claims are noted in `ai/PROGRESS.md`.
3. One agent (default: claude) merges open PRs to `main` in order:
   migrations → shared types → backend → frontend.
4. Frozen-file requests from §3 are applied now, in a single commit.
5. Both agents rebase their worktree on the new `main` and resume.

Run a merge window: at the end of every sprint item that changes a contract, before any
dependency change, and whenever a lane has been diverged from `main` for more than a day.

---

## 7. Updating the shared docs — who writes what, when

The failure mode for docs is **merge conflicts in markdown**. Fix: agents append to
**their own file**, never rewrite a shared narrative file mid-flight.

| File | Who writes | When | How |
|---|---|---|---|
| `ai/PROGRESS.md` | both | at claim, at finish, at block | Edit **only your own lines**. Commit the claim edit on its own. |
| `ai/context/sessions/<YYYY-MM-DD>-<agent>.md` | that agent only | end of every session | Free-form; use the HANDOFF template. Conflict-free by construction. |
| `ai/context/HANDOFF.md` | claude, at merge windows | at merge window | Distil the session files into one entry per §8. Keep max 5 entries. |
| `ai/known-issues/KNOWN_ISSUES.md` | both | on discovery | **Append only.** Prefix IDs by lane: `API-007`, `WEB-003`. Never renumber. |
| `docs/shared/decisions/` (ADR) | claude | when an architecture choice is made | One new file per decision. Never edit an Accepted ADR — supersede it. |
| `ai/AI_CHAT_LOG.md` | human | brainstorm outside an agent | Agents read, don't write. |
| `docs/roadmap/SPRINT_PLAN.md` | claude | sprint boundaries only | |

**Non-negotiable:** update `ai/PROGRESS.md` *immediately* on claim and on finish. Batching
progress updates to end-of-session is what causes duplicated work.

---

## 8. Session-file template

`ai/context/sessions/2026-08-11-codex.md`:

```markdown
## [2026-08-11] — <slice worked on> — codex — branch `feat/s1-web-auth`

**Done**:
-

**In progress** (and why it's unfinished):
-

**Contract/temporary decisions to preserve**:
-

**Needs from the other lane**:
-

**Blocker / needs follow-up**:
-

**Next steps**:
-
```

At a merge window, claude folds these into one `ai/context/HANDOFF.md` entry and the session
files can be deleted (git history keeps them).

---

## 9. Start-of-session checklist (both agents)

1. `git fetch && git rebase origin/main` in your worktree.
2. Read `ai/context/project-brain.md`.
3. Read `ai/PROGRESS.md` — what's claimed, what's in `## Needs from the other lane` for you.
4. Read `ai/context/HANDOFF.md` **only if** continuing unfinished work.
5. Read `ai/rules/working-rules.md` if touching routes / DB / API / auth.
6. Claim an item (§3). Commit the claim.
7. Follow `working-rules.md` §MANDATORY: Analyze → Plan → **Wait for approval** → Work.
8. On finish: tests green, update `PROGRESS.md`, write your session file, open a PR, request
   cross-review.

## 10. End-of-session checklist

- [ ] Everything committed and pushed (no work left only in the worktree)
- [ ] `ai/PROGRESS.md` reflects reality — no stale `🔶` with your name on it
- [ ] Session file written
- [ ] New bugs appended to `KNOWN_ISSUES.md` with a lane-prefixed ID
- [ ] Anything the other lane needs is in `## Needs from the other lane`

---

## 11. Where progress gets recorded — worked example

One item, start to finish. Note that the status write happens **four times**, not once at the end.

| When | File | What you write | Commit? |
|---|---|---|---|
| Picking it up | `ai/PROGRESS.md` | `⬜` → `🔶 (codex · 2026-08-11)` | Yes — alone: `chore(progress): claim F2.3` |
| Hitting a cross-lane need | `ai/PROGRESS.md` → `## Needs from the other lane` | one line, `(codex → claude) …` | Yes — with your next work commit |
| Getting stuck | `ai/PROGRESS.md` | `🔶` → `⛔ (codex · date · reason)` | Yes — alone |
| Finishing | `ai/PROGRESS.md` | `🔶 (codex …)` → `✅` | Yes — in the PR |
| End of session | `ai/context/sessions/<date>-<agent>.md` | full template (§8) | Yes |
| Discovering a bug you won't fix now | `ai/known-issues/KNOWN_ISSUES.md` | append `WEB-004: …` | Yes |
| Merge window only | `ai/context/HANDOFF.md` | claude distils session files into one entry | Yes |

**Why PROGRESS.md claims get their own commit:** it is the file the other agent polls. A claim
buried inside a 40-file feature commit reaches them an hour too late.

**What does NOT go in PROGRESS.md:** reasoning, alternatives considered, debugging notes.
Those go in your session file. `PROGRESS.md` must stay cheap to scan — it is a status board,
not a journal.

---

## 12. Worktree playbook

### Create

```bash
# from the main checkout, once per lane
git fetch origin
git worktree add ../Real-claude -b feat/s1-api-auth origin/main
git worktree add ../Real-codex  -b feat/s1-web-auth origin/main
```

Then point each agent at its own directory. **Never run two agents in the same directory.**

### After creating — each worktree needs its own untracked setup

A worktree shares git history but **not** ignored/untracked files. Every new worktree needs:

```bash
cd ../Real-codex
cp ../Real/.env .env          # .env is gitignored — it does NOT come along
pnpm install                  # each worktree gets its own node_modules
```

Budget for this: a fresh worktree is not usable until `pnpm install` finishes.

### Port allocation — dev servers will collide otherwise

Both lanes running `pnpm dev` at once means two processes fighting for :3000/:3001.
Fix the ports per lane in each worktree's `.env`:

| Lane | API | Web |
|---|---|---|
| claude (`Real-claude`) | 3001 | 3000 |
| codex (`Real-codex`) | 3011 | 3010 |

The frontend lane points `NEXT_PUBLIC_API_URL` at its own API port, or at a mock server.

### Lifecycle

```bash
git worktree list                    # what exists, and is it locked
git worktree remove ../Real-codex    # after the branch is merged
git worktree prune                   # clean up stale entries (deleted dirs)
```

**Rules:**
- **One worktree per lane, not per task.** Reuse the lane worktree by switching branches inside
  it. A worktree per feature means re-running `pnpm install` constantly.
- **Remove a worktree when its branch merges.** Leftover worktrees hold branch locks and
  confuse the next session — you cannot check out a branch that another worktree has.
- **Never nest a worktree inside the main checkout** (e.g. `./worktrees/foo`). Turbo, eslint
  and tsc will walk into it and lint/build the same source twice.
- If `git worktree add` fails with "already checked out", another worktree has that branch —
  run `git worktree list` and remove the stale one.

### ⚠️ This repo is inside OneDrive

`C:\Users\nhata\OneDrive\Máy tính\Real` is a synced folder. OneDrive will try to sync `.git/`
and `node_modules/` — this causes slow installs, file-lock errors mid-build, and can corrupt
git index/lock files while an agent is writing them. Two worktrees doubles the exposure.

**Recommended:** move the repo out of OneDrive, e.g. `C:\dev\Real`, and keep worktrees as
`C:\dev\Real-claude`, `C:\dev\Real-codex`. If it must stay in OneDrive, at minimum exclude
`node_modules` and `.git` from sync, and never let both agents build at the same time.

---

## 13. Known drift to resolve (as of 2026-08-11)

`ai/PROGRESS.md` lists all of Sprint 0 as `⬜ Not started`, but the repo root already contains
`turbo.json`, `pnpm-workspace.yaml`, `eslint.config.mjs`, `.prettierrc`, `.npmrc`,
`.env.example` and a `packages/` directory. **Sprint 0 is partially done and the checklist is
lying.** Before the first parallel session, one agent should verify Sprint 0 item by item
against the actual repo and correct the marks — otherwise both agents will plan against a
false baseline.

**Worse: none of it is committed.** `git status` on `main` shows ~38 changes, including the
entire Sprint 0 scaffold as *untracked*: `package.json`, `turbo.json`, `pnpm-workspace.yaml`,
`packages/`, `eslint.config.mjs`, `.prettierrc`, `.npmrc`, `.env.example`, `.gitignore` itself.
`.idea/` is listed in the new `.gitignore` but is still **tracked** from an earlier commit, so
it shows as modified forever.

Parallel work cannot start from here — a worktree branched off `main` would not contain the
build setup at all. **Step 0, before any parallel session:**

```bash
git rm -r --cached .idea            # stop tracking IDE files now that .gitignore covers them
git add .gitignore                  # commit the ignore rules FIRST
git commit -m "chore: add .gitignore, stop tracking .idea"
git add package.json turbo.json pnpm-workspace.yaml packages/ \
        eslint.config.mjs .prettierrc .prettierignore .npmrc .env.example
git commit -m "chore(s0): turborepo + pnpm workspace + lint/format setup"
git add docs/ ai/ AGENTS.md CLAUDE.md
git commit -m "docs: update specs, ADRs 005/006, multi-agent workflow"
git push origin main
```

Check `.env.example` contains no real credentials before that push. There is also a leftover
locked worktree at `.claude/worktrees/updatedocs-to-english` — `git worktree remove` it (or
`git worktree prune`) once its branch is merged or abandoned.
