## [2026-09-05] — Restoring /student/landing, and the guard interaction it exposed — Claude Code — branch `feat/student-landing-page`

**Context**:
The owner reported `http://localhost:3000/student/landing` erroring and asked why, then asked
for it to be fixed. It was a 404, not a crash — `/student` returned 200 at the same time.

**What was actually wrong**:
The route existed on exactly one branch, `feat/student-hanlu-ui`. Its PR #24 was **closed on
2026-09-05 04:06 UTC without being merged** (`mergedAt: null`) and with **no comment recording
why**, so its 24 commits never reached `main`. The server the owner was looking at (port 3000)
runs from `D:\PersonalProject\Real` on `feat/teacher-4-pages`, which — like `main` — has no such
route.

**Done**:
- Ported `apps/web/src/app/student/landing/{page,landing-view}.tsx` + `landing.css` and the four
  modules they need: `components/site/{site-shell,landing-data,three-teacher-cylinder-stage}` and
  `components/student/overlay.tsx`. Added `three@^0.185.1` and `@types/three`, which `main` did
  not have. `hooks/use-overlay` was already there.
- Moved the guarded learner routes into a `(app)` route group and moved `RequireAuth`,
  `StudentShell` and `student.css` down into `(app)/layout.tsx`. `student/layout.tsx` is now a
  deliberate no-op carrying a comment that says nothing may be added to it.
- `KNOWN_ISSUES.md`: `WEB-017`.

**The part worth remembering** — a plain file restore would have made things *worse*:

PR #32 (merged earlier the same day, 13:40 UTC) had just put **every** `/student` route behind
`RequireAuth`. With the files simply restored, `/student/landing` rendered for a moment — the
tab title really did change to *"Hán Lộ — Học viện HSK"* — and then redirected to
`/login?next=%2Fstudent%2Flanding`. A landing page behind a login is not a smaller bug than a
404; it is a larger one, because it looks like the page is broken rather than private. It was
also wrapped in `StudentShell`, so a learner sidebar framed a page that brings its own
`SiteShell`.

A child layout cannot escape its parent layout in the App Router, so the only way to have a
public sibling under a guarded segment is to keep the segment layout empty and put the guarded
routes in a group. Route groups contribute nothing to the URL, which the build output confirms:
`/student`, `/student/grammar` and the rest are unchanged.

**A second trap, which nearly produced a wrong diagnosis**: when the redirect first appeared it
looked like the ported page contained redirect logic. It did not. The network log settled it —
`GET /login?next=%2Fstudent%2Flanding`, the `?next=` form only `RequireAuth` produces — and that
in turn revealed that PR #32 had been merged and `origin/main` had moved. **Read the network log
before reading the suspect file.**

**Verification** — browser, production build, anonymous visitor:
- `/student/landing` stays at its URL, renders fully (teacher carousel, the three.js canvas,
  stats, testimonials), `document.querySelector('nav a[href="/student/grammar"]')` is null so the
  learner sidebar is genuinely absent.
- `/student` still redirects to `/login?next=%2Fstudent` — PR #32's guard is intact.
- 375px: `scrollWidth === innerWidth`, no horizontal overflow.
- `pnpm --filter web build` clean; `check-docs` 8/8.

**Blocker / needs follow-up**:
- **`WEB-017`** — the landing page is prototype content: named teachers with invented
  credentials and a "Bảng vàng thành tích" of invented student results, all fixtures in
  `landing-data.ts`. It is now the only page a stranger can read without logging in, which is a
  different risk class from the mock data behind the guard.
- **`feat/student-hanlu-ui` is still abandoned.** Only the landing route was ported. The branch
  is 24 commits ahead and 64 behind, rewrites the student area by 52 files (+15.9k/−3.3k), and
  holds `WEB-007`–`WEB-010` and `DOC-013` in its own copy of `KNOWN_ISSUES.md` (`DOC-014`).
  Half-ported is the worst of the three possible states; someone should decide revive or drop.

**Next steps**:
1. Decide the fate of `feat/student-hanlu-ui`.
2. `WEB-017` before the landing page is shown to anyone real.
3. `/admin` should adopt the same server-layout-plus-client-guard shape; it lost its per-area
   metadata by making the whole layout a client component (`WEB-005`).

---

## Correction (same day) — the first verification pass missed four 404s

The owner asked for a re-test, and it found a real defect the first pass had reported as
verified. The landing page requested four teacher photos that were never ported with it:

