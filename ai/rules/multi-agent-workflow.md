# Multi-Agent Workflow — one task, one branch, one worktree, one PR

> Read this **before** starting work whenever more than one AI agent is active on this repo.
> Companion to `ai/rules/working-rules.md` (that file = how to code; this file = how to not collide).
>
> Rewritten 2026-10-02. The old version assigned standing lanes to `claude` and `codex`, claimed
> work by editing `ai/PROGRESS.md`, and gave each lane one long-lived worktree. In practice every
> agent worked in every lane on the owner's say-so, claims were never expired, and by 2026-10-01
> there were 11 worktrees, 593 uncommitted files in one of them, and 44 uncommitted files in the
> primary checkout for 12 days (`GIT-005`). Section numbers are kept so existing references
> (`§5`, `§8`, `§12`, `§14`, `§15`) still point at the same subject.

---

## 0. The one-paragraph version

Agents in one repo fail for four reasons: (1) two of them edit the same file or hot spot, (2) two
of them take the same task, (3) nobody can tell what an agent is doing or whether it is finished,
(4) environments disagree about line endings so every merge is a whole-file conflict. This
document answers with: **one task = one name = one branch = one worktree = one PR**, **a task card
that is the PR body**, **locks on the few files everyone wants**, **hard limits on how much is open
at once**, and **a cleanup that happens the day the PR merges**. `pnpm wt:status` shows all of it
in one table.

```
Backlog → Planned → Building → In review → Merged → Cleaned
```

> **§0.1 — Reality gate.** A rule that points at something that does not exist is worse than no
> rule. State of the mechanisms below, verified 2026-10-02:
>
> | Mechanism | State |
> |---|---|
> | `pnpm wt:status` (`scripts/wt-status.mjs`) | ✅ exists |
> | PR task card (`.github/pull_request_template.md`) | ✅ exists |
> | `pnpm check:docs`, 10 checks, run by CI | ✅ exists — see §15 |
> | Contract-first (§4) needs `packages/types` | ❌ the directory does not exist; `pnpm-workspace.yaml` declares `packages/*` |
> | Integrator folding session files into `ai/PROGRESS.md` | ❌ **not adopted** — CI still requires each PR to touch `ai/PROGRESS.md` and add a session file (§7) |
>
> Treat a ❌ row as *intent*, not procedure. When you create the missing piece, update this table
> in the same commit.

---

## 1. Roles — who does what

There are no standing lanes and no per-agent specialties. Agent IDs are lowercase and free-form
(`claude`, `codex`, `antigravity`, `opencode`, …); any of them can take any task, **one at a time**.

| Role | Who | Does | Never |
|---|---|---|---|
| **Owner** | the human | writes the brief, approves the plan, creates worktrees, picks the merge order | — |
| **Worker** | one agent per task | works only inside the worktree its task card names | creates a worktree, switches the shared checkout, touches a hot file it did not lock |
| **Reviewer** | a *different* agent than the author | reads the diff, leaves findings on the PR | edits the author's branch |
| **Integrator** | one agent, or the owner | merges PRs one at a time, in order (§6), then runs the cleanup (§5.1) | merges anything it did not review or that has a failing check |

**The primary checkout is read-only.** It stays on `main`, never holds a feature branch and never
holds uncommitted work. Two agents sharing one working tree destroyed each other's branches and
refs once already (`GIT-004`).

**Only the owner creates worktrees.** Agents never run `git worktree add`, clone the repo, or
start a second checkout on their own initiative — if a task needs one, ask. This is what stops
the sprawl.

---

## 2. Ownership — areas and hot-file locks

There is no path-by-path lane table. Two simple rules replace it.

**One worker per area at a time.** Areas: `api`, `student`, `teacher`, `admin`, `docs`. If an
`api/*` task is open, a second one waits or is split.

**Hot files need a lock.** These break everyone when two tasks edit them. A task that needs one
ticks it under **Locks** in its PR body; only one open task may hold each:

