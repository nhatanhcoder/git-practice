## [2026-09-16] — F10 Grammar practice port (option A) — opencode — branch `feat/student-grammar-practice-port`

**Context**: owner chose option A — keep #89's grammar BE, port zcode's reorder
practice adapted. zcode lane (`feat/student-grammar-live` worktree) read-only
throughout; its branch/worktree untouched (superseded — owner abandons after
this lands).

**Contract-first**: module 02 §1 (new `GrammarPracticeAttempt` table), §2/§3
(practice transport + DTOs, `tokens` stripped from list/detail), §6/§7/§8
(state machine, atomic insert, submissionId idempotency), §9
(`GRAMMAR_PRACTICE_CONFLICT` 409), §16 (option-A row + supersede note),
frontmatter; `API_STUDENT.md` +2 routes; `API_ERROR_CODES.md` +1 code;
`student-grammar.md` contract → `built`; `student-flow.md` FG14 live;
`pages/_INDEX.md` grammar row → `built`.

**Adaptations vs zcode (deliberate, recorded in §1/§16)**:
- No `UserGrammarProgress` (rejected shape) and no counters-on-row: results are
  `GrammarPracticeAttempt` rows, counts derived by COUNT.
- submit carries client `submissionId` (uuid): replay ⇒ stored result (no double
  count); same-id/different-answer ⇒ 409; concurrent duplicates collapse on the
  unique index (their counter-increment double-counts lost-response retries).
- File-backed catalog NOT adopted: Mongo versioned catalog stays (D2).
- Diacritic-insensitive search kept, reimplemented via NFD (their hand-listed
  combining marks trip `no-misleading-character-class`).

**Built**: migration `..._add_grammar_practice_attempts` (hand-written, deployed);
grammar rules/service/controller/DTO extended; e2e +4 practice cases (shuffle
without leak, grade+replay+conflict, envelope validation, derived counts);
`grammar-service.ts` FE client; grammar page rewritten live (filters, drawer,
reorder modal, 7 states, stale guard, prod gate removed); PW spec
`tests/student-grammar.spec.ts`.

**Bugs the tests caught (all fixed same slice)**:
1. e2e asserted `tokens` on detail — by the new design detail strips them.
2. PW clicked `.first()` token 3× — used-up tokens disable by design; click
   `:not([disabled])` instead (a correct UI behavior the test misunderstood).
3. Parallel projects share one seeded account — attempt counts accumulate;
   assert `>= 2`, never exact.
4. Production-gate unit test asserted the old gate — rewritten for the live
   contract (no gate + hooks-inside-inner).

**Verification**: api build · e2e 13/13 · full API suite re-run at PR time ·
web build · web unit 235/235 · eslint clean · check-docs 9/9 · PW grammar spec
3×(desktop+375px) = 18/18 green, screenshots read (ready + drill with a real
server-graded "Chưa đúng").

**Left for later**: learning-path (#88 rebase+merge), mistakes (#87
rebase+merge) — owner-approved queue; `grammar-data.ts` orphaned (A12 sweep).
