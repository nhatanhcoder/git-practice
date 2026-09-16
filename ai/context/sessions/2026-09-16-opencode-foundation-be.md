## [2026-09-16] — F9 Foundation backend + FE wiring (scope B, D1–D5) — opencode — branch `feat/student-foundation-be`

**Context**: owner asked to complete `/student/foundation` then test until done.
Scope B (full backend) chosen by owner; D1–D5 approved one by one in chat
(D1 content hashes, D2 Mongo versioned catalog + PG progress, D3 idempotent
studied-state without mastery/XP/streak, D4 no audio/PDF/upload/scoring,
D5 exact transport). G-practice deferred, M-read nonexistent — by design.
Main checkout also holds another lane's uncommitted writing work
(`feat/student-writing-live`: WritingModule + writing pages); untouched here
and excluded from every commit below.

**Contract-first (before endpoint code)**:
- `docs/api/modules/student/02-foundation-grammar.md` — §2 exact transport
  (7 endpoints), §3 DTOs, §9 error mapping (sole new code `GRAMMAR_NOT_FOUND`
  404, D5-approved), §1 physical design (Mongo `foundation_items` /
  `grammar_items` / `content_revisions` + PG `UserStudyProgress`), §12 import
  plan. Status → owner-approved to code.
- `API_STUDENT.md` — Foundation + Grammar endpoint tables; removed from the
  no-contract list. `API_ERROR_CODES.md` — `GRAMMAR_NOT_FOUND` registered.
- Page Contracts — `student-foundation.md` → `built` with live endpoints;
  `student-grammar.md` → BE live / FE unwired; `student-flow.md` traversals +
  FG table updated; `pages/_INDEX.md` foundation row → `built`.

**Built (BE)**:
- Corpus `apps/api/content/foundation.json` + `grammar.json` (byte-identical,
  SHA-256 verified vs D1). Key rule: pinyin keyed by `sound` (stable
  pedagogical identity, unique across initials+finals, enforced at import),
  radicals by `no`, rest by source `id`; tone `path` kept as coordinate pairs.
- Importer `scripts/foundation-import.ts` + `src/foundation/import/`
  (A11 pattern: dry-run default, `--apply` writes, D1 hash gate, fail-closed
  on invalid rows). Revision = sha256(files + key-scheme tag); v1→v2 key
  change minted a new revision instead of mixing generations. Applied to dev
  DB: 373 records; re-apply stable (0 would-create).
- Migration `20260916090000_add_user_study_progress` (hand-written —
  `migrate dev` refuses non-interactive shells; precedent exists) + PG
  `UserStudyProgress(userId, contentKind, contentKey, studied)` unique triple.
- Modules `src/foundation/` + `src/grammar/` (rules pure files, DTOs,
  services, controllers, modules; `@Roles('student')`, token-subject scoping,
  single-row PG upserts, no cross-DB transactions). 7 endpoints live.
- e2e `test/student-foundation-grammar.e2e.test.ts` **9/9** (audited counts,
  verbatim-fields, anon 401, idempotent SET + unset-must-not-read-studied,
  A/B isolation, VALIDATION_ERROR/GRAMMAR_NOT_FOUND, smuggled-userId 400).

**Built (FE)** — `/student/foundation` rewritten live:
- Catalog + progress from server; separable reads (progress failure ⇒ honest
  "Chưa có số liệu", never zero). Tab↔URL sync (back/forward/deep-link).
- Removed: fabricated mastery %, bestScore/attempts/minutes, sound tips,
  radical variants, fake toast buttons, +XP side effects, DemoStateSwitcher,
  prod UnavailableState gate (for implemented capabilities).
- Listening/speaking render source text only; media buttons disabled with
  reason (D4). PDFs disabled ("Chưa có tệp"); unverified pages/size omitted.
- Tone cards parse source coordinates into a normalised polyline; unparseable
  ⇒ contour text only.

**Bugs the tests caught (both fixed same day)**:
1. Pinyin keyed by ordinal source id (`ini-0`) — key is now `sound`; revision
   key-scheme v2 (module §12 records why).
2. Unmarked rows read back as studied (progress payload lacked the flag; page
   never filtered) — payload carries `studied`, readers filter `=== true`;
   e2e asserts it. Grammar service fixed identically (latent).

**Verification (all run)**:
- api build · e2e new 9/9 · full API suite 28/29 files green, sole red =
  pre-existing `API-018` (teacher-sessions list; fails on clean origin/main
  per KNOWN_ISSUES, untouched by this branch) · web build · web unit 233/233 ·
  eslint clean on all touched files · check-docs 9/9.
- Playwright `tests/student-foundation.spec.ts` **3 full runs × (desktop +
  375px) = 18/18 green**: real corpus render, mark→reload→unmark persistence,
  deep links, radicals search, disabled media. Screenshots read (ready +
  speaking, both viewports). Parallel-project race fixed by per-project sounds.
- Seeded `student@hsk.local` left with 0 studied=true rows (toggles paired).

**CI fixes (same day, before merge)**:
1. CI type-checks failed: `app.module` referenced the parallel writing lane's
   untracked `WritingModule` (absent from clean checkouts), and the PW spec
   spread `NodeList` (web tsconfig lacks downlevelIteration). Fixed by removing
   the writing lane's lines from this branch (its files untouched; it re-adds
   them on its own branch) + `Array.from`. Local `tsc` still reports the one
   writing-lane error because its untracked files sit in this checkout — CI
   checkouts do not have them.
2. CI api-quality failed 6/9: the e2e leaned on the imported corpus, but CI
   runs disposable databases with no import. Rewrote the e2e to self-seed a
   fixed `foundation-e2e` revision (placement/word-bank discipline; created +
   deleted in-suite, verified 0 rows left) and moved the audited 297/76 counts
   into a DB-free unit test `test/foundation-extract.test.ts` (5/5).
   Lesson: a suite that needs shared rows must bring its own fixtures.
- API-018 (pre-existing, sessions lane) — not this branch.
- Grammar FE wiring is the natural next slice (endpoints ready).
- `foundation-data.ts` / `radicals-data.ts` now orphaned by the foundation page
  (kept for the A12 dead-code sweep, Task-C precedent).
- Dev-DB catalog rows for key-scheme v1 persist unserved under the old revision
  (by design — rollback material, never served).
- `.gitattributes` correction: the `*.xlsx` line attributed to it in 5569d5d's
  message actually lives in `.gitignore` (misread diff header) — untouched either way.

**Next steps**: push, PR, merge review. Keep the writing lane's files out of
this PR (verify via `git status` before every commit — done throughout).
