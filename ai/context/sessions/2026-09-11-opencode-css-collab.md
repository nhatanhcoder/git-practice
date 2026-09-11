## [2026-09-11] — Student CSS+Tailwind collaboration (dead classes + fork dedupe) — opencode — branch `fix/student-css-collab`

**Done**:
- A: `sp-press` / `sp-font-head` were used 14× in 4 files (`ui.tsx`, `coming-soon.tsx`,
  `drawer.tsx`, `audio-button.tsx`) with no definition anywhere — dead classes. Defined
  once via a Tailwind v3 plugin in `apps/web/tailwind.config.ts` (Nunito head family;
  press = `translateY(1px)` on `:active:not(:disabled)`), co-located with the `sp-*`
  theme they compose with. Emitted rules verified in the production CSS bundle.
- B: `app/student/{tokens,base,components}.css` were byte-identical forks (SHA256 equal)
  of `styles/hanlu/*` — deleted the 3 forks, `(app)/layout.tsx` now imports the hanlu
  canonicals in identical order (zero cascade change); `primitives.tsx` comment repointed.
- Verified: `pnpm --filter web build` green; no dangling refs to deleted paths; served
  production build — /login + /student/landing 200 desktop/375px with screenshots read,
  anonymous /student → /login?next=%2Fstudent intact. check-docs 9/9.
- Worktree `Real-css-collab` from `origin/main@73bdd2c`; main checkout untouched.
- Reported, not fixed (needs owner/design decision): `sp-*` hex is dark-only while the
  shell offers a light theme (var-driven classes adapt, `sp-*` stays dark); admin/teacher
  modules still ~100+ hardcoded hex (WEB-002 residual); Geist fonts ship unused while
  Google Fonts `@import` render-blocks first paint (screenshot run hung on fonts once);
  stale `border-red-200`/`text-amber-700` literals survive only in a comment yet still
  emit dead Tailwind rules (Tailwind scans comments).

**In progress**: commits local; push + PR next, no merge/deploy.
