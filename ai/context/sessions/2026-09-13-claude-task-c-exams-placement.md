## [2026-09-13] — Task C: exams×3 + placement live — claude — branch `feat/student-exams-placement` (worktree `Real-exams-placement`)

**Context**: owner task: placement first (light questions, save a real level); exams reuse the
attempt lifecycle reading existing sources — no invented papers — else honest UnavailableState
+ Needs. Main checkout was occupied by opencode's `feat/student-dashboard-live` lane, so all
work ran in a dedicated worktree off `origin/main@ba827cb`. No DB migration; no auth/RBAC/money
change.

**Contract-first (before any endpoint code)**:
- `docs/api/modules/student/04-placement.md` — NEW: GET/POST `/student/placement`, 8 invariants
  (INV-PLC-01..08). Paper sampled from the **existing** teacher question bank (contiguous bands
  from 1, ≤6, 2 single-answer MCQs per band, deterministic order), grading + level rule
  server-side (ADR-005), level persisted to the **existing** `User.hskLevelGoal` (no new table —
  §16-Q1 records the history-table alternative for the owner). `PLACEMENT_NO_QUESTIONS` 409
  registered (the one new code).
- `03-attempt-lifecycle.md` amended — **INV-ATLP-12**: `GET /student/assignments/:id/attempt`
  (pure own-attempt lookup on `(assignmentId, studentId)`; sentinel `{ attemptId: null,
  status: null }` because the envelope interceptor passes a literal null through unwrapped).
- `API_STUDENT.md`: placement left the "no endpoint contract" list; F13 mock exams stay there.
  `_INDEX.md` + `API_ERROR_CODES.md` updated.

**Built**:
- **BE**: `apps/api/src/placement/` (rules pure file + service + controller + module) —
  sampling, exact-set grading, band rule (highest B with every band 1..B correct, floor 1,
  cap = paper's highest band), `User.hskLevelGoal` write. `attempts.service.findMyAttempt` +
  controller route.
- **FE**: `/student/exams` (lobby: real assignment list filtered to `mock_test`, per-card
  attempt status via INV-ATLP-12, placement CTA), `/student/exams/[examId]` (door: rules of the
  paper → start/re-enter → hands to the live take screen; not-found for anything not in the
  student's own list — fixture ids included), `/student/exams/[examId]/result` (resolver →
  redirect to `/student/attempts/:id/result`; in_progress → back pointer; none → honest empty),
  `/student/placement` (quiz reveals nothing; result renders the server grade + saved level;
  audio player for listening prompts). **The old client-clock client-scored exam room
  (ADR-005 violation) is deleted. MOCK markers gone from all four routes.** Orphaned
  `content.ts` fixtures (`exams`, `placementQuestions`) + `scorePaper` left for the A12 sweep
  per the A05 precedent — no consumer remains in these pages.

**Verification (all run)**: api build · placement e2e **13/13** (pure rules + live, Mongo-oracle
grading pollution-proof) · resolve e2e **4/4** · full API suite **318/319 across 55 suites** —
the 1 fail is `API-018` (teacher-sessions list), **reproduced on a pristine `origin/main`
worktree** before filing, not a Task C regression · web build (57 routes) · web unit
**221/221** · structure test 7/7 (no re-mock, no client scoring, no key on the wire) · lint ·
check-docs **9/9** · PW **10/10** (`student-exams-placement.spec.ts`: exam DoD — reload keeps
the saved answer, hammering the submit confirm yields exactly **1 POST**, submit lands on the
attempt result, result deep-link resolves; placement — paper → server grade → saved level
survives reload) · attempt DoD spec **6/6**. **Hết giờ auto-submit**: server side is
INV-ATLP-05's real 65s e2e (passes in the full suite); the client effect is the take screen's
existing `remaining === 0 → submit("timeout")`, shared with the PR #73 DoD path and exercised
unchanged. Screenshots read: exams lobby (real chips incl. "Đã nộp" + per-attempt result
links), placement (audio player, "trình độ hiện tại: HSK 3" persisted from a previous run).

**Fixture debris (documented policy)**: `Task C exam class/mock_test ${timestamp}` + 6
listening questions + placement attempts — public-API only, timestamped, left in the dev DB
like the PW sweep's; CI runs disposable DBs.

**Blocker / needs follow-up**:
- `API-018` filed (pre-existing, sessions lane).
- F13 catalog + placement depth needs recorded in `Needs from the other lane`.
- Worktree dirs `Real-tc-base` (git-unregistered) remain on disk — safe-delete shim blocks
  bulk deletion; harmless.

**Next steps**: push, PR, merge review.
