---
status: active
owner: Nhật
last_updated: 2026-08-11
related:
  - ai/skills/flow-mapper.md
  - docs/front-end-design-docs/root-design-fe.md
  - ai/rules/multi-agent-workflow.md
---

# Skill: page-designer

> **What it does:** turns a Page Contract into a **Design Spec** — a single portable
> document listing everything the page must contain, written to be pasted into
> Claude Design (with the `ui-ux-pro-max` skill) to produce an HTML mockup.
>
> **Pipeline:**
> `flow-mapper` → Page Contract → **`page-designer` → Design Spec** → Claude Design +
> `ui-ux-pro-max` → HTML mockup → review → build in `apps/web/**`.
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

## 5. Inputs — read these, in this order

| # | Read | For |
|---|---|---|
| 1 | the Page Contract | route, access, regions, states, actions, out-of-scope |
| 2 | `docs/front-end-design-docs/root-design-fe.md` | every token, component convention, checklist |
| 3 | `docs/entities/**/ENTITY_<X>.md` for each entity shown | **real field names and enum values** |
| 4 | `docs/api/API_<ROLE>.md` | response shape behind each region |
| 5 | `docs/api/API_ERROR_CODES.md` | the envelope + what error states must render |
| 6 | `docs/front-end-design-docs/pattern-catalog.md` (if present) | already-solved novel patterns |

**Read the entity spec, not just the feature doc.** Feature docs drift — they describe
intent, entity specs describe what exists. When they disagree, the entity wins, and
say so in the spec. (Real case: `FEATURES_ADMIN` claimed `last_login_at` still needed
adding; `ENTITY_USER.md` already had `lastLoginAt`. The feature doc was stale.)

Add anything else the page genuinely needs — a flow doc for a multi-step operation, an
ADR for a contested decision. Adding a source is fine; skipping entity specs is not.

## 6. Output: the Design Spec

One file per page at:

```
docs/front-end-design-docs/specs/<role>-pages/<screen-slug>.spec.md
```

### The rule that governs this whole document

**Claude Design cannot read your repo.** It sees only the text pasted into it. So a
Design Spec that says "tokens per root-design-fe.md §2" is worthless — that reference
resolves to nothing, and the model will invent a palette.

Every spec must therefore be **self-contained**: inline the hex values, the font import,
the pixel dimensions, the enum→colour map, the exact copy strings, and realistic sample
data. Redundancy with the repo is the point, not a flaw. This is the single most
important property of the artifact.

### Required sections

| § | Section | Must contain |
|---|---|---|
| 0 | Build target | one self-contained HTML file, viewports, static data |
| 1 | Product context | what the product is, who uses this screen, tone — **and the styles explicitly rejected** |
| 2 | Design tokens | full colour table, status enum→hex map, font `@import`, spacing/radius/shadow, breakpoints, icon set + sizes |
| 3 | Layout shell | ASCII diagram with real pixel dimensions; nav items with the active one marked |
| 4 | Page structure | regions top to bottom; state what is **not** on the page |
| 5 | Component specs | per component: columns, sizes, hover/focus, variants |
| 6 | Data | **real JSON sample rows**, deliberately covering edge cases (nulls, every enum value) |
| 7 | States | all seven, each described visually; N/A ones marked with a reason |
| 8 | Copy | exact strings in the product's UI language, in a table |
| 9 | Interactions | click targets, transitions, keyboard, responsive collapse |
| 10 | Constraints — do NOT | anti-patterns, including things a generic generator would add |
| 11 | ui-ux-pro-max instructions | what to use it for, and that §2/§10 override anything it suggests |
| 12 | Deliverable | file format, what must render, contrast requirement |

### The sections that do the real work

**§6 sample data.** Hand-write rows that cover the awkward cases — a null date, every
enum value, a long name. Generic sample data produces a mockup that only proves the
happy path renders.

**§7 states.** Require Empty and Error explicitly and describe what they look like.
Left unstated, every generator returns Ready only, and the gap is discovered in QA.

**§10 do-NOTs.** Name the things a general-purpose design model reaches for by default:
gradients, glassmorphism, dark themes, emoji icons, invented status colours, KPI tiles
where none belong. Prohibiting them costs one line each and saves a regeneration.

**§11.** Always state that the locked tokens beat any suggestion. `ui-ux-pro-max`
contributes layout and interaction quality; it does not get a vote on brand.

### After the spec

Set `status: designed` in the Page Contract frontmatter and link the spec from it.
Once the mockup is approved and the component is built, set `status: built`.

---

## 7. Pre-flight checklist

Run `root-design-fe.md` §7 as written against the returned mockup — it is the authority,
do not restate it here. These are the additional checks:

- [ ] Spec is genuinely self-contained — no reference to a repo file the designer cannot open
- [ ] Every hex in the mockup traces to spec §2; none invented
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
