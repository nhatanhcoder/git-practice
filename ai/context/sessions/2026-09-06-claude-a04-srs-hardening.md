## [2026-09-06] — A04: hardening SRS loading, rating and stats — Claude Code — branch `feat/a04-srs-hardening`

**Context**: task A04 from `docs/prompts/student-integration-checklist.md`, stacked on A03
(`feat/a03-srs-hanlu`, PR #44, not yet merged). Backend untouched: SM-2, payloads and schema are
unchanged. A04 is the client refusing to display anything the server has not confirmed.

**Four real defects, each reproduced before it was fixed.**

1. **Out-of-order responses repainted the list.** Switching HSK 9 → HSK 1 while the first
   request was in flight left whichever response landed last on screen. Forced with a 2.5s delay
   on `hskLevel=9`; the order really was `start:9, start:1, done:1, done:9` and the page showed
   斟酌 (HSK 9) while the selector said HSK 1. Every list request now carries a sequence number.
2. **A double click sent two POSTs.** `submitting` cannot close that window — React state is
   asynchronous, so two clicks in the same tick both read `false`. A ref lock does. Three clicks
   in one tick now produce exactly one POST.
3. **A failed review destroyed the answer.** The catch set the page-level error, replacing the
   card with a full-page error state. The card now stays, still flipped, ratings live, with an
   inline message that does not claim the result was saved. Forced a 500: card unchanged at
   "Thẻ 2 / 2", Lượt ôn unchanged at 1, no page-level error.
4. **Finishing a session claimed the catalog was missing.** Rating the last card emptied the
   list, which fell into "Nguồn từ vựng production chưa được nhập" — telling someone who had
   just completed every card that no vocabulary exists. Session-complete, empty due queue and
   empty catalog are now three separate outcomes.

Stats render through `formatStat`, so a missing value is an em dash and never 0. `streak` is the
live case: the API returns null on purpose until the calendar rule is approved.

**No automatic replay of a failed review.** `POST /student/flashcards/:id/review` carries no
idempotency key in the approved contract, so replaying after an ambiguous failure could advance
SM-2 twice for one answer. `canRetryReview()` states the rule — only a request that never
reached the server may be retried automatically — and the UI leaves the decision to the person.
**This is a backend contract limitation, reported rather than worked around.**

Decisions live in a pure `lib/student/srs-session.ts` with **20 regression tests**, so a race can
be tested directly instead of reproduced in a browser.

**Three environment traps that cost real time here — all three produced a false result first:**
- A `next start` that fails with `EADDRINUSE` keeps the OLD server answering, so the browser
  shows a stale build while curl returns 200. The first race test "failed" for this reason.
- `NEXT_PUBLIC_API_URL` is baked in at build time; changing `.env` and restarting is not enough.
- Grepping a bundle for a Vietnamese string finds nothing because the compiler escapes it as
  `\uXXXX`. Use an ASCII marker — a class name works.

**Verification**: web script tests **60/60**, `check-docs` 8/8, build clean, and the four runtime
scenarios above exercised against the live API on a production build. Fixtures seeded into the
test database and deleted afterwards (3 cards, 2 review states).

**Blocker / needs follow-up**: none for A04. A05 (route consolidation) is next in the checklist
and unblocked by this.
