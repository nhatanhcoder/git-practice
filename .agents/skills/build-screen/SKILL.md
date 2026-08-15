---
name: build-screen
description: Build one or more admin/teacher/student screens in apps/web from an existing Page Contract and spec. Use when the human says /build-screen, or asks to code/implement a screen and names a contract or spec file. Carries the whole workflow - branch, claim, plan-and-stop, tokens, verify, record - so the request only has to name the pages and the skills.
---

# build-screen

The human gives two things and nothing else:

```
/build-screen
pages:  docs/front-end-design-docs/pages/admin-pages/admin-tuition-rates.md
skills: ui-ux-pro-max, ui-styling
```

`pages` may list several. Build them **one at a time**, fully, in the order given — branch,
plan, approval, code, verify, record, PR — before starting the next. Never batch.

If `skills` is omitted, use `ui-ux-pro-max` + `ui-styling`. If `pages` is omitted, stop and ask.

## Resolving a page

From `pages/<role>-pages/<name>.md` the other files follow by convention:

| | Path | Authority |
|---|---|---|
| Contract | `pages/<role>-pages/<name>.md` | **WHAT** — route, RBAC, states, actions, endpoints |
| Spec | `specs/<role>-pages/<name>.spec.md` | **HOW IT LOOKS** on this page |
| Shared | `specs/_DESIGN-SYSTEM.md` | shared components, layout shell |
| Tokens | `root-design-fe.md` | **colour, type, spacing** + `design_baseline` |

All relative to `docs/front-end-design-docs/`.

On conflict: **contract wins on behaviour, tokens win on appearance.** Report the conflict;
never pick one silently. The contract already exists — do **not** run `flow-mapper`.

## Skills

Use the ones named, plus anything else you find useful — no need to ask.

**Never**: `design-taste-frontend` on an authenticated screen (public pages only —
landing, pricing, login). `design-promote` (human-triggered, after merge, not your task).

**The one hard limit.** Take a design skill's **layout, spacing, interaction, a11y**.
Ignore its **colours and fonts** — this project has its own, in `root-design-fe.md`.
Never run `ui-ux-pro-max --design-system`; that generates a competing design system.
A value that is not already a token stays **out of the code** — list it in your report as a
candidate for `/design-promote`.

Build at whatever `design_baseline:` currently says. Copy that version into the spec
frontmatter and the `_INDEX` Design column. Never invent or increment it.

If `.agents/skills/ui-ux-pro-max/SKILL.md` is missing, **stop and say so** — it is gitignored,
so each clone/worktree installs it once with `npx ui-ux-pro-max-cli init --ai universal`.
Do not install it yourself and do not carry on without it.

## Before writing code

LANE: `apps/web/**` belongs to codex (multi-agent-workflow §1). Not codex? Record the flip in
`ai/PROGRESS.md` first.

1. `git switch -c feat/s<sprint>-web-<slice> origin/main`
2. Claim in `ai/PROGRESS.md` → `🔶 (agent · date)`, commit that line **alone**
3. Read `docs/shared/RBAC_MATRIX.md` + `docs/actors/<role>/PERMISSIONS_<ROLE>.md`
4. Read `apps/web/src/app/admin/users/**` — reuse that shell, do not invent a second one.
   Note WEB-002/003/004 before copying their defects.
5. Read `docs/entities/` — the entity spec beats `FEATURES_*.md` on field names
6. Diff contract vs spec vs `docs/api/**` vs the code. **Do not invent endpoints.**
   Always true: no `src/lib/status.ts` (WEB-002); no react-hook-form/zod; no `turbo.json`,
   so use `pnpm --filter web build` (BUILD-001). List this screen's own gaps on top.
7. Present the plan: files, every state, interactions, responsive, tests, new deps + why,
   blockers
8. **STOP. Wait for approval.**

## After approval

- Tokens from `root-design-fe.md` only. Need a status colour? Create `src/lib/status.ts` —
  never hardcode one in CSS.
- Every state in the contract, including Forbidden (redirect `/login` +
  `AUTH_INSUFFICIENT_ROLE`) and field errors from `VALIDATION_ERROR.details`
- Mark stand-ins: `// MOCK(<FEATURE>): why, and what removes it`
- Money: integer minor units on the wire. Dates: UTC ISO on the wire. Format at render only.
- New deps in `apps/web/package.json` only — root `package.json` is frozen (§2)

## Verify — paste real output, not a claim

```
pnpm --filter web build
node --test apps/web/scripts/*.test.mjs
pnpm check:docs
```

Screenshot desktop **and** 375px, then **read** them. Every state, not just the happy path.
A green build is not verification — WEB-001 shipped a broken sticky header through one.
Run `ui-ux-pro-max`'s pre-delivery checklist and report each line pass/fail.
**One pass, then stop** — no fix-and-rescreenshot loop.

## Record

- `ai/PROGRESS.md`: `✅` only if it talks to a real API. Mocked stays `🔶` with a note.
- contract `status:`, `_INDEX` Status column, spec `status:`
- `_INDEX` Design column + spec `design_baseline:` — copy the current version
- new bugs → `KNOWN_ISSUES.md` as `WEB-00N`, never renumber
- session notes → `ai/context/sessions/<date>-<agent>.md`, **not** `HANDOFF.md` (§7)
- PR: which skills shaped it, and any colour/font you deliberately kept out
- do not touch unrelated changes in the working tree

Then **stop**. The human looks at it. Changes mean loop back to code — nothing in
`docs/front-end-design-docs/` moves during that loop. Praise means keep iterating. Only
`/design-promote <screen>`, run by the human after merge, moves the design baseline.
