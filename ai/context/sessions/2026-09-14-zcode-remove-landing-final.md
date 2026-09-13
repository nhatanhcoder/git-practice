## [2026-09-14] — WEB-017 final: /landing prototype removed — zcode — branch `fix/remove-landing-final`

**Context**: Task F re-issued after an eventful 24h: the owner answered the content question
once ("Gỡ trang + redirect" → PR #82 removed the page); PR #83 (another session, merged) then
moved the landing to `/landing` and restored the full prototype — bringing the invented
teachers, the "Bảng vàng" student results, the five-box SRS copy (WEB-018), the 8.5 MB teacher
PNGs and the `three` dependency back to the only public surface. The owner re-issued Task F
with the hard constraint intact ("Không để trang public nào còn dữ liệu bịa"). The follow-up
question was asked again and went unanswered, so this session executed the **only
owner-answered content decision on record**: removal.

**Task type**: CODE (removal + redirect). No DB schema, Auth mechanism, RBAC, or money change.

**Done**:
- Deleted: `apps/web/src/app/landing/**`, `components/site/**` (site-shell, three.js teacher
  stage, landing-data), `public/teachers/*.png` (~8.5 MB), and the `three` dependency (sole
  consumer) — all restored by #83, all removed again.
- Redirects: `/landing`, `/student/landing`, `/student/landing/:path*` → **307 `/login`**
  (temporary — a landing from approved sources can return; permanent 308s from the
  intermediate state remain cached in some browsers, which is why the entries exist per-path).
- auth-shell brand → `/`; stale landing comments in `student/layout.tsx`,
  `(app)/layout.tsx`, `student-chrome.tsx` reconciled to the removal state.
- Tests rewritten for the removal state: `landing-routes.test.mjs` **7/7** (no landing files in
  src, all three redirect entries present and none pointing at the removed page, no live
  `/landing` refs, **no invented-content data anywhere in src** — greps for the PKU/Hanban/
  Bảng vàng/fullTestimonial strings, no `three`, PNGs gone); `landing-route.spec.ts`
  **3 runs × 5/5** (all historical paths → /login, gate renders, brand → `/`, 375px clean);
  `login-theme.spec.ts` untouched (contrast/toggle fix from PR #85 still green in the same runs).

**Verification**: build **43/43** (route count drops by the landing) · full web scripts
**220/220** · check-docs **9/9** · curl: all three paths **307 → /login** · real browser:
signed-in student following /landing lands on their role home (the gate's designed behaviour);
screenshots from the login-gate runs read. Diagnostics note: verify with a cache-bust — this
machine's browser has burned permanent-redirect cache from the intermediate state.

**Decision audit trail** (for anyone reconstructing this saga):
1. Owner answered "Gỡ trang + redirect" (AskUserQuestion, 2026-09-12) → PR #82.
2. PR #83 (other session) restored the prototype at /landing — no recorded owner approval of
   the invented content.
3. Owner re-issued Task F with the no-invented-data constraint → this removal.
4. Follow-up question sent twice went unanswered → the recorded answer governs.
If the owner actually wants the full prototype at /landing: `git revert` this commit (or
restore from #83) and reopen WEB-017 — one command, everything is in history.

**Blocker / needs follow-up**: the 4 student-lane PRs (#72 invoices, #73 attempts, #74
contracts, #79/#80/#81 dashboard/exams/progress) remain awaiting review.

**Next steps**: review/merge this PR; decide the WEB-017 content direction if the prototype
look is wanted for a future marketing page.
