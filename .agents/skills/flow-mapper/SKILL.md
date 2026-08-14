---
name: flow-mapper
description: Turn one feature into a Page Contract before any screen is built - route,
  RBAC, the 7 UI states, data shape, and the exact endpoint each action fires. Also
  produces the per-role Flow Map showing how screens connect. Use this BEFORE
  page-designer, always, for any new screen in this HSK platform. Do not design or code
  a screen that has no contract.
---

<!-- CANONICAL SOURCE. This file IS the skill; there is no copy elsewhere.
     Antigravity discovers it here. AGENTS.md / CLAUDE.md point here.
     Previously lived at ai/skills/flow-mapper.md - moved 2026-08-14, do not recreate that path.
     Original metadata:
       status: active
       owner: Nhật
       last_updated: 2026-08-11
       related:
         - ai/skills/page-designer.md
         - docs/shared/RBAC_MATRIX.md
         - docs/flows/
         - docs/front-end-design-docs/root-design-fe.md
-->

# Skill: flow-mapper

> **What it does:** produces two artifacts per role —
> a **Page Contract** per screen (what one screen is) and a **Flow Map** for the role
> (how the screens connect, and which endpoint every action fires).
>
> Both are required. A set of contracts without a flow map describes rooms but no doors:
> you cannot see the traversal, the prerequisite ordering, or which transition hits which
> API. That is the question people actually ask of this document.
>
> **Why it exists:** the expensive part of AI page generation is not writing JSX, it is
> re-discovering routes, roles, states and endpoints on every attempt. flow-mapper pays
> that cost **once per screen** and writes it down.

**Pairs with:** `ai/skills/page-designer.md` (consumes what this produces).
Run flow-mapper first. Never run page-designer without a Page Contract.

---

## 1. When to use / when NOT to use

**Use when:**
- Starting any sprint item that adds or changes a screen in `apps/web/**`
- A feature exists in `docs/actors/<role>/FEATURES_<ROLE>.md` but has no route yet
- An existing page needs a new state (empty, error, permission-denied) specified

**Do NOT use when:**
- Changing copy, spacing, or a colour on an existing page → edit the page directly
- Backend-only work → no screen, no contract
- The screen already has a Page Contract and the contract is still accurate → reuse it,
  do not regenerate. **Regenerating an accurate contract is the single most common way
  this skill gets wasted.**

---

## 2. Read budget — the whole point of this skill

**Read at most these five things. Do not open the rest of `docs/`.**

| # | Read | To get |
|---|---|---|
| 1 | `docs/actors/<role>/FEATURES_<ROLE>.md` | the feature's ID (`F2.3`) and its acceptance behaviour |
| 2 | `docs/shared/RBAC_MATRIX.md` | who may see this screen at all |
| 3 | `docs/actors/<role>/PERMISSIONS_<ROLE>.md` | field-level and action-level limits within the screen |
| 4 | `docs/api/API_<ROLE>.md` | the endpoints this screen calls |
| 5 | `docs/flows/FLOW_<X>.md` — **only if** the screen is a step in a cross-actor flow | ordering and hand-off between actors |

Do **not** read `DATABASE_SCHEMA.md`, entity specs, or `PROJECT_STRUCTURE.md` at this
stage. If you find yourself needing a raw DB column to describe a screen, you are
designing the API, not the page — stop and raise it under `## Needs from the other lane`
in `ai/PROGRESS.md` (see `ai/rules/multi-agent-workflow.md` §4).

If a needed endpoint does not exist in `docs/api/`, **do not invent it**. Write it into
the contract's `Blocked on` field and continue — page-designer will build against a mock.

---

## 3. Output: the Page Contract

One file per screen, at:

```
docs/front-end-design-docs/pages/<role>-pages/<screen-slug>.md
```

Examples: `teacher-class-detail.md`, `admin-invoice-list.md`, `student-attempt-take.md`.

Copy this template verbatim and fill it. **Keep it under 60 lines.** A contract longer
than that is a sign the screen should be split into two.

```markdown
---
feature: F2.5
role: teacher
route: /teacher/classes/[classId]
status: contracted        # contracted | designed | built
last_updated: YYYY-MM-DD
---

# Page Contract — Teacher · Class Detail

## Purpose
One sentence. What the user came here to do.

## Access
- Allowed roles: teacher
- Ownership rule: teacher must own `classId` (service-layer check, not just role guard)
- On denial: redirect to `/teacher/classes` + toast `CLASS_FORBIDDEN`

## Entry points
- From: Teacher Dashboard → "My Classes" table row click
- Deep link: yes (shareable URL)

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| class header | `GET /api/v1/classes/:id` | `data.class` |
| student roster | `GET /api/v1/classes/:id/students` | `data.students[]` |

Blocked on: <endpoint that does not exist yet, or "none">

## Regions
Top → bottom, in DOM order. Name each region; do not describe visuals.
1. Page title + primary action ("Add assignment")
2. KPI row — 4 tiles: students, assignments open, avg score, attendance %
3. Roster table — sortable, bulk-select for removal

## States
Every screen ships all seven. Mark N/A only with a reason.
- [ ] Loading — skeleton, per region
- [ ] Ready — the normal case
- [ ] Empty — no students yet → CTA "Share enrollment code"
- [ ] Partial — roster loaded, KPI still resolving
- [ ] Error — fetch failed → inline retry, page shell stays
- [ ] Forbidden — see Access
- [ ] Offline / stale — N/A (reason: no offline support in S0–S9)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Remove student | row menu → Remove | confirm modal → optimistic row removal | `ENROLLMENT_NOT_FOUND` |

## Out of scope
List what this page explicitly does not do, so page-designer does not invent it.
```

