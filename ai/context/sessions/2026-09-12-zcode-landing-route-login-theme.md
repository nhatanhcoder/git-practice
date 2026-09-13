## [2026-09-12] — /landing route + login theme/contrast sync — zcode — branch `fix/remove-landing-prototype` (extended; PR #82)

**Context**: owner follow-up to the landing removal — the route should live at **`/landing`**
(public, outside /student), `/student/landing` redirecting there for backward compat; the login
page must follow dark/light theme state with readable text and a correctly-coloured
"Đăng nhập" button; independent route + theme tests, each run ≥3×; full verify; commit, push,
merge if green (explicitly authorized).

**Reconciliation with the removal decision (recorded, not silently picked)**: the removal
(WEB-017) was about invented people content; the new /landing restores only the factual half
(verified counts, HSK 3.0 path table, method with SM-2 correction) and a source test greps the
page for the banned invented-content words. KNOWN_ISSUES WEB-017 resolution amended to record
this evolution.

**Done**:
- `apps/web/src/app/landing/page.tsx` + `landing.css` — server component, zero JS, dark-pinned
  brand surface. Sections: header (brand + login/register), hero, verified stats strip
  (9/76/214/587/11/20), HSK path table (7 levels, standard vocab sizes), method (3 steps,
  step 03 = SM-2 Again/Hard/Good/Easy), final CTA, footer.
- `next.config.mjs`: `/student/landing` → `/landing` (temporary redirect).
- `auth-shell.tsx`: brand → `/landing`; theme-aware — reads `useStudentPreferences` (the SAME
  store the student shell toggles), local `mounted` guard (the store has no `hydrated` field —
  first attempt used a nonexistent selector; caught before commit), renders a Sun/Moon toggle.
- `auth.css`: the real bug — 15 references to `--fg`/`--fg-muted`, tokens tokens.css never
  defines. `.auth-root { color: var(--fg) }` was invalid-at-computed-value → inherited the
  body's slate-900 → washed-out title on dark (the reported symptom). Replaced with real
  `--text-1/--text-2`; `.auth-submit` + landing CTA use `--text-inverse` (ink on cinnabar) —
  #fff on the dark theme's #ff7454 measured ~2.6:1 (AA failure); toggle styles added.

**Testing trap worth remembering**: the in-app browser served a **cached old HTML** referencing
the old css chunk (`f4a0…` with `var(--fg)`), making the FIXED page look broken in that tab
while curl + fresh contexts showed the new chunk (`fc88…`). Diagnosed by listing
`document.styleSheets` in-page: the loaded sheet was the old hash. A cache-busting navigation
showed the truth. Fresh Playwright contexts were never affected.

**Verification**:
- `landing-routes.test.mjs` (node --test, no server): 6/6 — redirect config, route exists, no
  hardcoded `/student/landing` in src, no invented-people words in content, brand href,
  token-fix guard.
- `landing-route.spec.ts` (Playwright, prod build): **3 runs × 4/4** — /landing renders 200 with
  hero/stats/CTAs and zero people-content; `/student/landing` → `/landing`; brand href;
  no 375px overflow.
- `login-theme.spec.ts` (Playwright): **3 runs × 5/5** — data-theme follows the saved
  preference in BOTH themes; computed-style WCAG contrast ≥4.5 for title/sub/label/input text/
  submit button/art title in both themes; toggle flips + persists across reload.
- Full web scripts **219/219** · `check-docs` **9/9** · `pnpm --filter web build` **44/44**.
- Browser screenshots: /landing desktop, login light, login dark (after cache-bust) — all read.

**Blocker / needs follow-up**: none. Root `/` still redirects to `/admin/users` (pre-existing);
pointing it at `/landing` might be the natural next step but was not asked.

**Next steps**: merge PR #82 (authorized: merge if tests pass and no conflict), then review the
other open student-lane PRs (#72, #73, #74).
