## [2026-09-06] — A05: the SRS moved to its canonical route — Claude Code — branch `feat/a05-srs-routes`

**Context**: task A05 from `docs/prompts/student-integration-checklist.md`, stacked on A04
(`feat/a04-srs-hardening`, PR #45) which is stacked on A03 (PR #44). No guard, RBAC or endpoint
was touched.

**The defect A05 fixes.** The API-backed SRS screen was sitting at `/student/mistakes` while
`/student/flashcards` served a local Leitner mock. So the sidebar item named "Flashcard" opened
the fake one, and the real one — the only learner screen talking to a real endpoint — was
reachable only by a link nobody would guess. A00 had already settled the routes
(`student-srs.md` `route: /student/flashcards`; the mistake notebook is a separate Sprint 4
feature); the code had simply never followed.

**Done**:
- `git mv` of the real SRS onto `/student/flashcards`; the Leitner mock page it replaced is gone
  from that route.
- `/student/mistakes` is now the mistake notebook: it says its data comes from assignments and
  mock exams, that those endpoints are Sprint 4, and it renders **no card queue**. Rendering the
  store's demo mistakes there would have put invented review history in front of a signed-in
  learner — `WEB-011` again.
- `/student/mistakes/review` (the demo quiz) is development only. The check sits on the review
  route itself, not just on the entry page, because a deep link goes straight there.
- `lib/student/srs-routes.ts` holds the three routes as constants and is what the shell nav, the
  page titles map and the dashboard link import. The bug being fixed *was* a link literal drifting
  away from the screen it named, so the literals now have one home.
- Dashboard: the "Ôn tập hôm nay" panel is the mock notebook queue, not the SRS. Its sub-line now
  says "thẻ demo từ sổ tay lỗi sai" and carries a link to the review that persists.

**No redirect from `/student/mistakes` to `/student/flashcards`.** A00 forbids it and it would be
wrong: they are different features, and a redirect would quietly delete one of them.

**The production gate is placed below every hook**, with a comment saying why. `NODE_ENV` is a
build-time constant so an early return above the hooks would not crash, but it makes the hook
order conditional, and a test asserts the ordering so it stays that way.

**Verification** — live API, **production** build (`next start`), signed in as a real student:

| TEST A05 | Result |
|---|---|
| 1. Dashboard → SRS in ≤2 clicks | 1 click, "Flashcard" shortcut |
| 2. Sidebar / mobile / CTA agree | all three resolve to `/student/flashcards` |
| 3. Canonical URL direct + reload | 200, correct screen, no 404 |
| 4. Old URL per A00 | `/student/mistakes` renders the notebook; no redirect, no loop |
| 5. `mistakes/review` deep link | production notice, **0 demo questions rendered** |
| 6. Anonymous | `/student/flashcards` → "Cần đăng nhập" → `/login`; landing still public |
| 7. Back / forward | never lands on a mock flashcards screen |
| 8. Network on the canonical page | `GET flashcards?hskLevel=1`, `GET stats`, and a real `POST .../review` |

The rating was exercised end to end: POST review → 201 → stats moved to "ĐÃ HỌC 1 · GHI NHỚ 100% ·
LƯỢT ÔN 1", and **the same values survived a full reload**, so persistence is the server's, not the
component's. 375px clean, no horizontal overflow.

Web script tests **69/69** (9 new), `check-docs` 8/8, build clean.

**Fixtures**: 2 flashcards seeded into the dev Mongo database and deleted afterwards, together
with the review state the rating created — verified 0 cards and 0 states remaining. The catalog is
otherwise empty (`DOC-011`).

**Two traps worth repeating** — both produced a wrong reading first:
1. A `next start` that loses its port keeps *another* build answering on it. Half of one pass was
   read against a stale server showing the old mock. Prove which build is being served by
   requesting a chunk filename that only exists in the new one.
2. `CORS_ORIGIN` allows `http://localhost:3000` only. Serving the build on 3200 to dodge a busy
   port produced "Không kết nối được máy chủ" from a perfectly healthy API.

**Blocker / needs follow-up**:
- **`WEB-018`** (new): the public landing page still advertises the notebook as "5 hộp SRS" and
  links to it. Belongs with `WEB-017`.
- **Dead after this change, left for A12** as rule 7 requires: `vocabBox`, `rateVocab` and
  `vocabTopics` in `lib/student/store.ts` / `content.ts` now have no consumer. `vocabCards` is
  still used by `learning-path/[nodeId]`; `boxInterval` is still used by the notebook demo and the
  dashboard.
- Stacks on PR #44 and PR #45. It also overlaps A02 (PR #46) in `student-shell.tsx` and the
  dashboard; the edits here are small and localised, but whichever lands second will need a hand
  merge.

**Addendum — the hand merge actually happened (same day).** A02 landed as PR #46 after this
branch was cut, so the PR showed `CONFLICTING`. Rebased `feat/a05-srs-routes` onto `origin/main`
(`9fddcb1`) in the `Real-claude-student` worktree. The two files A02 and A05 both touch resolved
by keeping A02's demo-isolation as the base and re-applying A05's route-constant edits on top —
verified with `git diff origin/main` on `student-shell.tsx` and the dashboard: every hunk is
A05-only, no A02 line lost. Docs entries (PROGRESS, `WEB-018`) also rebased cleanly; `WEB-018`
was checked against main's highest id (`WEB-017`) — no collision. Post-rebase verification in the
worktree: `pnpm --filter web build` clean · web script tests **79/79** (A02's 10 now in the base)
· `check-docs` 8/8. Pushed with `--force-with-lease` — the only way a rebased PR branch can move.
