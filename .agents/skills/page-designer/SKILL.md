---
name: page-designer
description: Turn an existing Page Contract into a page spec - page description plus API
  mapping - ready to paste into Claude Design alongside _DESIGN-SYSTEM.md to produce an
  HTML mockup. Contains the effort ladder deciding when a screen is pure composition and
  when to reach for ui-ux-pro-max or taste-skill. Requires a Page Contract from
  flow-mapper first; do not run it on a feature that has none.
---

<!-- CANONICAL SOURCE. This file IS the skill; there is no copy elsewhere.
     Antigravity discovers it here. AGENTS.md / CLAUDE.md point here.
     Previously lived at ai/skills/page-designer.md - moved 2026-08-14, do not recreate that path.
     Original metadata:
       status: active
       owner: Nhật
       last_updated: 2026-08-11
       related:
         - ai/skills/flow-mapper.md
         - docs/front-end-design-docs/root-design-fe.md
         - ai/rules/multi-agent-workflow.md
-->

# Skill: page-designer

> **What it does:** turns a Page Contract into a **page spec** — a short, portable
> document holding the page description and its API mapping, written to be pasted into
> Claude Design alongside the shared `_DESIGN-SYSTEM.md` to produce an HTML mockup.
>
> **Pipeline:**
> `flow-mapper` → Page Contract → **`page-designer` → `_DESIGN-SYSTEM.md` (once) + page spec (per screen)**
> → Claude Design + `ui-ux-pro-max` → HTML mockup → review → build in `apps/web/**`.
>
> **The designer has no repo access.** It sees only the two files pasted into it. That
> constraint decides everything about how these files are split — see §6.
>
> **The core idea:** this project already made its design decisions. They are locked in
> `docs/front-end-design-docs/root-design-fe.md`. For almost every screen, designing is
> **lookup, not invention** — and lookup is cheap. External design skills are an
> escalation path, not the default.

**Requires:** a Page Contract from `ai/skills/flow-mapper.md`. No contract → no page.
Go run flow-mapper.

---

## 1. Lane check — read this before writing a file

`apps/web/**` is **codex's lane** (`ai/rules/multi-agent-workflow.md` §2). If you are not
codex and parallel work is active:

- You may write the **Design Spec** (§6) — it lives in `docs/`, which is claude's lane.
- You may **not** write the component. Hand the spec and the approved mockup over via
  `## Needs from the other lane` in `ai/PROGRESS.md`.

If you are the only agent running, ignore this section and do both.

---

## 2. The effort ladder

Pick the **lowest tier that applies**. Do not climb the ladder for comfort; each rung
costs real tokens and real wall-clock, and Tier 0 is correct for most of this app.

| Tier | When | Cost | External skill |
|---|---|---|---|
| **0 — Compose** | The screen uses only patterns already in `root-design-fe.md` §4 | ~1 file read | none |
| **1 — Extend** | The screen needs a pattern the catalog does not have | 1 search + catalog write | `ui-ux-pro-max` |
| **2 — Craft** | Public-facing / marketing / first-impression surface | full generation pass | `taste-skill` |

**Default to Tier 0.** Every Admin, Teacher and Student screen in S0–S9 is an internal,
authenticated, data-dense tool. `root-design-fe.md` §1 rules out the exploratory visual
styles on purpose ("công cụ quản lý, không phải landing page"). Reaching for a design
generator on a roster table is not thoroughness — it is waste that produces a screen
inconsistent with the other forty.

---

## 3. Tier 0 — Compose (the default path)

**Read exactly two files:** the Page Contract, and `root-design-fe.md`.

Map each contract Region to a catalogued component. The mapping is mechanical:

| Contract says | Build with | Spec lives in |
|---|---|---|
| "KPI row — N tiles" | KPI Card ×N, max 6 | root-design-fe §4.1 |
| "…table", "roster", "list of X" | Data Table, sticky header, pagination | §4.2 |
| any enum value rendered | Status Badge, colour mapped from the enum table | §2.1 + §4.3 |
| "Empty — …" state | Empty State, icon + one line + CTA | §4.4 |
| "confirm", "approve", quick action | Modal | §4.5 |
| multi-step create/edit | full page, not a modal | §4.5 |
| "chart", "trend", "distribution" | Recharts, chart type chosen by data shape | §6 |

**The non-negotiables, because they are where AI-generated pages actually fail here:**

- **Status colours are looked up, never chosen.** `root-design-fe.md` §2.1 maps every
  schema enum to a hex. Map the enum → colour from that table. A component that decides
  its own badge colour is a defect, even if the colour looks fine.
