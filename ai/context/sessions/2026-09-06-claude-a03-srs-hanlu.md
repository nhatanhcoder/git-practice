## [2026-09-06] — A03: SRS screen restyled in the Hán Lộ design — Claude Code — branch `feat/a03-srs-hanlu`

**Context**: task A03 from `docs/prompts/student-integration-checklist.md`. Checked state first,
as the document requires: A00 ✅ (antigravity), A01 ✅ (codex, merged as PR #43), **A02 🔶 codex
working in `D:\PersonalProject\Real` right now** — 19 uncommitted files, last touched 26 minutes
before I looked. A03 depends only on A00, so it was the next available task.

Worked in the existing sibling worktree `Real-claude-student` rather than the occupied checkout,
and rather than creating a new folder.

**Done** — presentation only, on `apps/web/src/app/student/(app)/mistakes/page.tsx`:
- `ui.tsx` primitives replaced with `PageHead`, `Tabs`, `Metric`, `LevelSelector`, `Panel`,
  `EmptyState`, `ErrorState`, `SkeletonPanel`. `Tabs` brings arrow-key navigation for free.
- New `src/styles/hanlu/srs.css` for the card, tiles and ratings.

**The palette was the substance of this task.** The four rating buttons carried literal Tailwind
values — `border-red-200`, `text-amber-700`, `bg-white`. That was a third colour system on top
of the two the product already had, it ignored the light/dark switch entirely, and on the dark
ground it was close to unreadable. Each rating now passes a semantic token in as
`--srs-rating`, so a single CSS rule serves all four.

**Class names were checked, not assumed.** The generic names this screen wanted — `grid-3`,
`grid-4`, `panel--warn` — do not exist in the Hán Lộ sheets. Using them would have produced
silently unstyled markup, which is exactly how the auth screens ended up with a 1.09-contrast
heading earlier in this session. Every class is `srs-` prefixed and verified against its
definition: **17 used, 17 defined.**

**Unchanged and verified rather than asserted**: SM-2, ratings 0/3/4/5, browse/due, HSK 1–9,
payloads, schema, design baseline.

**Self-test** — live API, production build:

| Check | Result |
|---|---|
| Browse HSK 1 / HSK 9 | `?hskLevel=1` then `?hskLevel=9`, returns the HSK 9 card |
| Due queue | `GET /student/flashcards/due` — the endpoint, not a local filter |
| Before flip | **0** rating buttons; "Lật thẻ" present |
| After flip | meaning + example; exactly 4 ratings, Quên / Khó / Tốt / Dễ |
| Rating | `POST /student/flashcards/:id/review` → 201, stats reload, card advances |
| Missing example | renders nothing rather than inventing a sentence |
| Light + dark | tile hanzi 17.39, rating label 5.12 — both above AA |
| 375px | no horizontal overflow |
| a11y | `:focus-visible` and `prefers-reduced-motion` present in the served CSS |

`check-docs` 8/8 · web script tests 40/40 · web build clean.

**Two things that cost time and are worth knowing**:
1. `NEXT_PUBLIC_API_URL` is baked in at build time. Changing the port in `.env` and restarting
   is not enough — the bundle keeps pointing at the old one, and the symptom is a login that
   reports "không kết nối được máy chủ" while the API is plainly healthy. Rebuild with the
   variable set.
2. `Panel` does not accept a `role` prop. The degraded-stats notice uses a plain `div` carrying
   the same `panel` class.

**Blocker / needs follow-up**:
- **`ui.tsx` is now unused by any real screen**, but deleting it is **A12**, not this task.
  `coming-soon.tsx` still imports it, and that file reappeared in codex's A02 tree after I
  removed it in PR #39 — A12 should check both.
- The production vocabulary catalog is still absent; this was tested against seeded fixtures in
  the test database, deleted afterwards (3 cards, 1 review state). That is **A10/A11**.
- No Page Contract status was changed: A03 is presentation only and the SRS contract already
  points at this route.
