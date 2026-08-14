# Multi-Agent Workflow — Codex + Claude in Parallel

> Read this **before** starting work whenever more than one AI agent is active on this repo.
> Companion to `ai/rules/working-rules.md` (that file = how to code; this file = how to not collide).
>
> Agent IDs used throughout: **`claude`** (Claude Code) and **`codex`** (OpenAI Codex).
> If a third agent joins (Antigravity, Cursor), give it a lowercase ID and apply the same rules.

---

## 0. The one-paragraph version

Agents in one repo fail for exactly four reasons: (1) they edit the same file at the same
time, (2) they both grab the same task, (3) they disagree about the API contract between
backend and frontend, (4) their environments disagree about line endings so every merge is
a whole-file conflict. This document kills all four with: **static lane ownership**, **a
claim protocol in `ai/PROGRESS.md`**, **contract-first development**, and **`.gitattributes`**.
Everything else here is detail.

> **§0.1 — Reality gate. Read before trusting anything below.**
> Several mechanisms in this document describe infrastructure that **does not exist yet**.
> Verified 2026-08-14 against the repo:
>
> | Mechanism | Depends on | State |
> |---|---|---|
> | §4 contract-first | `packages/types/` | ❌ missing — `pnpm-workspace.yaml` declares `packages/*`, the directory is not there |
> | §7/§8 session files | `ai/context/sessions/` | ❌ missing — never created, never used |
> | `pnpm dev` / `pnpm build` | `turbo.json` | ❌ missing — root `package.json` calls `turbo run dev`, which fails |
> | lint/format gate | `eslint.config.mjs`, `.prettierrc` | ❌ missing |
> | worktree setup (§12) | `.env.example` | ❌ missing |
> | backend lane | `apps/api/` | ❌ missing — the whole lane has no code |
>
> **A rule that points at a missing file is worse than no rule**: an agent reads it, assumes
> the mechanism is live, and skips the safeguard. Until a row above flips to ✅, treat that
> section as *intent*, not procedure. Create the missing piece the first time you need it,
> then update this table in the same commit.

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
> **A lane flip that is not written down did not happen.** On 2026-08-13 `claude` built
> `/admin/users` and `/admin/users/[userId]` — squarely inside `apps/web/**`, the `codex`
> lane — with no flip recorded. That is the exact failure this table exists to prevent, and
> it took one day to occur.

### 1.1 Third agent — `antigravity`

`antigravity` (Google Antigravity, IDE or CLI) is now installed on this repo. It has **no
standing lane.** Treat it as a *borrowed* agent:

- It may only work on an item that is **explicitly handed to it in `ai/PROGRESS.md`**, using
  the same claim format: `🔶 (antigravity · 2026-08-14)`.
- It **writes to whichever lane that item belongs to**, and only for the duration of that
  item. It never holds a lane between items.
- **It never merges to `main`** and never runs a merge window (§6). That stays with `claude`.
- Its skill discovery is `.agents/skills/**` — see the ownership table in §2.

Any further agent (Cursor, Copilot, Gemini CLI) follows the same borrowed-agent rule. Give it
a lowercase ID and hand it items one at a time. **Do not give a fourth agent a standing lane
without deleting one first** — lanes only prevent collisions while every path has exactly one
owner.

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
| `.gitattributes` | **frozen** | changing it re-normalises every file in the repo — merge window only |
| `.agents/skills/**` | claude | **The canonical and only home for project skills.** Antigravity *reads* them here and never edits them — a skill that rewrites its own definition mid-session is unreviewable. `ai/skills/` was removed 2026-08-14; do not recreate it. |
| `ai/PROGRESS.md` | shared, line-scoped | see §3 |
| `ai/context/sessions/**` | one file per agent | see §7 — **directory does not exist yet, create it on first use** |
| `AGENTS.md`, `CLAUDE.md` | claude | the two must stay in sync — they share one body |

**Frozen files.** Root configs and `pnpm-workspace.yaml` are edited by **one agent at a time,
never during active parallel work**. Note that as of 2026-08-14 most of them do not exist yet
(§0.1) — the first agent to need one **creates it in its own commit, alone**, announces it
under `## Frozen-file requests`, and does not bundle it with feature work. If a lane needs a new dependency: add it to the
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

> ⚠️ **`packages/types/` does not exist yet** (§0.1). Until it does, this section describes
> nothing real, and the two lanes have no shared contract at all — every field name is a
> guess on both sides. Creating it is the single highest-value unblocking task in the repo,
> and it must be `claude`'s first commit of any parallel session.

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

### 5.1 Branch lifecycle — the full loop, including the part everyone forgets

