## [2026-09-13] — Landing `/student/landing` → `/landing` + login theme/contrast — opencode — branch `feat/landing-root-move` (merged to main)

**Context**: owner-ordered slice incl. conditional merge. No schema/Auth-grant change —
the move preserves public-ness (verified, not altered); no endpoint/field/code invented.

**Done**:
1. **Route move** (`git mv`, history kept): `app/student/landing/` (page, view, css) →
   `app/landing/`. Old URL 308-redirects via `next.config.mjs` (`/student/landing` +
   `/:path*`). 11 src refs updated (site-shell + auth-shell links, student-chrome —
   dead exemption branch removed with rationale, layout comments, three.js comment,
   auth.css comment, eslint-suppressions path). History files (sessions, PROGRESS log
   lines, KNOWN_ISSUES entries) deliberately untouched.
2. **Auth theme sync**: `AuthShell` is now client, reads persisted
   `useStudentPreferences` theme (`mounted ? theme : "dark"` — no hydration flash);
   login/register follow it. Suspense fallbacks stay dark (single frame).
3. **Contrast** (measured, not eyeballed): root cause was `--fg`/`--fg-muted` NEVER
   DEFINED anywhere — `var(--fg)` inherited (dark-on-dark in dark mode = sunken text)
   and muted stuck on dark slate in both themes. Mapped both to tokens in dark + light
   (`--fg: var(--text)`, `--fg-muted: var(--text-2)`) — fixes auth.css and lms.css at
   once, no palette invented. Dark submit button text → `--text-inverse`: 2.67 → 7.30.
   Measured: dark title 17.31 / button 7.30; light title 15.57 / button 4.62.

**Verification** (prod build, isolated API :3101 + web :3002, real seeded logins):
- anonymous `/landing` 200 with content; old `/student/landing` lands on `/landing`.
- login follows persisted theme both modes (data-theme asserted); login navigates.
- contrast computed in-page, both modes; screenshots read (`/tmp/login-dark.png`,
  `/tmp/login-light.png` — both crisp, no sunken text).
- zero console errors both modes.
- `pnpm --filter web build` 43/43 (`/landing` present, no old route); eslint exit 0
  (the earlier `pnpm lint` failure was a PowerShell wrapper artifact); web unit 213/213;
  `check-docs` 9/9.

**Environment notes**: prior contrast fix d6a5b93 (merged 09-10) covered landing sync but
left auth hardcoded dark and `--fg` undefined — this slice completes it. `$env:` does not
reach `next build` under this harness (temporary gitignored `.env.local`, deleted after;
tree rebuilt default). Playwright `reuseExistingServer` once verified a STALE sibling
build — always prove the served chunk. Spawned API children die silently ~60s in;
in-process boot is the reliable shape (see Task A session for the full saga).

**Next steps**: merged — nothing follows except reading the screenshots if curious.
