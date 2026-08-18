---
name: design-promote
description: Promote a shipped screen's design into the project design baseline and bump the baseline version. Run ONLY when the human explicitly types /design-promote <screen> after the code is pushed. Updates root-design-fe.md tokens and design_baseline, _DESIGN-SYSTEM.md shared patterns, the screen's spec, the _INDEX Design column, and lists which screens are now behind. Never run on your own initiative, never inside a feature commit.
---

# design-promote

The human has looked at the shipped screen and approved how it looks. This skill turns that
approval into the project's design baseline, and stamps a version so every other screen can
be told "you are behind" without anyone having to remember.

## When this runs

**Only** when the human types the command, and **only** after the screen's code is pushed:

```
/design-promote <screen>        # /design-promote admin-profile
```

Never run it because a design looks finished. Never run it because the human said "nice",
"đẹp đấy", "ok tiếp đi", or approved a plan. Those all mean *keep iterating*. Approval of a
plan is not approval of a design.

If the code is not pushed, stop and say so. This promotes what is on `origin`, not what is
in the working tree — otherwise the baseline describes a design nobody can check out.

## Refuse and report if

- The named screen has no spec under `docs/front-end-design-docs/specs/`
- The screen's row in `pages/_INDEX.md` is not `built`
- The working tree is dirty (`git status --porcelain` non-empty)
- HEAD is not pushed (`git log origin/HEAD..HEAD` non-empty)
- More than one screen is named — one screen per promote commit

---

## Step 1 — Read what actually shipped

Read the real files. Not the mockup, not the spec:

```
apps/web/src/app/<route>/**
apps/web/src/lib/status.ts
apps/web/src/styles/** , *.module.css , tailwind.config.ts , globals.css
```

Extract every design value the code uses: colours, spacing scale, radii, font
sizes/weights/families, shadows, breakpoints, transition timings, z-index layers.

## Step 2 — Diff against the current baseline

Compare against `docs/front-end-design-docs/root-design-fe.md`. Classify each value:

| Class | Meaning | Action |
|---|---|---|
| **Match** | already a token, used correctly | nothing |
| **New** | a real new design decision | add as a named token |
| **Drift** | same role as an existing token, slightly different value | ⚠️ **stop and ask** |
| **One-off** | genuinely local to this screen | leave in the screen, do not promote |

**Never silently reconcile Drift.** Two blues 3% apart is how a design system dies. List them
and let the human pick which value wins.

## Step 3 — Decide the version bump

Read `design_baseline:` from `root-design-fe.md` frontmatter.

- **Any token added or changed** → bump to the next version (`v1` → `v2`). Every built
  screen not promoted in this commit is now one version behind.
- **Nothing changed** (the screen already matched the baseline) → **do not bump.** Say so and
  stop. A version that moves without a change makes every other screen falsely "behind", and
  the human ends up chasing updates that are not needed.

There are no minor/patch versions. One integer, one meaning: *did the look change*.

## Step 4 — Write the baseline — one commit, nothing else in it

1. **`root-design-fe.md`**
   - add/update the tokens
   - frontmatter: `design_baseline: v<N+1>`, `baseline_updated: <date>`
   - add a row to `### Baseline history`: version, date, what changed, promoted from
2. **`specs/_DESIGN-SYSTEM.md`** — only if a **shared** pattern changed (a component used on
   more than one screen). Screen-specific detail does not belong here.
3. **`specs/<role>-pages/<screen>.spec.md`**
   - make the spec describe the code that shipped
   - frontmatter: `design_baseline: v<N+1>` ← this screen is current
4. **`pages/_INDEX.md`** — set this screen's `Design` column to the new version. **Leave
   every other row alone** — they are behind now, and the table showing that is the point.
5. **`ai/PROGRESS.md`** — one line:
   `Design baseline v<N> → v<N+1> promoted from <screen> — <date> — <n> tokens added, <n> changed. Behind: <list>`

Commit message: `design(baseline): promote <screen> — v<N> to v<N+1>`

**Nothing else in this commit.** No feature code, no fixes, no unrelated doc edits. The next
agent must be able to run `git log --grep "design(baseline)"` and see exactly when the look
changed and what changed it.

## Step 5 — Hardcoded values are tech debt, not tokens

If the screen hardcodes a colour instead of reading `apps/web/src/lib/status.ts`, promoting
the value does not fix that — the code still bypasses the token layer. File a `WEB-00N` in
`ai/known-issues/KNOWN_ISSUES.md` for each and say so in the report.

## Step 6 — Report, and name what is now behind

```bash
grep -rn "design_baseline:" docs/front-end-design-docs/specs/
```

State plainly:

- **new version**, and the one-line reason it moved
- tokens added (name → value)
- tokens changed (name → old → new)
- **screens now behind**, from the grep — route, old version, and roughly what will visibly
  change when each catches up
- Drift items the human still has to decide
- one-offs deliberately left in the screen
- new `WEB-00N` entries
- `pnpm check:docs` output

A **changed** token is a retroactive edit to every screen that reads it. Those screens do not
break — they just look mixed until they catch up. The human should learn that from this
report, not from a screenshot next week.

---

## Prompts to hand the next agent

Copy one of these. They are the whole point of the versioning — an agent that reads them does
not need this session's context.

### A. Building a new screen (always at the current baseline)

```
Read AGENTS.md and the always-loaded context.
Check `design_baseline:` in docs/front-end-design-docs/root-design-fe.md — build at THAT
version. Tokens come from that file only; components never pick their own colours.
Use any skill you want for layout and craft. A skill's palette does not go into the code —
if a skill proposes a colour that is not a token, keep it out and list it in your report as
a candidate for /design-promote.
When the screen ships, stamp `design_baseline: <that version>` in its spec frontmatter and
set the Design column in pages/_INDEX.md. Do NOT bump the version in root-design-fe.md —
only /design-promote does that, and only I run it.
```

### B. Catching up a screen that is behind

```
Read AGENTS.md and the always-loaded context.
TASK: bring <route> up to design baseline <current version>. Its spec says <old version>.
1. Diff the two versions: `git log -p --grep "design(baseline)" -- docs/front-end-design-docs/root-design-fe.md`
   Read the `### Baseline history` table for what changed and why.
2. Apply ONLY the token changes. This is not a redesign and not a refactor — the layout,
   the copy and the behaviour stay exactly as they are. If you find yourself improving
   something, stop: that is a separate task.
3. Verify: pnpm --filter web build, then screenshot desktop + 375px and READ them.
   Compare against the screenshots in the promote commit for <screen that set the baseline>.
4. Update the spec frontmatter to `design_baseline: <current>` and the _INDEX Design column.
5. Commit alone: `design(baseline): catch up <route> to v<N>`
Do not touch root-design-fe.md. Do not bump the version. Do not promote anything.
```

### C. Which screens are behind

```
grep -rn "design_baseline:" docs/front-end-design-docs/specs/
grep -n "design_baseline:" docs/front-end-design-docs/root-design-fe.md
```

Any spec below the root value is behind. A spec with `status: built` and **no**
`design_baseline:` line was built before versioning — treat it as behind and stamp it during
its next catch-up.

Catching up is never urgent. A screen at v1 in a v3 app works fine; it just looks older.
Batch the catch-ups when it suits — one commit per screen, still.
