## [2026-09-11] — WEB-020: Mobile "More" sheet labels compact by tile width — zcode — branch `fix/student-sheet-labels`

**Context**: the user attached a 375px screenshot showing some navigation tiles taller than
their neighbours and asked for labels that "switch to a shorter equivalent word when the
ratio changes, and back to the original word when there is enough size". Since this model
cannot read images directly, a subagent analysed the PNG pixel-level: the screen was the
"Tất cả khu vực học" bottom sheet (mobile tab bar → "Thêm"), where three full labels —
"Bài tập được giao", "Từ vựng Flashcard", "Mô phỏng công sở" — wrapped to two lines inside
their ~154px tiles, making rows 2/3/6 ~20px taller than the rest (grid stretch). The rail
and tab bar already render the `short` field for this exact reason; the sheet was the one
surface still on `label`. WEB-019 was taken by the unmerged `feat/student-prod-return-hooks`,
so this is WEB-020 (verified free across all live remotes first).

**Done**:
1. **Markup** (`components/student/student-shell.tsx`): each sheet tile renders BOTH
   spellings — `sheet__label` (full) + `sheet__label--short` (short). No `NavItem` change;
   every item already had a `short`.
2. **CSS** (both `components.css` copies, kept identical per current convention): each
   `.sheet__item` is a container (`container-type: inline-size`); `@container
   (max-width: 189px)` shows the short label, otherwise the full one — per-tile, not
   per-viewport. Threshold sized from the longest label at 13px/600 + icon + gap + padding.
3. **A real bug the verification caught, twice over**: the first CSS cut put bare
   `.sheet__label--short` inside `@container` — **container queries add no specificity**,
   so the outer `.student-root .sheet__label--short` (0,2,0) beat it (0,1,0) and BOTH
   labels were hidden at 375px: icon-only tiles. Worse, the first Playwright cut only
   asserted the *hidden* half of the swap, so 6/6 passed green on a broken build. Fixed
   both: the query selectors mirror the outer ones, and the spec now asserts both
   directions. A second lesson baked into the spec: flex items are blockified, so the
   computed display of a visible span is `block`, never the declared `inline` — the
   corrected assertion initially failed on exactly that.
4. **Spec** (`tests/student-sheet-labels.spec.ts`, real login, production build):
   375px → short labels + one uniform tile height; 640px → full labels single-line +
   uniform; 520px → whichever shows, uniform. **6/6 pass** (desktop + mobile-375).

**Verification** (shared component → FULL LANE): web build clean 42/42 · new spec 6/6 ·
screenshot forensics PASS at 375/520/640 (round 1 FAIL at 375px is what caught the
specificity bug) · unit suite **156/156** · `check:docs` 9/9 · demo-isolation spec 9/9
(1 deliberate skip).

**Pre-existing failures, NOT this slice** — recorded so the next session does not chase
them here: 2 `student-identity.spec.ts` cases (2 & 4, both projects) fail **with the fix
stashed as well** (proven on a rebuilt tree): `a01.student@hsk.local` is not in the dev DB
— the spec header claims "registered + approved in setup" but no code creates it — and the
failed logins then trip the API's 5-per-15-min rate limit (429), cascading into
`toBeVisible` timeouts. Needs its own fix (create the fixture in spec setup or seed);
also worth knowing: the API server died silently once mid-verification (ECONNREFUSED) —
restart and rerun before suspecting the code.

**Environment note**: worked at the main checkout while a parallel lane owns 3 dirty files
(`vocab-apply.ts`, `flashcards/page.tsx`, `srs.css`) + 2 untracked SRS tests — none overlap
with this slice; branch created from `origin/main` after diffing both to be identical.

**Interaction with open PR #62** (`fix/student-css-collab` deletes `app/student/components.css`
and repoints the layout): this slice edits BOTH copies (identical, per the standing
convention on main). If #62 merges first, its deletion covers the fork and only the
`styles/hanlu/` edit remains — no conflict beyond that.

**Next steps**: review + merge this branch; WEB-013 (usageCount) and the S4 grading screen
remain the next real slices per PROGRESS.
