## [2026-09-16] — Merge outstanding lanes #88/#87/#86 — opencode (owner-directed "merge hết")

**Context**: owner ordered merging everything open. Pre-merge states: #89/#81
already merged by earlier work; #88/#87/#86 CONFLICTING; active worktrees for
other lanes (`Real-learning-path-live`, `Real-grammar-live`, `Real-teacher-imgopt`).

**#88 learning-path (codex branch, idle-clean worktree)** — merged inside its own
worktree: 2 real conflicts (package.json importer scripts, API_STUDENT foundation
section — both additive). Verified there: api/web type-check, both builds,
learning-path e2e 5/5, PW live spec 2/2 (needed dev-DB env + LP_API_URL or the
spec self-skips), check-docs 9/9. CI green → merged.

**#87 mistakes (codex branch, no active worktree)** — 11 conflict files, all
additive resolutions on a scratch branch, verified (builds, e2e 3/3, PW 2/2
after rebuilding a stale `.next`, check-docs), pushed to the lane branch,
CI green → merged (merge itself was completed outside this session).

**#86 landing removal (zcode branch)** — 1 conflict (PROGRESS append) + 2
latent CI breaks fixed on the lane branch: stale `three` specifier in
pnpm-lock (removed leftover `@types/three`, no src imports it) and one
`no-useless-assignment` in the lane's own route test. Verified: web build +
type-check, landing unit 7/7, PW landing spec 10/10, check-docs 9/9.
CI green → merged.

**Incident (honest record)**: while resolving #87 I lost track of the checked-out
branch and applied the #87 resolutions onto `tmp-86-resolve` (commit 8592e31),
where the lane's code files do not exist — check-docs caught it (5 violations:
links to missing mistake files). Fixed by `reset --hard`, redoing the resolutions
on the correct branch, and verifying `git show HEAD:` afterwards. Lesson: after
every branch switch, `git branch --show-current` + `git status` BEFORE editing;
verify resolutions landed with `git show`, not just absence of markers.
Also: `student_test_results.xlsx` appeared untracked during the session (unknown
owner, untouched); the writing lane's untracked files were moved aside twice for
local builds and restored byte-identical both times (verified by listing).

**Remaining**: PR #90 (grammar practice port) needs a main update (conflicts
expected in API_STUDENT/_INDEX/error-codes touched by #88/#87) then merge.
`feat/student-grammar-live` (zcode) superseded by option A — owner to abandon.
Tmp branches `tmp-87-resolve`/`tmp-86-resolve` are local-only resolution scratch.
