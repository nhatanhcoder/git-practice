## [2026-09-12] — WEB-017: public prototype landing removed — zcode — branch `fix/remove-landing-prototype`

**Context**: owner's Task F — the only public page (`/student/landing`) carried invented
teachers and student results. Options were replace-with-real-content or remove+redirect; both
touch public content, so per the instruction the owner was asked and chose **"gỡ trang +
redirect"** (no approved real content exists — replacement would have meant re-inventing).

**Task type**: CODE (route/content removal + redirect). No DB schema, Auth, RBAC, or money
logic touched. RBAC note: the removal *narrows* the public surface; `/login` and `/register`
remain the only anonymous pages.

**Done**:
- Deleted: `apps/web/src/app/student/landing/**` (page, view, css), `components/site/site-shell.tsx`,
  `components/site/three-teacher-cylinder-stage.tsx` (three.js teacher carousel),
  `components/site/landing-data.ts` (the MOCK data file), `public/teachers/*.png` (~8.5 MB).
- `three` removed from `apps/web/package.json` — the stage was its only consumer; lockfile updated.
- `/student/landing` → **temporary redirect to `/login`** via `next.config.mjs` `redirects()`
  (`permanent: false` — a real landing may return with approved content).
- `auth-shell.tsx`: brand link retargeted `/student/landing` → `/`; stale comment updated.
- `student-chrome.tsx`: the landing bypass branch removed (dead code; component is now a
  straight `StudentShell` wrapper).
- Comments in `student/layout.tsx` and `student/(app)/layout.tsx` updated — they cited the
  landing as the reason for the guard layout/route-group split; the structure stays, the
  reference now points at the removal.

**Verification**:
- `pnpm --filter web build` from a clean `.next`: **43/43 pages** ✓ (route count drops by the
  landing's one route).
- `node scripts/check-docs.mjs`: **9/9** (after each docs commit).
- Browser on the production build (`next start`): `/student/landing` → **307 → /login**
  (curl `-w redirect_url` + real tab navigation both observed); login page brand link now
  points to `/` (snapshot-verified) and clicking it as anonymous round-trips back to the
  gate `/ → /admin/users → /login` without error; **375px screenshot** read — no horizontal
  overflow, no error text; viewport restored after the check.
- Grep clean: no `student/landing` reference left in `apps/web/src` outside `next.config.mjs`.

**Known-ISSUES updated**: `WEB-017` → Resolved (owner decision recorded),
`WEB-018` → Resolved (the advertising card no longer exists), `DEBT-005` → Resolved
(images deleted with the page).

**Note for the future landing**: when real content exists, restore from git history
(`git log --all -- apps/web/src/app/student/landing`), replace `landing-data.ts` contents with
owner-approved sources listed in that PR, and drop the redirect.

**Blocker / needs follow-up**: none for this task. The three open student-lane PRs (#72, #73,
#74) remain awaiting review.

**Next steps**: review/merge this PR together with the other three open student-lane PRs.