**Naming:** `feat/s<sprint>-<lane>-<slice>` → `feat/s1-api-auth`, `feat/s1-web-auth`.
Non-feature work: `fix/`, `chore/`, `docs/` + the same slice suffix.
Off-sprint work (§ working-rules "Definition of Done") uses `spike/<slice>`.

One item = one branch = one PR. Never reuse a merged branch.

```bash
# 1. START — always from fresh main, never from another feature branch
git fetch origin
git switch -c feat/s1-web-auth origin/main

# 2. CLAIM — before writing code (§3). Its own commit.
#    edit ai/PROGRESS.md: ⬜ → 🔶 (codex · 2026-08-14)
git commit -am "chore(progress): claim F1.2"
git push -u origin feat/s1-web-auth      # push the claim immediately — it is how the
                                          # other agent sees it

# 3. WORK — small commits, conventional prefixes
git commit -am "feat(web): login form + zod schema"

# 4. STAY CURRENT — at least once per session, always before the PR
git fetch origin && git rebase origin/main

# 5. FINISH — release the claim in the same PR
#    edit ai/PROGRESS.md: 🔶 → ✅   (or 🔶 + a mock note — never ✅ for mocked data)
git commit -am "chore(progress): F1.2 done"
git push

# 6. PR — review by an agent that did NOT write it (§5 solo-dev fallback)
gh pr create --fill

# 7. MERGE — and delete the remote branch in the same breath
gh pr merge --squash --delete-branch

# 8. CLEAN UP LOCALLY — THE STEP THAT KEEPS GETTING SKIPPED
git switch main && git pull
git branch -d feat/s1-web-auth           # -d refuses if unmerged. Never force with -D
                                          # unless you are deliberately discarding work
git worktree remove ../Real-codex        # only if the worktree is done with (§12)
git remote prune origin                  # drop refs to branches deleted server-side
```

**Why step 8 is a rule and not housekeeping.** A leftover branch holds a worktree lock, so
`git worktree add` later fails with "already checked out". A leftover *remote* branch makes
`git branch -a` unreadable, and the next agent cannot tell which lane is live. Both cost more
to untangle later than the two seconds they cost now.

**Audit, every merge window:**

```bash
git branch --merged main | grep -v "^\*\| main$"   # merged → safe to delete
git branch -a --no-merged main                       # unmerged → someone must answer for each
```

> **Current debt (2026-08-14):** four branches violate this. Local
> `update-fe-doc-flowmapper`, `worktree-updatedocs-to-english`; remote `ai-docs`,
> `feature/order`, `feature/user`. None follow the naming convention. Delete the merged ones
> and rename anything still live before the first parallel session.

**Rules:**

- Never commit directly to `main`. Every merge to `main` is a PR.
- **Rebase on `main` at least once per work session**, and always before opening a PR.
- Commit small and often — a claimed item should be several commits, not one giant one.
- **Cross-review:** the agent that did *not* write the code reviews the PR. Claude reviews
  Codex's frontend PRs for contract/RBAC correctness; Codex reviews Claude's backend PRs for
  test coverage and obvious defects. A PR merged with zero review is a rule violation.
- **Solo-dev fallback.** One human cannot self-review, and in practice this rule was already
  being skipped — `git log` shows `main` advanced by direct `git merge`, not by PR. Rather
  than keep a rule nobody follows, the minimum bar is: **open the PR, hand the diff to an
  agent that did not write it, paste its findings into the PR, then merge.** Thirty seconds,
  and it still catches contract drift. A review by the authoring agent does not count.
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

`ai/context/sessions/<YYYY-MM-DD>-<agent>.md`, e.g. the 2026-08-11 codex session:

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

### ⚠️ OneDrive — resolved, do not regress

**The repo now lives at `D:\PersonalProject\Real`, outside OneDrive.** Worktrees go at
`D:\PersonalProject\Real-claude`, `D:\PersonalProject\Real-codex`.

Do not move it back, and check periodically that OneDrive has not re-synced a partial copy —
it did exactly that once (see `KNOWN_ISSUES.md` DOC-002), leaving a third stale copy of
`ai/` and `docs/` that greps and AI context both picked up.

The original reason, kept because it explains why this is not negotiable:
`C:\Users\nhata\OneDrive\Máy tính\Real` was a synced folder. OneDrive will try to sync `.git/`
and `node_modules/` — this causes slow installs, file-lock errors mid-build, and can corrupt
git index/lock files while an agent is writing them. Two worktrees doubles the exposure.

**Recommended:** move the repo out of OneDrive, e.g. `C:\dev\Real`, and keep worktrees as
`C:\dev\Real-claude`, `C:\dev\Real-codex`. If it must stay in OneDrive, at minimum exclude
`node_modules` and `.git` from sync, and never let both agents build at the same time.

---

## 13. Known drift — verified 2026-08-14