```
404 /teachers/teacher_zhang_wei-v2.png
404 /teachers/teacher_li_ruolan-v2.png
404 /teachers/teacher_nguyen_tuan-v2.png
404 /teachers/teacher_tran_dinh-v2.png
```

They are the textures the three.js cylinder maps onto its faces, so the carousel rendered as
empty dark panels. Nothing throws when an image 404s — the page just looks wrong, and on a
dark-themed hero it looked like a styling choice.

**Why the first pass missed it**: it checked rendered text, the absence of the learner sidebar
and horizontal overflow — all of which passed — and never opened the network log. The lesson is
narrow and worth keeping: *rendered text is not a rendered page*. A missing asset is invisible to
every check that only reads the DOM.

Fixed by porting `apps/web/public/teachers/*.png` (four files, ~8.5 MB total, recorded as
`DEBT-005`). Re-verified: all four serve 200 at full size, and the only failing request left on
the page is `POST /auth/refresh 401`, which is correct for an anonymous visitor.

### What the re-test covered that the first pass did not

- **All nine learner routes, signed in** (`/student` plus grammar, foundation, learning-path,
  exams, writing, workplace, mistakes, leaderboard): each keeps its URL and renders with the
  learner sidebar. This was the real regression risk of moving nine folders into `(app)`, and the
  first pass had only checked `/student`.
- **All nine learner routes, anonymous**: each redirects to `/login?next=<its own path>`.
- **The landing page while signed in**: stays public and still shows no learner sidebar.
- **A genuine anonymous state.** The first anonymous check was not anonymous — the browser still
  held a valid refresh cookie, and `POST /auth/refresh` returned 200. A real sign-out (204, then
  refresh 401) was needed before the guard results meant anything.
- `pnpm --filter api test` **141/141 across 23 suites** against current `main`, `check-docs` 8/8,
  both builds clean.

**Also learned**: `pnpm --filter api build | tail -3` reports the exit status of `tail`, not of
the build. An API build that failed with seven TypeScript errors was nearly recorded as passing
because of that pipeline. Check `${PIPESTATUS[0]}` or redirect to a file. The failure itself was
only a stale generated Prisma client — `main` had gained the Sprint 6 schema when PR #33 merged —
and `db:generate` fixed it.


---

## Second correction — the page had no stylesheet stack at all

The owner reported the CSS was broken. It was, and this is the second defect a pass of mine had
already called verified.

`landing.css` uses **50 CSS custom properties and defines only 2 of them**. The other 48 live in
`tokens.css`, which on `feat/student-hanlu-ui` was imported by that branch's
`student/layout.tsx` and therefore reached every page under `/student`. Porting the page's own
stylesheet and nothing else left it with no design tokens, no base typography and no button
styles: text ran to the viewport edge and every colour fell back.

**Why two passes missed it.** The dark hero looked intentional. Both passes asked *does the page
render* — text present, no sidebar, no horizontal overflow, no failed requests — and never asked
*does it render the way it was designed*. Nothing errors when `var(--bg)` is undefined; the
browser silently uses the fallback or nothing at all. Checking that a CSS custom property
actually resolves is now part of what "verified" has to mean for a ported page.

**Fixed** by porting three of the source branch's six stylesheets into the landing folder, where
they belong to that route alone:

| File | Lines | Why |
|---|---|---|
| `tokens.css` | 196 | the 132 custom properties, scoped to `.student-root` so Admin and Teacher keep their own |
| `base.css` | 219 | `skip-link`, the small utilities, the `han`/`num` type styles — 10 classes this page uses |
| `components.css` | 906 | the four `btn--` variants the CTAs use |

`layout.css`, `pages.css` and `lms.css` were deliberately left out: nothing on the page
references them, and `pages.css` only duplicates `num`, which `base.css` already defines. That
avoided importing 2,349 lines of other screens' styling.

**Re-verified**: `.student-root` resolves `--bg #0a0d13`, `--accent #ff7454`,
`--font-display Sora`, and the `h1` computes to Sora. Nav, hero, badges and CTAs all render.
**No bleed in either direction** — the `/student` bundle still carries main's `sp-*` rules and
none of these tokens, the landing bundle carries these tokens and no `sp-*` rules, and the
learner dashboard was opened signed-in and is unchanged. (Main's own `student.css` also defines
`.student-root`, which is why that name appears in both bundles; it is not leakage.)

**Left for review**: `tokens.css` opens with an `@import` of Google Fonts (Playfair Display,
Sora, Inter, Noto Serif SC), so this page makes an external font request. Unchanged from the
source branch, but it deserves a decision before the page is public — as does `WEB-017`.
