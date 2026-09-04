## [2026-09-04] — Student LMS half: classes, lessons, assignments, attempts — Claude Code — branch `feat/student-hanlu-ui`

**Scope**: the owner's agreed Student scope has five sections. Section 1 (học theo lớp và
giáo viên) and section 5 (LMS bổ sung) had **no UI at all** — the Student rail was thirteen
entries, every one of them self-study. This session builds section 1.

**Contracts first**, per the project pipeline — seven files under
`docs/front-end-design-docs/pages/student-pages/`: six Page Contracts plus `student-flow.md`,
the role's flow map. Written from `FEATURES_STUDENT.md` (S-CLS-*, S-LESSON-*, S-ASGN-*),
`API_STUDENT.md` and `RBAC_MATRIX.md`, and nothing else.

**Built** (all `MOCK`, fixtures in `lib/student/lms-data.ts`, no API call):
- `/student/classes` — joined classes, join-by-8-character-code dialog
- `/student/classes/[classId]` — class facts, ordered lesson list, leave-class
- `/student/classes/[classId]/lessons/[lessonId]` — lesson content and attached assignments
- `/student/assignments` — every assigned task, filtered by class and status
- `/student/attempts/[attemptId]` — the runner: 2s auto-save debounce, countdown, question
  navigator with flagging, submit confirmation
- `/student/attempts/[attemptId]/result` — score, teacher feedback, per-question review

Plus `lib/student/lms-rules.js` (pure rules, JS+JSDoc so the Node runner imports it directly,
as `WEB-006` taught) with 20 tests in `scripts/lms-rules.test.mjs`.

**Two design points worth keeping**:
- A **submitted-but-ungraded** assignment offers no action. MCQ grades itself while Writing
  waits for the teacher, so a result link there would promise a score that does not exist.
- The result screen scales its denominator to the questions actually marked. Showing `10/20`
  while half the paper is unmarked reads as ten wrong answers; it shows `10/10` and says
  "Tính trên phần đã chấm. Bài đầy đủ 20 điểm."

**Blocked, recorded not invented**: `API_STUDENT.md` has **no Lessons section at all** — the
Student twin of `API-007`. Neither the lesson list on class detail nor the lesson screen has
an endpoint to call. Both contracts say so in `Blocked on`.

**Two bugs the screenshots caught that the build did not**:
- The result screen rendered `10/0`. The graded denominator derives from the attempt's
  questions, and the fixtures for submitted and graded attempts had `questions: []`.
- Adding two rail entries squeezed the mobile tab bar to eight 47px tabs and the Vietnamese
  labels collided. The bar now shows four destinations plus "Thêm"; the sheet still lists
  everything, so nothing became unreachable.

**Also fixed this session**: `/student/landing` was returning `Internal Server Error`. The
cause was a corrupted `.next` — two `next build` runs had been started in one command and
raced each other. A clean `rm -rf apps/web/.next` and single rebuild fixed it. The owner was
also seeing a stale UI because a `next start` from 20:59, built on a different branch, still
held port 3000.

**Verification**:
- `pnpm --filter web build` — Compiled successfully.
- `PW_AREA=student pnpm --filter web test:screens` — **50/50** (25 routes × desktop and
  375px), screenshots reviewed, not merely counted.
- `node --test apps/web/scripts/*.test.mjs` — 54/54.
- `node scripts/check-docs.mjs` — the 18 pre-existing `DOC-013` violations, no new ones.

**Trap re-confirmed**: the first screen-check run failed all 50 with `400 Bad Request` console
errors, because Playwright reused the Browser-pane preview server still holding port 3000.
`playwright.config.ts` already warns about exactly this. Stop stray servers before believing a
red run.

**Next steps**:
- Section 3 of the agreed scope: `/student/flashcards` still uses Leitner five-box with three
  ratings; ADR-016 settled on SM-2 with `Again / Hard / Good / Easy`.
- Sections 2 and 5 gaps: personal vocabulary store, listening and speaking practice, per-skill
  drills, Quiz Room, notifications, invoices.
- Give each agent its own git worktree. This slice was lost to a branch switch mid-session and
  survived only because it landed in a stash.
