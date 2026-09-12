## [2026-09-11] — Admin/teacher CSS hex → vars sweep — opencode — branch `fix/admin-css-tokens`

**Done**:
- Scripted sweep (`token-sweep.py`, kept outside the repo): **1,922 literals → vars**
  across 25 CSS Modules + `globals.css` `:root` extended with 35 exact-value vars
  (status 5 from `root-design-fe.md` §2.1; rest mirror the public Tailwind stops the
  values match; `--danger-faint` is the one custom tint). `rgba()` of token colours →
  exact-percentage `color-mix()`; `#0f172a` in `color:` props → `--text`, elsewhere
  `--primary` (same value). Script asserted every emitted `var()` is defined.
- Untouched remainder (4×): pure-black `rgba(0,0,0,*)` shadows in profile module — no token.
- Verified: `pnpm --filter web build` green; served production build + real API, logged
  in as seeded admin AND teacher — /admin, /admin/users, /teacher, /teacher/classes,
  /teacher/questions all 200 with live data; computed `body`/`aside` backgrounds equal
  the token rgb exactly; 7 screenshots read (sidebar navy, pills, tables, buttons all
  correct); anonymous /teacher → role-denied screen (RBAC intact). check-docs 9/9.
- Environment notes (not repo changes): fresh worktree needs `db:generate`; the generated
  Prisma client vanished once mid-session (re-ran generate, cf. BUILD-002); `next start`
  children outlive the shell job — kill node PIDs explicitly; browser tests must use
  `localhost` (CORS_ORIGIN is `http://localhost:3000`, `127.0.0.1` is a foreign origin);
  web build needs `.env` present for `NEXT_PUBLIC_API_URL` (fallback covers prod default).
- Worktree `Real-css-tokens` from `origin/main@73bdd2c`; main checkout untouched.

**In progress**: commits local; push + PR next, no merge/deploy.
