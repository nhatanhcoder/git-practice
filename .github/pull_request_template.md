<!--
The PR body IS the task card. Fill it in when the draft PR is opened, before any code is written,
so `gh pr list` shows what every branch is for. Title: `<type>(<scope>): <outcome>` — someone who
has never seen the branch must know what it is for from the title alone.
Branch, worktree and PR share one name: `<area>/<slug>` (areas: api, student, teacher, admin, docs).
-->

Status: planned
<!-- planned → building → in review → merged → cleaned. Update at every stop. -->

## Brief
**Goal** (1–2 lines):

**May touch**:

**Out of scope**:

**Done when** (how the owner will know):

**Owner agent** (exactly one):

## Locks
Tick only what this task needs. Only one open task may hold each lock.
- [ ] DB schema / Prisma migration
- [ ] Error-code registry (`API_ERROR_CODES.md`)
- [ ] `apps/api/src/app.module.ts`
- [ ] Shared student shell / shared components
- [ ] None

## Touches DB schema, Auth, RBAC or money?
- [ ] No
- [ ] Yes — explicit owner approval, named scope:

## Log
<!-- One line per stop, newest last. Push a WIP commit before stopping so nothing sits uncommitted. -->
-

## Verification
<!-- Paste real output. A passing test proves only the tested scope; list anything NOT RUN. -->
- [ ] `pnpm lint`
- [ ] `node scripts/check-docs.mjs`
- [ ] `pnpm --filter web build` (UI changes)
- [ ] Playwright desktop + 375px screenshots read (UI changes)
- Not run:

## Record
- [ ] `ai/PROGRESS.md`
- [ ] `ai/known-issues/KNOWN_ISSUES.md` (ids checked against every branch)
- [ ] `ai/context/sessions/<date>-<task>.md`
- [ ] Status flag of every doc touched

## Cleanup (same day as merge)
- [ ] Local and remote branch deleted
- [ ] Worktree archived
