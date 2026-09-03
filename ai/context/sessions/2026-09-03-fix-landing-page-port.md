## [2026-09-03] — Fix & Verify Landing Page 1:1 Port with Browser Verification — Antigravity — branch `feat/student-hanlu-ui`

**Context**:
User requested: "fix lại cai lading page đi, làm cho nó í chan bên D:\PersonalProject\Chinese UI test\ui-claude\frontend\src\pages\Landing.tsx".
Previous session completed port files, but the server was previously running an old build with broken CSS bundles (404/500), `three` module was missing in node_modules, and background ink leaked white from globals.css.

**Done**:
- Switched git branch back to `feat/student-hanlu-ui` and restored workspace integrity.
- Fixed `apps/web/src/app/student/landing/landing-view.tsx`:
  - Added dynamic document `<html>` and `<body>` background color sync (`#0a0d13` in dark, `#f6f2ea` in light) and `data-theme` attribute management to prevent Admin `globals.css` light background leaks.
  - Added dual support for `hanlu-theme` and `hanlo-theme` localStorage keys.
- Cleared `.next` cache and executed clean `pnpm --filter web build` (successful compilation with 0 errors).
- Automated Screen Verification (`PW_ROUTES=/student/landing pnpm --filter web test:screens --workers=1`):
  - Desktop 1280px screen test: PASSED (9.5s).
  - Mobile 375px screen test: PASSED (12.3s, 0 horizontal overflow).
  - Generated and visually reviewed screenshots in `apps/web/test-results/screens/desktop/` and `mobile-375/`.
- Full Browser Visual and Functional Verification using Browser Subagent:
  - Hero 3D cylinder stage rendered with Three.js curved geometry, smooth auto-rotation and flippers.
  - Interactive Student Detail Modal tested and verified with dark glassmorphism.
  - Full scrolling verified across all 8 sections (Hero, Stats, Testimonials, Method, Roadmap, 4 Skills, 9 Areas, Final CTA with 始 Hanzi watermark, and Footer).
  - Unit tests verified: `node --test apps/web/scripts/*.test.mjs` passed 34/34 tests.

**Blockers / Known Issues**:
- Pre-existing `DOC-013` (18 student API endpoints missing from `docs/api`) remains open on `feat/student-hanlu-ui`.

**Commit**:
- `5f7d44b`: `fix(student): sync document background color and data-theme attribute on landing page`
