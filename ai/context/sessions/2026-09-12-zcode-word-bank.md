## [2026-09-12] — Student completion wave, slice 2: Word bank S-SRS-6/7 — zcode — branch `feat/student-word-bank`

**Context**: slice 2 of the owner-approved wave; the slice-1 session file
(`2026-09-12-zcode-notifications.md`) carries the wave order and method. S-SRS-6/7 was the
third open item named by `01-srs-flashcards.md` §16 — that spec excluded it from its
four-endpoint contract and deferred transport to "the API owner"; the wave approval pinned
that transport, so this slice wrote `docs/api/modules/student/02-word-bank.md` first and
coded to it.

**Done**:
1. **Spec** (`02-word-bank.md`, 16 sections, 8 invariants + test matrix): Mongo
   `user_saved_words` per ENTITY_USER_SAVED_WORD verbatim (unique `(userId, hanzi)` whose
   upsert IS the duplicate rule; copy-at-save-time; `savedAt` = last bookmarked), 4 student
   endpoints, `WORD_BANK_NOT_FOUND` (not-found/not-mine share one code — no existence
   probing, same rule as module 07). Status pinned: save returns 201 for both first save
   and re-save (a dynamic 200/201 would need `@Res` and bypass the envelope interceptor).
2. **BE** (`apps/api/src/word-bank/`): repository-style service (userId required first
   param on every method), controller (static segments before `:id`), Mongoose schema with
   the unique compound index, module registered. Review-session hydration joins the
   catalog on hanzi and returns module-01-shaped card payloads so the EXISTING review
   endpoint/screen work unchanged — no second SM-2 path (INV-WB-07); unmatched hanzi →
   `id: null`, listed but unreviewable.
3. **FE**: `word-bank-service.ts` + a third tab `Kho từ` on `/student/flashcards` (list +
   `Bỏ lưu` + `Ôn các từ trong kho`) + `Lưu từ` on every browse tile. Save/delete flip UI
   only after the server confirms; bank refetches on tab entry (mount-fetch can't know
   about a just-made save).

**Two real defects the Playwright cut caught** (both fixed before commit):
- The browse grid rendered under the bank tab too (block not mode-guarded), making the
  bank's click targets unreachable — surfaced as a 45s click timeout on `Bỏ lưu`.
- The test's own locator: `EmptyState` renders its title as a styled `<p>`, not a heading,
  so `getByRole("heading")` never matched. Also note: this API ran with
  `forbidNonWhitelisted`, so a smuggled `userId` in a save body is **400**, not stripped —
  the INV-WB-01 test asserts the stronger behavior.

**Verification**: word-bank e2e **10/10** (upsert one-row, ownership vs DB, foreign-id 404
+ row survives, no-state-leak on save, state-survives-delete, id-null for unmatched,
smuggled-userId 400, role guard) · **full API suite 198/198 across 34 suites** (main
baseline 190 + 10 new, nothing broke; slice-1's 20 are on the other branch) · nest build +
tsc clean · web build clean · web unit **150/150** (5 new; 3 pre-existing failures in the
parallel lane's *untracked* `srs-pagination.test.mjs` assert CSS that lane has not
committed — excluded, not mine to fix) · check-docs 9/9 · Playwright **4/4** on
production build with real login.

**Environment incident**: Docker Desktop's engine died mid-session (P1001 on API boot).
Launched it from `C:\Users\nhata\AppData\Local\Programs\DockerDesktop\` — the default
`C:\Program Files\Docker\` path does not exist on this machine. Postgres container came
back healthy; nothing in the DB was lost.

**Not done (recorded)**: `lesson`/`passage` save surfaces arrive with the content screens
(wave slices 5/6 — spec §16 names this); note-editing API deferred (re-save covers it);
save-rate limit value unapproved (same open item as module 01 §13).

**Next**: merge window over the open PRs, then wave slices 3–7 resume.