- **No emoji as icons.** Lucide only, at 16 / 20 / 24px (§5).
- **Tables become card lists below 768px.** Never horizontal-scroll a wide table (§4.2).
- **Skeletons, not full-page spinners** (§4.7).
- **Toast verb matches the button verb** — "Duyệt" → "Đã duyệt" (§4.7).
- **Labels are permanent**, placeholders are not labels (§4.5).

If every Region maps cleanly, **you are done deciding.** Write the Design Spec (§6) and
run the checklist (§7). No external skill call.

---

## 4. Escalation

### Tier 1 — `ui-ux-pro-max`

**Trigger:** a Region has no catalog entry — e.g. the SRS flashcard flip surface, the
weekly skill heatmap, the live quiz room, the VietQR payment screen. Genuinely new
interaction patterns, not "a table but different".

Search the **specific pattern**, not the project:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "spaced repetition flashcard review" --domain style
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "activity heatmap calendar" --domain style
```

**Do not run `--design-system`.** That generates a whole design system — colours,
typography, effects — and this project already has one. Importing a second system is how
the app ends up with two visual languages. You want the *pattern and its anti-patterns*,
nothing else.

Then **discard everything that conflicts with `root-design-fe.md`**: its palette, its font
pairing, its effects. Keep only the layout/interaction structure and the anti-pattern
list. Tokens always win.

**Write the result down.** Append to `docs/front-end-design-docs/pattern-catalog.md`
(create if absent):

```markdown
## <Pattern name>
- Used by: <route(s)>
- Structure: <2–4 lines>
- Anti-patterns to avoid: <list>
- Source: ui-ux-pro-max <query> — YYYY-MM-DD
```

Once catalogued, the pattern is **Tier 0 forever**. This is the compounding part: the
tenth page costs a fraction of the first, and only if you actually write the entry.

### Tier 2 — `taste-skill`

**Trigger:** the surface is public and unauthenticated — landing page, pricing, the
login/register shell, a share page. Roughly three or four screens in this entire project.

Install: `npx skills add Leonxlnx/taste-skill`

Preset the dials. Left to defaults, taste-skill will produce something far more
expressive than this product wants:

| Dial | Internal dashboard | Public surface |
|---|---|---|
| `DESIGN_VARIANCE` | **low** — centred, conventional | medium |
| `MOTION_INTENSITY` | **low** — hover/focus only | medium, honour `prefers-reduced-motion` |
| `VISUAL_DENSITY` | **high** — data-dense | low |

Even at Tier 2, the palette and font pairing from `root-design-fe.md` §2.1–2.2 stay
locked. taste-skill governs layout, rhythm, and motion — not brand.

**Never run Tier 2 on an authenticated dashboard page.** It will fight §1 of the root
design doc, which deliberately rejects gradient/neon/AI-dashboard styling for an audience
of accountants and teachers handling tuition and payroll.

---

## 5. Preflight — check inputs before writing anything

| Required | Where | If missing |
|---|---|---|
| Page Contract | `docs/front-end-design-docs/pages/<role>-pages/<slug>.md` | **STOP.** Run `flow-mapper` first |
| `root-design-fe.md` | `docs/front-end-design-docs/` | **STOP.** Report it by name. Do **not** invent tokens |
| `_DESIGN-SYSTEM.md` | `docs/front-end-design-docs/specs/` | Generate it from `root-design-fe.md` before any page spec |
| Entity specs | `docs/entities/**/ENTITY_<X>.md` | Continue; mark unknown fields `TODO(field)` and say which entity was missing |
| `API_<ROLE>.md` | `docs/api/` | Continue; mark **every** endpoint `⛔` |
| `API_ERROR_CODES.md` | `docs/api/` | Continue; mark **every** error `TODO(error-code)` |
| `ui-ux-pro-max` | `.claude/skills/ui-ux-pro-max/` | Report: not installed → `npm i -g ui-ux-pro-max-cli && uipro init --ai claude`. Tier 1 unavailable until then |
| `taste-skill` | installed skills | Report: `npx skills add Leonxlnx/taste-skill`. Tier 2 unavailable |
| `pattern-catalog.md` | `docs/front-end-design-docs/` | Fine — it does not exist until the first Tier 1 escalation |

**Never silently substitute.** Name the missing file, say what it blocks, and either stop
or continue with explicit `⛔` / `TODO()` markers. A spec that quietly invented a palette
or an endpoint is worse than one that stopped.

**Read the entity spec, not just the feature doc.** Feature docs describe intent, entity
specs describe what exists. When they disagree the entity wins — say so in the spec.
(Real case: `FEATURES_ADMIN` claimed `last_login_at` still needed adding; `ENTITY_USER.md`
already had `lastLoginAt`.)

---

## 6. Output: two files, not one

### The rule that governs both

**The designer sees only what is pasted into it. It has no repo access.** So a spec saying
"tokens per root-design-fe.md §2" resolves to nothing and the model invents a palette.

But inlining tokens into every page spec means N copies of the same 120 lines, and a token
change means editing N files. So the content splits by *what varies*:

| File | Holds | Written |
|---|---|---|
| `specs/_DESIGN-SYSTEM.md` | everything identical across screens — tokens, shell, standard components, the seven states, chart rules, global do-NOTs, `ui-ux-pro-max` instructions, deliverable format | **once per project** |
| `specs/<role>-pages/<slug>.spec.md` | only what is specific to this page | one per screen |

The user pastes both. Regenerate `_DESIGN-SYSTEM.md` only when `root-design-fe.md` changes.

### The page spec — required sections

| § | Section | Must contain |
|---|---|---|
| 1 | Purpose | one paragraph: what the user came here to do |
| 2 | Access | roles, ownership rule, denial behaviour |
| 3 | **API mapping** | region/action → method + path → envelope field → error codes, with `⛔` on anything that does not exist |
| 4 | Page structure | regions top to bottom; state what is **not** on the page |
| 5 | Component specs | only components this page introduces or configures |
| 6 | Data | real JSON sample rows covering nulls and every enum value |
| 7 | States | which of the seven apply, described visually; N/A ones with a reason |
| 8 | Copy | exact strings in the product's UI language |
| 9 | Interactions | clicks, transitions, keyboard, responsive collapse |
| 10 | Do NOT | **page-specific only** — global ones live in `_DESIGN-SYSTEM.md` |

Every page spec opens with: *"Paste with `_DESIGN-SYSTEM.md`. If you were not given it,
stop and ask — do not invent tokens."* That line is what makes a missing shared file fail
loudly instead of silently.

### The sections that do the real work

**§3 API mapping.** The one section an engineer reads. Every action names its endpoint,
its envelope field and its error codes. `⛔` marks what does not exist — this is where
missing backend surface gets discovered, before anyone builds against it.

**§5 must not restate the standard components.** Do not re-describe a data table or a
status pill; `_DESIGN-SYSTEM.md` §4 has them. Describe only this page's columns, its
modals, its unusual pieces.

**§6 sample data.** Hand-write rows covering the awkward cases — a null date, every enum
value, a long name. Generic data only proves the happy path renders.

**§7 states.** Require `Empty` and `Error` explicitly and describe what they look like.
Unstated, every generator returns `Ready` only and the gap surfaces in QA.

**§10 page-specific do-NOTs only.** "No emoji icons" is global. "Do not put a record-payment
button on the list page" is page-specific.

### After the spec

Set `status: designed` in the Page Contract and link the spec. Once the mockup is approved
and the component is built, set `status: built`.

---

## 7. Pre-flight checklist

Run `root-design-fe.md` §7 as written against the returned mockup — it is the authority,
do not restate it here. These are the additional checks:

- [ ] Page spec references **no** repo file the designer cannot open, except `_DESIGN-SYSTEM.md`
- [ ] Page spec does not restate tokens or standard components — those live in the shared file
- [ ] §3 API mapping names an endpoint, envelope field and error code for every action
- [ ] Everything that does not exist yet is marked `⛔` or `TODO()`, never quietly omitted
- [ ] Every hex in the mockup traces to `_DESIGN-SYSTEM.md` §2; none invented
- [ ] Empty and Error states actually rendered, not just Ready
- [ ] Sample data covers nulls and every enum value

Then, when the component is built from the approved mockup:

- [ ] All seven contract states are actually implemented, not just Ready
- [ ] Every status badge colour traced to the §2.1 enum table — none chosen locally
- [ ] Every error path renders a code from `docs/api/API_ERROR_CODES.md`
- [ ] Response reads `data.*` through the envelope in `docs/api/API_CONVENTIONS.md`
- [ ] Access token read from the Zustand store, never `localStorage`
      (`ai/rules/working-rules.md` § Auth Rules)
- [ ] Nothing in `Out of scope` from the contract was built anyway
- [ ] Tier 1 patterns written into `pattern-catalog.md` before finishing
- [ ] Contract frontmatter advanced to `built`

---

## 8. Why this is the low-effort path

The instinct is that "lowest effort" means a shorter prompt. It does not — it means
**fewer decisions taken more than once**.

- The design system is decided once, in `root-design-fe.md`, not per page.
- Each novel pattern is decided once, in `pattern-catalog.md`, not per page.
- Each screen's routes, roles and states are decided once, by flow-mapper, not per
  generation attempt.

What is left per page is composition, which is close to free. The expensive failure mode
this replaces is the three-round loop: generate → "that's not our colour" → regenerate →
"where's the empty state?" → regenerate. Two cheap upstream files kill both rounds.
