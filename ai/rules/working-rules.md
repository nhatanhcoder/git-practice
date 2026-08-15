# AI Coding Rules — HSK Learning Platform

> Rules specific to AI tool behavior on this repo.
> General coding conventions: docs/shared/CONVENTIONS.md (read that first).

---

## The flow

One task, start to finish. No single file holds all eight steps — the table below says which
file owns which, so you edit one place and not four.

```
1  Read AGENTS.md            -> 5 always-loaded files, ~6k tokens
2  git switch -c feat/...    -> branch from fresh origin/main
3  Claim in ai/PROGRESS.md   -> ⬜ becomes 🔶 (agent · date), commit that line ALONE
4  Analyze -> Plan -> STOP   -> wait for the human's approval
5  Read contract + spec + _DESIGN-SYSTEM -> write code   <──┐
6  Verify                    -> 3 machine commands + 2 screenshots, one pass
      │                                                     │
      └── human dislikes the UI? ───────────────────────────┘  loop 5–6, no doc changes
7  Record                    -> PROGRESS · KNOWN_ISSUES · contract/spec/_INDEX status
8  PR -> review -> merge -> delete branch (local AND remote)   ← THE AGENT'S TASK ENDS HERE

────────────────────────────────────────────────────────────────────────────
   /design-promote <screen>   ← HUMAN-TRIGGERED, NOT PART OF THE TASK ABOVE
```

**Never run `/design-promote` yourself.** It is not step 9 of your task — your task ended at
step 8. The human runs it, after the merge, possibly days later, and often **not at all**
(if the screen already matched the baseline, nothing needs promoting). An agent that runs it
unprompted rewrites the design system on its own authority.

Step 6 is a **loop**, not a gate you pass once. The human may send you back to step 5 any
number of times. Nothing in `docs/front-end-design-docs/` changes during that loop —
`root-design-fe.md` and `_DESIGN-SYSTEM.md` stay untouched until promote.

**Step 7 vs promote — who writes which field**, so two commits never fight over one row:

| Field | Written at step 7 (agent) | Written by `/design-promote` (human) |
|---|---|---|
| `_INDEX.md` **Status** column | ✅ `contracted` → `built` | never |
| `_INDEX.md` **Design** column | ✅ stamp the **current** version | ✅ set to the **new** version |
| spec `design_baseline:` | ✅ stamp the **current** version | ✅ bump to the **new** version |
| `root-design-fe.md` tokens + `design_baseline` | ❌ **never** | ✅ only here |

At step 7 you copy the version that already exists in `root-design-fe.md`. You never invent
or increment one.

| To change | Edit |
|---|---|
| Steps 4, 6, 7 — work order, approval gate, Definition of Done, mock/date/token rules | **this file** |
| Steps 2, 3, 8 — lanes, claiming, branch lifecycle, merge windows, worktrees | `ai/rules/multi-agent-workflow.md` |
| Step 1 — what loads at startup, skill precedence | `AGENTS.md` **and** `CLAUDE.md` — two files, one shared body, **edit both** (check 8 fails if they drift) |
| Step 5 — the contract and spec templates themselves | `.agents/skills/flow-mapper/SKILL.md`, `.agents/skills/page-designer/SKILL.md` |
| The promote step — versioning, catch-up prompts, what the human runs after merge | `.agents/skills/design-promote/SKILL.md` |
| Which rules a machine enforces | `scripts/check-docs.mjs` |
| Per-screen status | `docs/front-end-design-docs/pages/_INDEX.md` |

**Changing a rule without changing its check leaves the rule unenforced.** If a new rule can
be expressed as a check, add it to `scripts/check-docs.mjs` in the same commit — see
`multi-agent-workflow.md` §15.

---

## MANDATORY: Workflow Order for Every Task

For any task beyond a trivial one-line fix, follow this exact order:

