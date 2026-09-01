# 2026-09-01 — Resolve Teacher role scope (SCOPE-03) — Claude Code

**Context**: user pasted a KẾT PHIÊN report from a parallel Cowork/device-mount session that had
been planning Teacher FE+BE work (a 16-item todo list: settle full-vs-read-only, unify
`/api/v1/teacher/**`, resolve a client-demand/RBAC/feature/roadmap conflict, settle `SCOPE-01`
Classes/Enrollment, fill missing API contracts, then build Flow Map → Page Contracts → Auth →
... → Payroll). That session's report said nothing had been recorded (`Đã ghi vào: KHÔNG`) and it
was blocked on the human choosing "Teacher full management" vs "Teacher read-only per
client-demand" before it would write a coding plan.

**Done**:
- Checked `D:\PersonalProject\Real` (this checkout): clean, nothing uncommitted. The "repo has
  uncommitted changes" blocker in the pasted report refers to the *other* session's sandbox
  (per `COWORK_BOOTSTRAP.md`: "the sandbox has no git identity: it can stage, it cannot commit"),
  not this one — that work is still stuck there, unrecorded, and out of reach from here.
- Searched the repo for any basis for "Teacher read-only per client-demand" — found none. Checked
  the three sources that should settle it, and they already agree with each other:
  `docs/shared/RBAC_MATRIX.md` (Teacher = 🔒 create/update/archive on Class, Assignment,
  ClassSession), `docs/api/API_TEACHER.md` (full CRUD), `docs/roadmap/SPRINT_PLAN.md` (S2–S8 have
  Teacher building these directly). There was no real repo-vs-repo conflict to resolve — only an
  unwritten external claim with nothing behind it to check.
- Put the choice to the user directly (repo evidence vs. an unverifiable external claim). Answer:
  **full management, per RBAC.**
- Recorded as `SCOPE-03` in `ai/known-issues/KNOWN_ISSUES.md` (Resolved), and a line in
  `ai/PROGRESS.md` § Still unsettled, so the decision survives regardless of which session
  continues the Teacher work next.

**Correction (same session, before this branch was merged)**: the "Resolved" call above was wrong.
The search for "client-demand" used `grep --include="*.md"`, which silently skipped
`docs/actors/teacher/client-demand.txt` — a `.txt` file, and the actual document the other
session's report meant. It says `Access level: Client Demand (Read Only)` and its Sprint 1–3
items are worded as view-only. Reopened `SCOPE-03` rather than leave a confidently-wrong
"Resolved" in the repo. Full analysis (including why `(Read Only)` most likely labels the document
rather than the role — Admin's `client-demand.txt` has the identical header and Admin is not
read-only) is in the `SCOPE-03` entry itself now, not duplicated here.

**Lesson**: a `--include="*.md"` grep across `ai/`/`docs/` is not a complete search of this repo.
Requirement source docs live as `.txt` under `docs/actors/*/client-demand.txt` — check those
by name, don't rely on an extension-filtered grep turning up nothing as proof they don't exist.

**Blocker / needs follow-up**:
- `SCOPE-03` needs the owner to say which reading is correct before Teacher Page Contracts are
  written — full CRUD screens or view-only screens is a different contract either way.
- The other session's uncommitted Teacher-planning work is still stuck in its sandbox — someone
  needs to either finish it there and commit on Windows, or redo it here.
- Items 2 (unify `/api/v1/teacher/**`), 5–16 of that session's list are still open.

**Next steps**:
- Owner to resolve `SCOPE-03` (full CRUD vs. view-only) before any Teacher Page Contract is written.