| Hot file | Why |
|---|---|
| `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/**` | migrations must land on `main` **first and alone** (§5.1) |
| the error-code registry `docs/api/API_ERROR_CODES.md` | codes are never invented, and two tasks adding the same family collide |
| `apps/api/src/app.module.ts` | every new module edits it |
| the shared student shell and shared components | one bug multiplies across every screen (`ai/rules/working-rules.md` full lane) |
| `.gitattributes`, `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `eslint.config.mjs` | frozen — one task at a time, never inside a feature PR |

Docs that several tasks append to (`ai/known-issues/KNOWN_ISSUES.md`, `ai/PROGRESS.md`) are not
locked, but ids are never reused: check **every** local and remote branch's copy before taking
one. `pnpm check:docs` fails on a reused id.

**If you need something outside your task:** do not edit it. Write the need in the PR body under
**Log**, stub it, and keep going.

---

## 3. The task card is the PR

Before any code is written, the owner (or the worker, with the owner's approval of the plan)
opens a **draft PR**. Its body — from `.github/pull_request_template.md` — is the brief:

- **Goal**, in one or two lines
- **May touch** and **out of scope**
- **Locks** needed (§2)
- **Done when** — how the owner will know
- **Owner agent** — exactly one

`gh pr list` is then the board; nobody opens a branch to ask what it is.

**Status line.** The body starts with `Status: planned | building | in review | merged | cleaned`.
The worker updates it, and adds one line under **Log**, at every stop. **Push a WIP commit before
you stop**, so nothing sits only in a worktree.

**Naming.** Branch, worktree directory and PR title prefix share `<area>/<slug>`, for example
`student/practice-live` → worktree `../Real-student-practice-live`. Non-feature work uses the same
areas with a conventional-commit type in the PR title (`fix`, `chore`, `docs`).

**Item claims in `ai/PROGRESS.md`** (`⬜ → 🔶 (agent · date)`, committed alone) remain the
*record* of sprint items until the Integrator role in §0.1 is adopted. The PR is the live claim;
`PROGRESS.md` is the history. Do not let them disagree: when the PR is merged the line becomes
`✅`, or `🔶` with a note — never `✅` for mocked data.

**Stale tasks.** A task with no PR and no commit for 3 days is finished or deleted, by the owner's
call, not the agent's.

---

## 4. Contract-first — the rule that removes most coordination

Backend and frontend do not negotiate at integration time; they negotiate **up front**, once. For
every slice, the API contract — request/response DTOs, error codes from `docs/api/API_ERROR_CODES.md`
(never invented), the flat envelope from `docs/api/API_CONVENTIONS.md` — is written **before**
either side implements, and merged first. The frontend mocks behind a `MOCK()` marker and never
waits for the real API.

> ⚠️ **The shared types package `packages/types` does not exist** (§0.1), so today the contract
> lives in the module specs under `docs/api/modules/` and the API docs, and every field name is
> checked by hand. Creating the package is the highest-value unblocking task in the repo.

A contract change after it ships is a small event, not a silent edit: bump it, say so in the PR
**Log**, and do it in a PR of its own — never inside an unrelated commit.

---

## 5. Git — one worktree per task, outside the repo

### 5.1 The full loop, including the part everyone skips

```bash
# 1. START — the owner creates the worktree, from fresh main, never from another feature branch
git fetch origin
git worktree add ../Real-student-practice-live -b student/practice-live origin/main

# 2. CARD — draft PR with the brief (§3). Push the empty branch so the PR can exist.
gh pr create --draft --fill

# 3. WORK — small commits, conventional prefixes, one logical unit each
git commit -am "feat(web): ..."

# 4. STAY CURRENT — at least once per session, always before leaving draft
git fetch origin && git rebase origin/main

# 5. STOP — push a WIP commit and update Status:/Log: before you stop, every time
git push

# 6. REVIEW — mark ready; a DIFFERENT agent reviews and pastes findings into the PR

# 7. MERGE — the Integrator, one PR at a time, in the order in §6
gh pr merge --squash --delete-branch