---

## 3b. Output: the Flow Map (one per role — NOT optional)

One file per role, at `docs/front-end-design-docs/pages/<role>-pages/<role>-flow.md`.

The contracts describe screens in isolation. The Flow Map is the **traversal**: node =
route, edge = user action, and every edge is annotated with the endpoint it fires.
Write it **after** the contracts for that role, deriving it from their `Entry points`
and `Actions` sections — never from memory.

Required sections, in order:

1. **Entry** — how the role arrives (login → landing route)
2. **One tree per nav branch** — ASCII, using this exact vocabulary:

```
/route  Screen Name                      GET /api/v1/...
│
├── Action → Interstitial → Destination  METHOD /api/v1/...
│
└── Action
    ▼
    /nested/route  Screen Name           GET /api/v1/...
    ├── Action → Confirm → same screen   PATCH /api/v1/...
    └── Back            → parent
```

- `→` is a step inside one transition (`Delete → Confirm → List`)
- `▼` is a route change
- `⛔` prefixes any endpoint that does not exist yet
- A modal or drawer is a node **without** a route change — say so explicitly
- Annotate the endpoint on the edge, not the node, when the action mutates

3. **Full transition table** — `# | From | Action | To | API | Errors`. One row per
   edge in every tree. This is the machine-readable form; the trees are the readable one.
4. **Entity state transitions** — the enum state machines these actions drive
5. **Missing endpoints** — everything marked `⛔`, collected

**Say what is absent and why.** If the role has no create path, no delete path, no edit
path, write that down with its reason (self-serve registration, undecided behaviour,
permission not granted). A reader comparing against a generic CRUD flow will otherwise
assume you forgot.

## 4. The rules that make contracts cheap to consume

**Routes.** Mirror the RBAC role in the first segment: `/admin/...`, `/teacher/...`,
`/student/...`. Dynamic segments use the entity name: `[classId]`, `[attemptId]` — never
`[id]`. This lets page-designer infer the Next.js App Router folder path with no thinking.

**States are mandatory, not optional.** The seven-state list is fixed. Most AI-generated
pages ship only Ready, and every follow-up prompt after that is a bug report. Enumerating
states in the contract is what removes the second and third generation pass.

**Error codes come from `docs/api/API_ERROR_CODES.md`.** Never invent one. If the right
code does not exist, write `TODO(error-code)` and flag it in `ai/PROGRESS.md`.

**Regions are named, not styled.** flow-mapper says "KPI row — 4 tiles". It never says
`#2563EB`, `240px`, or "glassmorphism". All visual decisions belong to page-designer,
which inherits them from `docs/front-end-design-docs/root-design-fe.md`. Mixing the two
is what forces a redesign when a token changes.

**One screen per contract.** A modal is part of its parent screen. A drawer is part of
its parent screen. A separate route is a separate contract.

---

## 5. Batch mode — mapping a whole sprint at once

Cheapest way to run this skill. For a sprint item covering several screens:

1. Read the five sources in §2 **once**, for the whole role.
2. List every route the sprint item implies. Confirm the list with the user before
   writing files — a wrong route list is cheap to fix now, expensive later.
3. Emit all contracts in one pass.
4. **Emit the Flow Map (§3b) for the role.** Derive it from the contracts just written.
   This is where prerequisite ordering between screens becomes visible — it is the step
   that catches "you cannot invoice before a rate exists".
5. Append the route list to `docs/front-end-design-docs/pages/_INDEX.md` (create it if
   absent) as a table: `route | role | feature | contract file | status`, and link the
   role's Flow Map at the top of its section.

The index is what lets a later agent answer "does this screen already exist?" with one
file read instead of a directory crawl.

---

## 6. Definition of done

- [ ] Contract file exists at the path in §3, under 60 lines
- [ ] All seven states addressed (or marked N/A with a reason)
- [ ] Every endpoint either exists in `docs/api/` or is listed under `Blocked on`
- [ ] Every error code exists in `docs/api/API_ERROR_CODES.md` or is marked `TODO(error-code)`
- [ ] Row added to `docs/front-end-design-docs/pages/_INDEX.md`
- [ ] `status: contracted` in frontmatter
- [ ] **`<role>-flow.md` written (§3b)** — trees + full transition table + state machines
- [ ] Every `Action` row in every contract appears as an edge in the Flow Map, and
      every Flow Map edge traces back to a contract. **They must not drift.**
- [ ] `ai/PROGRESS.md` claim line updated per `ai/rules/multi-agent-workflow.md` §3

Then hand off to `ai/skills/page-designer.md`.
