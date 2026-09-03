## [2026-09-03] — Landing page "Hán Lộ" ported to /student/landing — claude (opencode) — branch `feat/student-hanlu-ui`

**Context**: the human pointed at the prototype's public landing page
(`D:\PersonalProject\Chinese UI test\ui-claude\frontend\src\pages\Landing.tsx`) and asked for a
100% port into the Student area of this repo. An initial plan targeted a worktree and the root
route `/`; the human redirected it twice — work in `D:\PersonalProject\Real` directly (worktree
rejected), and put the page **under `apps/web/src/app/student`**, not at the root. The worktree
and `spike/landing-hanlo` branch were deleted unused.

**Done**:
- `/student/landing` — the full 8-section marketing page from the prototype: full-screen teacher
  hero on the Three.js cylinder stage (WebGL, curved portraits, raycaster clicks, swipe),
  trust-metrics strip, student success stories + detail modal, 3-step method, HSK 1–9 path grid,
  four skills, nine learning areas, final CTA.
- `src/components/site/site-shell.tsx` — the public site chrome: sticky sitebar (transparent →
  blurred on scroll), "Khám phá" dropdown, theme toggle, mobile menu, footer.
- `src/components/site/three-teacher-cylinder-stage.tsx` — Three.js stage via `next/dynamic`
  `ssr:false`; `three` + `@types/three` added to apps/web.
- `src/components/site/landing-data.ts` — prototype data verbatim; content counts hard-coded
  after **verifying them against the prototype's own JSON** (9 bậc · 76 ngữ pháp · 214 bộ thủ ·
  57 âm · 587 chữ · 11 đề · 40 câu Lego · 6 tình huống · 20 huy hiệu).
- `app/student/landing/landing.css` — port of the prototype's `site.css`, scoped `.student-root`,
  token-mapped (`--surface-1`→`--surface`, `--border`→`--line`, `--gold`→`--warn`; defines
  `--sitebar-h` / `--content-max-site` which the student tokens lack). The CSS-only carousel
  fallback was dropped deliberately — the Three.js stage is the real render path.
- `src/components/student/student-chrome.tsx` + one-line `student/layout.tsx` edit: the landing
  escapes `StudentShell`; every other student route is untouched.

**In progress / not verified by eye**:
- Build, unit tests and an HTTP smoke check all pass, but **nobody has looked at the page in a
  browser yet** — the WebGL stage, the light theme, 375px, and the student modal still need
  eyes (no browser tooling was available to this session).

**Contract/temporary decisions to preserve**:
- The landing reuses the Student design system by carrying `.student-root` + `data-theme` on its
  own wrapper — NOT `document.documentElement`, per the scoping convention codex set. Theme
  persists to `localStorage("hanlo-theme")`, same key the prototype used.
- `StudentChrome` is the only place that knows the landing is special. If more public pages
  appear under `/student`, extend that prefix list rather than adding more layout layers.
- `MOCK(student)` mockup mode throughout; no API, no auth, no endpoint cited (check-docs stays
  clean of new violations — it still fails on the 18 pre-existing `DOC-013` ones).
- `docs/front-end-design-docs/` untouched; `/design-promote` NOT run (human's call).

**Needs from the other lane**:
- None — nothing here calls an API.

**Blocker / needs follow-up**:
- The branch `feat/student-hanlu-ui` now carries codex's 9 commits + this work, still unmerged
  and still failing the docs gate on `DOC-013`. Landing does not add to that debt, but the PR
  cannot merge until DOC-013 is resolved.
- Side finding for the owner: the prototype checkout at
  `D:\PersonalProject\Chinese UI test\ui-claude` contains `backend/data/content/` with the 11
  JSON files `DOC-011` has been looking for — possibly the missing source of `SCOPE-02`. Not
  acted on.

**Next steps**:
1. Open `http://localhost:3000/student/landing` (server already running) and review the WebGL
   hero, light theme, 375px and the student modal.
2. Merge path: resolve `DOC-013` (Student API specs) before the branch's PR can pass the docs
   gate.
3. If the human wants the landing at `/` as well, that is a one-line redirect change — separate
   decision, not done here.