# 8. CLEAN UP — THE SAME DAY. This step keeps getting skipped.
git switch main && git pull
git branch -d student/practice-live      # -d refuses if unmerged. Never -D unless deliberately discarding
git worktree remove ../Real-student-practice-live
git remote prune origin
```

**Done means cleaned.** A leftover branch holds a worktree lock, so a later `git worktree add`
fails with "already checked out"; a leftover remote branch makes `git branch -a` unreadable.
`pnpm wt:status` flags a merged-but-not-cleaned worktree as `MERGED`.

**A squash merge leaves the branch's own commits "ahead" of `main` forever** — that is expected;
the PR state is the signal, not the ahead count.

**Rules:**

- Never commit directly to `main`. Every merge to `main` is a PR.
- Rebase on `main` at least once per session, and always before leaving draft.
- **Cross-review.** The agent that did *not* write the code reviews it. A review by the authoring
  agent does not count. With one human, the minimum bar is: open the PR, hand the diff to a
  different agent, paste its findings into the PR, then merge.
- A Prisma migration merges to `main` **first**, alone, before any code that depends on it.
- **Worktrees live OUTSIDE the repository directory** (`../Real-<slug>`). One created inside it
  checks out a second full copy of `docs/` and `ai/`: grep and agent context then return two
  versions of every file, one of them stale (`DOC-001`). `.claude/` is gitignored, so an
  inside-repo worktree is never committed — it only ever pollutes search.
- **Never discard work to tidy up.** Before deleting a worktree or branch, look at what is in it.
  Uncommitted files are saved to a named WIP branch first (`wip/<owner>-<what>-<date>`), never
  dropped with `git checkout .` / `git clean`.

---

## 6. Merge order — the Integrator

There is no all-agents-stop merge window. The Integrator merges PRs **one at a time**, from a
clean checkout, in dependency order:

1. migrations
2. shared types / contracts
3. backend
4. frontend
5. docs

After each merge the next PR is rebased on the new `main` and its checks re-run before it merges.
Frozen-file changes (§2) are applied alone, in a PR of their own.

---

## 7. Updating the shared docs — who writes what

Conflicts in markdown come from many writers appending to one file at the same time. Agents
therefore append to **their own file** and keep shared files short.

| File | Who writes | When | How |
|---|---|---|---|
| PR body (`Status:`, `Log:`) | the task's worker | every stop | the live status board — `gh pr list` |
| `ai/context/sessions/<YYYY-MM-DD>-<task>.md` | that task's worker | end of the task | free-form, §8 template; conflict-free by construction |
| `ai/PROGRESS.md` | the worker | in the PR | the sprint record; edit only your own lines; **CI fails a PR that changes ≥50 lines in `docs/ apps/ prisma/ packages/` without it** |
| `ai/known-issues/KNOWN_ISSUES.md` | the worker | on discovery | **append only**; lane-prefixed ids; never reuse or renumber (§2) |
| `ai/context/HANDOFF.md` | the owner or Integrator | after merges | distil session files; max 5 entries |
| `docs/shared/decisions/` (ADR) | the worker, owner-approved | when an architecture choice is made | one new file per decision; never edit an Accepted ADR — supersede it |
| `ai/AI_CHAT_LOG.md` | the owner | after chat brainstorms | agents read, do not write |

**Update `ai/PROGRESS.md` when you start and when you finish**, not in one batch at the end.
Batching is what causes duplicated work.

---

## 8. Session-file template

`ai/context/sessions/<YYYY-MM-DD>-<task>.md`:

```markdown
## [2026-10-02] — <task> — <agent> — branch `<area>/<slug>`

**Done**:
-