1. **Analyze** — Read the relevant docs (RBAC matrix, entity spec, ADRs, `ai/context/HANDOFF.md`, `ai/PROGRESS.md`) and the current code before writing anything.
2. **Create a plan** — Write a short plan: what will change, which files/modules are affected, edge cases, and any open questions. Present this plan to the user.
3. **Wait for approval** — Do NOT write or edit any code until the user explicitly approves the plan. If the user's request already contains enough detail that no reasonable person would need to ask more, state the plan briefly and proceed — but for anything touching DB schema, auth, RBAC, or payment, always wait for explicit approval regardless.
4. **Begin work** — Implement only after approval.
5. **Record it** — see "Definition of Done" below. This step is not optional and not "as needed".

Do not skip straight to writing code just because a request looks simple — step 1–2 still apply, they can just be quick.

---

## MANDATORY: Definition of Done

A task is not done when the code runs. It is done when the next agent cannot be misled by it.

**Run `pnpm check:docs` before opening the PR.** It is 7 mechanical checks over the docs,
zero dependencies, under a second. CI runs the same thing and will block the merge, so
finding it locally is strictly cheaper. See `multi-agent-workflow.md` §15.

**Before claiming anything is finished:**

1. **`ai/PROGRESS.md` reflects it.** Mark the item, or add it under `## Off-sprint / spike`
   if it belongs to no sprint. State plainly what is mocked and what is unfinished.
2. **New bugs go in `ai/known-issues/KNOWN_ISSUES.md`**, lane-prefixed (`WEB-004`, `API-002`).
   A bug you noticed and did not write down is a bug you inflicted on the next session.
3. **Doc status flags updated** — page contract `status:`, `docs/front-end-design-docs/pages/_INDEX.md` row, spec
   frontmatter. A contract still reading `contracted` for a screen that exists sends the next
   agent to rebuild it. This happened on 2026-08-13 and was caught a day later by accident.

**Never mark `✅` for a screen backed by mock data.** Use `🔶` with a note. `✅` means a real
user can complete the flow against a real API. Approving a user by mutating React state and
losing it on refresh is not F1.3.

### Marking mock / placeholder code

Any value that stands in for something real carries a marker the next agent can grep:

```ts
// MOCK(F1.3): hardcoded until GET /api/v1/admin/users exists. Remove with the API wiring.
const initialUsers: User[] = [ ... ];
```

Grep `MOCK(` before declaring a feature complete. Files under `src/lib/*-data.js` that exist
only to fake an endpoint say so on line 1.

### Verify — one pass, then stop

`next build` passed while the sticky-header bug (`KNOWN_ISSUES` WEB-001) shipped a header
covering row 1. Compilation proves types, not correctness. But verification must stay cheap,
so it is split by who is good at what.

**Machines first — these are near-free, always run all three and paste the real output:**

```
pnpm --filter web build          # NOT `pnpm build` — no turbo.json yet (BUILD-001)
node --test apps/web/scripts/*.test.mjs
pnpm check:docs
```

"Build passed" without the output pasted does not count as having run it.

**Then exactly two screenshots: desktop and 375px, Ready state only.** Read them, report
what you see. That is the whole visual pass.

**Do not screenshot every state.** Every admin page ships a REVIEW-STATE switcher
(`WEB-004`) — list the states you did *not* look at so the human flips through them in the
browser in ten seconds. Screenshots are the single most expensive thing an agent does; two
is the budget.

**One pass, then stop.** If something looks wrong, say what is wrong and stop. Do not start a
fix → re-screenshot → fix loop without asking — that loop, not the checking itself, is what
burns a session.

For a logic change with no UI: the three machine commands are the whole verification. Write a
test for the path you touched if none exists.

### Work outside the sprint plan

Off-sprint work is the *most* important to record, not the least — it belongs to no checklist
item, so if it is not written down it exists only in the human's memory. Log it under
`## Off-sprint / spike` in `ai/PROGRESS.md` with: what was built, why it was off-sprint, what
is mocked, and which sprint item it does **not** satisfy.

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

- All responses follow the envelope format in `docs/api/API_CONVENTIONS.md` — **flat**:
  `code` / `message` / `details` at the top level, no `success` flag, no nested `error` object