Re-verify this section at the start of every parallel session and rewrite it. A stale drift
list is how both agents end up planning against a false baseline.

**Resolved since the 2026-08-11 version of this section:**

- Sprint 0 scaffold is committed. `main` is at `b67f089`, `package.json` /
  `pnpm-workspace.yaml` / `pnpm-lock.yaml` are all tracked.
- The inside-repo worktree is gone. `git worktree list` shows one entry, the main checkout.
- `.claude/` is gitignored and absent from disk.

**Still open:**

1. **Sprint 0 is marked `⬜` in `ai/PROGRESS.md` but is roughly half done.** `apps/web` exists
   and builds; `apps/api`, `turbo.json`, eslint/prettier configs and the DB init do not.
   The checklist is still lying, in the other direction from last time.
2. **`turbo.json` is missing while root `package.json` runs `turbo run dev`.** `pnpm dev` and
   `pnpm build` fail at the repo root today. Whoever starts Sprint 0 fixes this first.
3. **`.idea/` is still tracked** even though `.gitignore` covers it, so it shows as modified
   forever. Fix, once, in its own commit:
   `git rm -r --cached .idea && git commit -m "chore: stop tracking .idea"`
4. **~118 files show as modified with no content change** — line endings. See §14. Fix this
   *before* any parallel session; a merge across two environments without it conflicts on
   every file.
5. **`.git/index.lock` cannot be removed by an agent** on this setup (permission denied from
   WSL/containers). If git starts failing with "index.lock exists", the human deletes it from
   Windows: `del ".git\index.lock"`.
6. **Stale branches.** Local: `update-fe-doc-flowmapper`, `worktree-updatedocs-to-english`.
   Remote: `ai-docs`, `feature/order`, `feature/user`. None match the `feat/s<sprint>-<lane>-<slice>`
   convention in §5. Delete the merged ones; rename anything still live.

---

## 14. Line endings — do this before the first parallel session

`.gitattributes` at the repo root pins every text file to LF in git. Without it, an agent on
Windows and an agent in WSL or a container produce **whole-file diffs on every file**, and
every merge is a whole-file conflict. This is not hypothetical: measured 2026-08-14, 118
files were "modified" with zero content change.

Run once, on Windows, with no other agent working:

```
git config core.autocrlf false
git add --renormalize .
git commit -m "chore: normalise line endings via .gitattributes"
```

After that, `.gitattributes` is a **frozen file** (§2) — changing it re-normalises the whole
repo, so it only ever changes inside a merge window.

---

## 15. Enforcement — what actually holds, and what only asks

Nothing in this file makes an agent obey it. Prose is advisory: under context pressure every
agent skips it, and the record shows they did — `working-rules.md` has required a
`PROGRESS.md` update since it was written, and two screens shipped without one.

So the rules that matter are mechanical:

| Layer | Enforces | Bypass |
|---|---|---|
| This document, `AGENTS.md` | nothing | silent, free |
| A skill's `description` | which skill loads | agent can still work by hand |
| `pnpm check:docs` locally | 7 doc invariants | just don't run it |
| **`.github/workflows/docs-check.yml`** | **the same 7, plus line endings** | **none — it blocks the merge** |

`scripts/check-docs.mjs` (no dependencies, runs on bare node) checks:

1. broken internal markdown links
2. a rule referencing a file that does not exist — the §0.1 failure mode, now automated
3. an endpoint used in a FE contract but absent from `docs/api/**`
4. an error code used anywhere but never defined in `API_ERROR_CODES.md`
5. envelope drift — any `success` flag, which the flat envelope forbids
6. a page marked `built` in `_INDEX.md` with no `page.tsx`, or the reverse
7. a skill with no `description`, or split across two files

Six of the eighteen gaps found by hand on 2026-08-14 were of exactly these kinds. They are
now found by a machine, on every PR, for free.

**When you add a rule, ask whether it can be a check.** If it can, write the check — a rule
that cannot be verified will be broken and nobody will notice. `ALLOW_MISSING` at the top of
the script is the escape hatch for paths that legitimately do not exist yet; every entry
there must also appear in §0.1, and gets deleted the moment the file is created.

---

## 16. When a rule here is wrong, fix the rule

The failure mode this document keeps hitting is not agents breaking rules — it is **rules
describing a repo that no longer exists**. Three of them were found stale on 2026-08-14
(OneDrive path, Sprint 0 state, `packages/types`), and each one had already been read and
trusted by an agent.

So: **if you follow a rule here and reality does not match, stop and fix this file in the
same commit.** Do not route around it, do not leave a note for later. An agent that silently
works around a wrong rule leaves the next agent to hit the same wall — and the rule keeps
looking authoritative.

Specifically, update §0.1's table the moment you create one of the missing pieces.
