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