- Error codes come from `docs/api/API_ERROR_CODES.md` — never invent new codes. Codes marked
  *proposed, not agreed* there are not usable until a BE owner signs them off
- All DateTime = **UTC ISO 8601 on the wire**. Formatting for display happens in the UI layer
  and nowhere else. Never store a display-formatted date (`"09/08/2026"`) in a data module —
  the two `/admin/users` screens disagree on this today and the detail screen will break on
  first contact with the real API
- An endpoint that appears in a FE contract but not in `docs/api/**` is **not** a licence to
  invent it. Add it under `## Needs from the other lane` in `ai/PROGRESS.md` and mock behind
  a `MOCK()` marker

## Frontend Design Rules

- Tokens come from `docs/front-end-design-docs/root-design-fe.md`. **Components never choose
  their own colours.**
- The enum-to-hex map lives in `apps/web/src/lib/status.ts` and is the **only** place a badge
  colour is decided. Hardcoding a status colour in a CSS module violates this — the current
  `users.module.css` does exactly that and is tracked as tech debt
- Chart series use `#2563EB` + `#EA580C` (ADR 007). Never status colours for chart series, and
  never a second y-axis
- Any design skill (`design-taste-frontend`, `ui-ux-pro-max`, …) may be used on **any**
  screen, dashboards included — see `## Skill Rules`. What is still forbidden is a skill's
  palette leaking into shipped code without passing through the promote step below

### FE iterate — the design baseline only moves when the human says so

The FE gets rewritten as many times as it takes. Iterate freely, use whatever skill helps,
show the result. **While iterating, never touch `root-design-fe.md` or `_DESIGN-SYSTEM.md`.**

A new design becomes the baseline only on the explicit command, run **after the code is
pushed**:

```
/design-promote <screen>        # e.g. /design-promote admin-profile
```

See `.agents/skills/design-promote/SKILL.md`. Praise is not the command. "Looks good",
"đẹp đấy", "ok tiếp đi" all mean *keep iterating*. Until `/design-promote` runs, the
screen on disk is a draft and the token files still describe the old baseline.

This is what keeps one design system: a skill may propose any palette it likes, but nothing
enters `root-design-fe.md` except through a promote commit the human triggered.

**Baseline version.** `root-design-fe.md` frontmatter carries `design_baseline: vN` — the
current design. Every built screen's spec carries its own `design_baseline:` — the version
that screen's code actually follows. Build a new screen at the current version and stamp it.
A screen below the current version is **behind, not broken** — it looks older, that is all;
catch it up when convenient, one commit per screen, never mixed with feature work.

```bash
grep -rn "design_baseline:" docs/front-end-design-docs/specs/   # who is behind
```

Only `/design-promote` bumps the root version. Never edit `design_baseline` by hand.

## Skill Rules

**Agents use skills freely. No permission needed, no announcement needed.** A skill is a
tool, not an architecture decision — the thing that needs approval is the *plan*, not which
skill you opened to write it.

- Project skills live at `.agents/skills/<name>/SKILL.md`. That path **is** the skill.
- Tool-level packs (`superpowers`, `ui-ux-pro-max`) install via `/plugin` and **never** drop
  files into this repo. A skill that insists on its own directory in the repo (`spec-kit`,
  which writes `specs/`) is not installed here — it collides with the existing pipeline.
- **Using a skill is free; installing one into `.agents/skills/` needs approval.** Adding a
  file to the repo is a repo change like any other.
- Precedence for **UI screens**: if a skill proposes its own planning flow, this project's
  pipeline wins — `flow-mapper → Page Contract → page-designer → spec → mockup → code`.
  Skills supply layout, interaction and craft *inside* that pipeline; they do not replace it.
- A skill's palette, fonts or tokens never land in shipped code directly. They arrive via
  `/design-promote` (above) or not at all.
- Say in the PR description which skills shaped the result. "Layout came from ui-ux-pro-max"
  is something the next agent needs.

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