**In progress** (and why it's unfinished):
-

**Contract/temporary decisions to preserve**:
-

**Needs from another task**:
-

**Blocker / needs follow-up**:
-

**Next steps**:
-
```

---

## 9. Start-of-session checklist

1. Confirm you are in **your task's worktree**, not the primary checkout (`git worktree list`).
2. `git fetch && git rebase origin/main`.
3. Read `ai/context/project-brain.md`, then your PR body — the brief is the scope.
4. Read `ai/context/HANDOFF.md` and the newest session file **only if** continuing unfinished work.
5. Read `ai/rules/working-rules.md` if touching routes / DB / API / auth.
6. Follow `ai/rules/working-rules.md` §MANDATORY: Analyze → Plan → **Wait for approval** → Work.

## 10. End-of-session checklist

- [ ] Everything committed **and pushed** — a WIP commit is fine, an uncommitted file is not
- [ ] PR body `Status:` and `Log:` updated
- [ ] `ai/PROGRESS.md` reflects reality — no stale `🔶` with your name on it
- [ ] Session file written
- [ ] New bugs appended to `KNOWN_ISSUES.md` with a checked, unused id
- [ ] Anything another task needs is written in the PR **Log**

---

## 11. Where progress gets recorded — worked example

One task, start to finish. The status is written several times, not once at the end.

| When | Where | What | Commit? |
|---|---|---|---|
| Plan approved | PR body | brief filled in, `Status: planned` | the draft PR itself |
| Starting to code | PR body, `ai/PROGRESS.md` | `Status: building`; item `⬜` → `🔶 (agent · date)` | yes — the `PROGRESS` line alone |
| Each stop | PR body | one `Log:` line; WIP commit pushed | yes |
| Hitting a need outside the task | PR body `Log:` | one line, then stub and continue | with the next work commit |
| Finishing | PR body, `ai/PROGRESS.md` | `Status: in review`; `🔶` → `✅` (or `🔶` + mock note) | yes — in the PR |
| End of task | `ai/context/sessions/` | full template (§8) | yes |
| Bug you will not fix now | `KNOWN_ISSUES.md` | append, checked id | yes |
| Merge day | PR body, git | `Status: merged`, then §5.1 step 8, then `cleaned` | — |

**What does NOT go in `PROGRESS.md`:** reasoning, alternatives, debugging notes. Those go in the
session file. `PROGRESS.md` is a status board, not a journal.

---

## 12. Worktree playbook

### After the owner creates one — each worktree needs its own untracked setup

A worktree shares git history but **not** ignored or untracked files:

```bash
cd ../Real-<slug>
cp ../Real/.env .env          # .env is gitignored — it does NOT come along
pnpm install                  # each worktree gets its own node_modules
pnpm --filter api db:generate # a fresh worktree has no generated Prisma client
```

A fresh worktree is not usable until `pnpm install` finishes. If Prisma then fails with
`Cannot find module .../engines/dist/index.js`, copy that `dist/` from the primary checkout's
`node_modules/.pnpm/prisma@*/node_modules/@prisma/engines/` — `KNOWN_ISSUES.md` `BUILD-002`.

### Ports — dev servers collide otherwise

Two worktrees running `pnpm dev` fight for :3000/:3001. Give each active task a slot in its own
`.env` and point `NEXT_PUBLIC_API_URL` at its own API port:

| Slot | API | Web |
|---|---|---|
| 1 | 3001 | 3000 |
| 2 | 3011 | 3010 |
| 3 | 3021 | 3020 |

### Lifecycle

```bash
git worktree list                 # what exists
pnpm wt:status                    # what each one is doing — branch, dirt, age, PR, flags
git worktree remove ../Real-<slug>   # after the branch is merged
git worktree prune                # stale entries (deleted directories)
```

- **One worktree per task, removed when the task is cleaned.** Not one per lane.
- **Never nest a worktree inside the main checkout.** Turbo, eslint and tsc walk into it and
  lint/build the same source twice.
- "already checked out" means another worktree holds that branch: `git worktree list`, remove the
  stale one.

### OneDrive — resolved, do not regress

The repo lives at `D:\PersonalProject\Real`, **outside OneDrive**, and worktrees are siblings
(`D:\PersonalProject\Real-<slug>`). OneDrive syncing `.git/` and `node_modules/` caused slow
installs, mid-build file locks and corrupted git index files, and once re-synced a stale third
copy of `ai/` and `docs/` (`DOC-002`). Do not move the repo back.

---

## 13. Limits and the daily check

These are the numbers that keep the board readable. If you cannot hold it in your head, it is
too many.

| Limit | Value |
|---|---|
| Active worktrees (excluding the primary checkout) | **3** |
| Agents per task | **1** |
| Workers per area at a time | **1** |
| Open tasks holding a given hot-file lock | **1** |
| Days with no PR and no commit before a task is finished or deleted | **3** |

**Daily, about 5 minutes:** run

```bash
pnpm wt:status            # human table, always exits 0
pnpm wt:status --strict   # exits 1 when anything is flagged
```

It lists, per worktree: branch, ahead/behind `origin/main`, dirty count, last commit age, PR state.
Flags: `DIRTY` (uncommitted files), `DETACHED` (no branch, so no name and no PR), `MAIN-OFF` (the
primary checkout is not on `main`), `MERGED` (its PR landed — clean up), `STALE` (older than 3
days with no open PR), `BEHIND` (more than 50 commits behind `origin/main`). Anything flagged is
finished, saved to a WIP branch, or deleted **that day**, by the owner's decision.

---

## 14. Line endings — still open (`GIT-001`)

`.gitattributes` pins every text file to LF in git. Without it, an agent on Windows and one in WSL
or a container produce whole-file diffs, and every merge is a whole-file conflict. The file exists
but the one-time normalisation has **not** been run (`GIT-001`). Run it once, on Windows, with no
other task in flight:

```
git config core.autocrlf false
git add --renormalize .
git commit -m "chore: normalise line endings via .gitattributes"
```

After that, `.gitattributes` is a frozen file (§2).

---

## 15. Enforcement — what actually holds, and what only asks

Nothing in this file makes an agent obey it. Prose is advisory: under context pressure every agent
skips it, and the record shows they did. So the rules that matter are mechanical:

| Layer | Enforces | Bypass |
|---|---|---|
| This document, `AGENTS.md` | nothing | silent, free |
| `.github/pull_request_template.md` | that the brief, status and locks exist | leave it blank |
| `pnpm wt:status` | makes dirt, age and merged-but-not-cleaned visible | don't run it |
| `pnpm check:docs` locally | 10 invariants | don't run it |
| **`.github/workflows/docs-check.yml`** | **the same checks, plus line endings and the record step** | **none — it blocks the merge** |

`scripts/check-docs.mjs` (no dependencies, runs on bare node) checks:

1. broken internal markdown links
2. a rule referencing a file that does not exist — the §0.1 failure mode, automated
3. an endpoint used in a FE contract but absent from `docs/api/**`
4. an error code used anywhere but never defined in `docs/api/API_ERROR_CODES.md`
5. envelope drift — any `success` flag, which the flat envelope forbids
6. a page marked `built` in `_INDEX.md` with no `page.tsx`, or the reverse
7. a skill with no `description`, or split across two files
8. `AGENTS.md` and `CLAUDE.md` drifting apart
9. the required CI quality gates being removed from `quality.yml`
10. a `KNOWN_ISSUES.md` id used for more than one issue (three legacy duplicates are grandfathered
    at exactly two uses, because ids are never renumbered)

**When you add a rule, ask whether it can be a check.** If it can, write the check — a rule that
cannot be verified will be broken and nobody will notice. `ALLOW_MISSING` at the top of the script
is the escape hatch for paths that legitimately do not exist yet; every entry there must also
appear in §0.1 and is deleted the moment the file is created.

**Not yet mechanical** (and so only asked): one worker per area, the 3-worktree cap, the lock
checklist being honest. `pnpm wt:status --strict` is the nearest thing to a gate for the first two.

---

## 16. When a rule here is wrong, fix the rule

The failure this document keeps hitting is not agents breaking rules — it is **rules describing a
repo that no longer exists**. The lane table, the OneDrive path, the Sprint 0 state and the
`packages/types` claim were each found stale after an agent had read and trusted them.

So: **if you follow a rule here and reality does not match, stop and fix this file in the same
commit.** Do not route around it, do not leave a note for later. An agent that silently works
around a wrong rule leaves the next agent to hit the same wall while the rule keeps looking
authoritative. Update §0.1 the moment you create one of the missing pieces.
