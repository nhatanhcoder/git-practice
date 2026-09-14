## [2026-09-13] — /landing contrast + theme toggle + route/theme tests — zcode — branch `fix/landing-contrast-theme-tests`

**Context**: owner's landing checklist (route moved to /landing, references cleaned, login
theme sync, dark-mode contrast fix, independent tests ×3, full verify, merge if green).
Recon showed **PR #83/#84 (another session, merged) had already done the route move** —
`/landing` with permanent `/student/landing` → `/landing/:path*` redirects, theme-aware
auth-shell — but had **restored the full prototype content** (invented teachers + "Bảng vàng"
student results + five-box SRS copy) and left the login contrast bug and zero tests.

**Task type**: CODE (FE). No DB schema, Auth mechanism, RBAC, or money change.

**Reconciliation decision (best judgment, owner asked but did not answer)**: keep #83's landing
structure/content as merged; deliver only the missing checklist items; REOPEN WEB-017/WEB-018/
DEBT-005 with the current truth and leave the people-content question explicitly open. Rationale:
the route move is done and merged; stripping the restored content again would re-fight a merged
PR without an owner answer, while keeping it loses nothing that git history (#82's removal
branch) can't restore in minutes. Both alternatives are recorded in KNOWN_ISSUES.

**Done**:
- `auth.css`: 15 `--fg`/`--fg-muted` references (tokens tokens.css never defines) → real
  `--text-1/--text-2`. This was the wash-out root cause: `.auth-root { color: var(--fg) }` was
  invalid-at-computed-value → inherited the body's slate-900 on the dark ground.
- `.auth-submit`: `#fff` → `--text-inverse` (ink on cinnabar) — #fff on the dark theme's
  #ff7454 measured ~2.6:1, an AA failure on the primary button.
- `auth-shell.tsx`: added the missing theme toggle (the shell read the preference but had no
  switch) — `.auth-theme-toggle` + slot css, same store/semantics as the app shell.
- Tests (adjusted to main's actual landing — my first cut assumed a people-free page and two
  assertions failed against reality; the tests now assert main's real contract):
  `scripts/landing-routes.test.mjs` 6/6 (redirect config incl `:path*`, route exists, no live
  old-path links outside comments/config, brand href, toggle wired, token guard);
  `tests/landing-route.spec.ts` (render + CTAs into the app, exact + deep redirects, brand,
  375px); `tests/login-theme.spec.ts` (computed-style WCAG ≥4.5 for title/sub/label/input/
  submit/art-title in BOTH themes, toggle + persist).

**Verification**:
- `landing-route.spec.ts`: **3 runs × 5/5** · `login-theme.spec.ts`: **3 runs × 5/5**
- Full web scripts: **219/219** · `check-docs`: **9/9** · build **44/44**
- Screenshots read: /landing desktop (375px via spec), login dark + light.
- Diagnostics note: the in-app browser served a **cached old HTML** referencing the old css
  chunk (`f4a0…`, pre-fix) — listed `document.styleSheets` in-page to prove the loaded sheet
  was stale; curl confirmed the served HTML references the new chunk (`fc88…`). Cache-bust
  before trusting manual browser checks on this machine.

**Blocker / needs follow-up**:
- **WEB-017 content decision (owner)**: full prototype vs people-free landing at /landing.
  Both variants exist; either is a small PR.
- WEB-018 five-box copy + DEBT-005 image weight ride on that same decision.
- PR #82 (my removal branch) is superseded by #83's merge — closed with explanation.

**Next steps**: owner picks the /landing content direction; the contrast/theme/test slice in
this PR is content-agnostic either way.
