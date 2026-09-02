## [2026-09-02] — Fix teacher dynamic-route 500 + dev-server hygiene — opencode

**Context**: the user ran a Playwright pass with Codex against the teacher screens. The
"Gửi duyệt" flow passed, but one flake appeared (modal vanished) — attributed to three
Next dev servers running simultaneously on 3000/3001/3002 sharing one `.next`. Then the
user asked me to verify and fix.

**Done**:
- Diagnosed the environment: 3 node dev servers were indeed listening on 3000/3001/3002.
  Killed the two extras; kept 3000 — which then turned out to serve **stale code**
  (`/teacher/classes` 200 but `/teacher/sessions` 404 — it predated the S3–S6 build).
- Killed it too, cleared `.next`, restarted a single server — and the class-detail routes
  still 500'd. That exposed the real bug:
- **`/teacher/classes/[classId]` and `.../lessons` used the Next 15 `params` API**
  (`params: Promise<…>` + `use(params)`) on this repo's **Next 14.2.20**, where `params`
  is a plain prop. Every class detail URL 500'd at prerender (surfaced as next-error/
  not-found). `next build` does NOT catch this — `use(params)` is type-valid on React
  18.3; only runtime fails. Caught by HTTP-probing routes after restart.
- Fixed both files to the Next 14 plain-props pattern (same as `/admin/users/[userId]`);
  grepped `app/**` — no other file used `use(params)`.
- Mid-diagnosis red herring, documented so it isn't rediscovered: after deleting `.next`
  while an old server still held file handles, the next compile failed with
  `Cannot find module './150.js'` from `webpack-runtime.js` — a corrupted `.next`, not a
  code issue. Full server kill + `.next` clear + fresh start resolved it.
- Verified: 11 URLs → 200 on the dev server (bogus class id renders the designed
  not-found state, not a crash); `pnpm --filter web build` exit 0; check-docs 8/8;
  20/20 unit tests.
- Branch `fix/teacher-dynamic-params-next14` → PR #20 (CI check-docs pass).

**Temporary decisions to preserve**:
- Only ONE dev server per checkout — Next binds `.next` to the project directory, not the
  port, so parallel agents/sessions need separate `git worktree`s (each with its own
  `.next`), per `multi-agent-workflow.md` §5. This is the confirmed cause of the
  Playwright "modal disappears" flake.
- Date bookkeeping: S2+S3–S6 work was committed the night of 2026-09-01 (session files
  correctly dated); PR #18 merge and this fix are 2026-09-02.

**Blocker / needs follow-up**:
- PR #20 awaiting human review/merge.
- Lesson for the pipeline: `next build` passing does not prove dynamic routes render —
  a cheap HTTP smoke over dev/prod server after build is worth adding when the API
  scaffold lands.

**Next steps**:
- Merge PR #20, delete the branch, resume at API wiring (Sprint 1 auth) or Teacher
  analytics contracts (S5) — owner's call.
