# Cowork Bootstrap — HSK Learning Platform

> Paste this, or open it, at the start of a fresh Cowork session. It carries the context that
> would otherwise be lost when moving off claude.ai.
>
> Written 2026-08-31 from the claude.ai Project copies; **rewritten 2026-09-01 after checking
> against the real repo**, which turned out to be well ahead of those copies.
>
> This file is a **pointer, not a source**. Everything below is stated more fully in the repo
> docs. When they disagree with this file, the repo wins.

---

## Rule zero — the repo is the source of truth

The claude.ai Project docs are a **mirror, and it goes stale**. On 2026-08-31 a chat session
rewrote five tracked files from Project copies last synced in July, without repo access. Every
one came out shorter than the repo's version, and the rewritten `KNOWN_ISSUES.md` reused live
issue IDs (`API-003`, `DOC-006`, `DOC-007`) for different problems. Nothing was lost only because
the copy-back was checked first.

So: **read the repo before writing anything to the repo.** If you are in a session with no repo
access, produce *new* material under *new* IDs and say plainly that it has not been verified.

## Read these first, in this order

1. `ai/context/project-brain.md` — one-page orientation
2. `PROJECT_KNOWLEDGE.md` **§9 (Open Conflicts Register)** — read before trusting any other fact
3. `ai/known-issues/KNOWN_ISSUES.md` — `SCOPE-02` and `DOC-011` first
4. `ai/PROGRESS.md` — what's claimed, what's blocked
5. `ai/rules/working-rules.md` — mandatory before touching routes / DB / API / auth
6. `ai/rules/multi-agent-workflow.md` — only if a second agent is active
7. `ai/context/HANDOFF.md` — only if continuing unfinished work

## The one thing to know

**`backend/data/content/` is not in this repo.** No `backend/` directory, no `content/`
directory, none of the 10 JSON files. `PROJECT_KNOWLEDGE.md` §8 (F9–F16: pronunciation, grammar,
character writing, Lego builder, mock exams, roleplay, learning path, gamification) describes
content that lives somewhere else, or no longer exists.

That matters because the "multi-role LMS vs single-user self-study" question (`SCOPE-02`) rests
on those files. Without them the repo describes one product — the LMS — and §8 may belong to a
different project entirely. **Find the content before planning around it** (`DOC-011`).

## Settled — do not re-litigate

- **HSK level range is 1–9.** Settled **2026-08-11** against the entity specs, `GLOSSARY.md`,
  `DATABASE_SCHEMA.md`, `CONVENTIONS.md` and `SPRINT_PLAN.md`, matching HSK 3.0. The 2026-07-27
  revert to 1–6 was the mistake. Any "1–6" left in the repo is stale (`DOC-004`), except in
  historical log entries.
- **The plan is 10 sprints, S0–S9**, per `docs/roadmap/SPRINT_PLAN.md`. `PROJECT_KNOWLEDGE.md` §6
  and `ai/PROGRESS.md` both carry a stale 8-sprint shape (`DOC-012`).
- **One backend: `apps/api/`.** There is no second backend.
- **The shared contract package is `packages/types`** — not `packages/shared-types`. It does not
  exist yet; creating it is the first unlock for parallel work.
- The AI rules file is `ai/rules/working-rules.md`, not `coding-rules.md`.
- Rates (tuition, pay) are append-only — new rate with an effective date, never edit an old one.
- Entity specs (`docs/entities/`) outrank feature docs (`FEATURES_*.md`).

## Still open — do not pick a side alone

`SCOPE-02` product model · `DOC-011` missing content files · `CR-3` storage (Cloudinary vs
Supabase Storage — evidence favours Supabase, incl. the only accepted module spec) · `CR-13`
Sprint 6 in scope · `CR-20` branch naming · money representation · `SCOPE-01`
Classes/Enrollment scope · `API-002` two contradictory rate formulas · the 5 questions in
`PROJECT_KNOWLEDGE.md` §8.10.

Full detail: `PROJECT_KNOWLEDGE.md` §9 and `KNOWN_ISSUES.md`.

## State of play

- **Docs are far ahead of code.** 8 module specs with 168 invariants exist; only `01-auth.md` is
  accepted. `apps/api` is scaffolded (NestJS, Prisma, migration `20260820000000_init_users`,
  health module) but implements no features.
- `apps/web` has substantial **fully-mocked** admin and student screens. None of them call an
  API. Do not mistake a mock for a feature — `PROGRESS.md` § Off-sprint says which is which.
- `turbo.json` is now tracked (`BUILD-001` resolved in PR #13; `pnpm dev` / `pnpm build` will
  work on a clean clone once that PR merges to `main`).
- `packages/` does not exist.
- `git add --renormalize .` has still not been run — ~118 files show as modified with no content
  change (`GIT-001`).
- Repo lives at `D:\PersonalProject\Real`. Keep it out of OneDrive — OneDrive deletes newly
  created folders.

## Environment traps

- Over a device mount, `rm`/`unlink` is forbidden but `mv` works, so `git pull` / `merge` /
  `checkout <branch>` leave a half-applied tree. Workaround in `KNOWN_ISSUES.md` `GIT-003`.
  Creating a branch with `git checkout -b` is safe — it touches no files.
- The sandbox has **no git identity**: it can stage, it cannot commit. Commits happen on Windows.
- A git worktree placed *inside* the repo duplicated 88 `.md` files with stale copies. Run
  `git worktree list` before bulk doc edits.
- `pnpm-workspace.yaml` must exist before `pnpm add -Dw`.
- `next/font/google` fetches at build time; without network use `@import` in CSS.
- `subsets: ['latin','vietnamese']` — dropping `vietnamese` strips every diacritic in the UI.

## Working rules that matter most

- **Analyze → Plan → Wait for approval → Work.** For anything touching DB schema, auth, RBAC or
  payment, wait for explicit approval regardless of how clear the request looks.
- If two docs disagree and §9 doesn't cover it: **stop and ask.** Do not harmonise by editing one
  file to match the other.
- `KNOWN_ISSUES.md` is **append-only** and IDs are **never renumbered or reused**. Check the
  existing IDs before assigning one.
- Never commit to `main` directly. Prisma migrations merge alone, first.
- `pnpm check:docs` before opening a PR — 8 doc invariants are enforced in CI.
