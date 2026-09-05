## [2026-09-05] — Student area put behind a login; self-study API scope found blocked — Claude Code — branch `feat/s1-student-auth-gate`

**Context**:
The owner asked for three things: create the DB for the self-study lane, finish the self-study
APIs and wire them to the FE, and make student login work with admin approval. Investigation
split those cleanly into one item that was buildable today and two that the repo's own rules
forbid building yet. The buildable one was done; the rest is written up below rather than
guessed at.

**Done**:
- `apps/web/src/app/student/layout.tsx` — every `/student` route now requires a signed-in
  student. `/admin` and `/teacher` had `RequireAuth`; `/student` had **nothing**, so the whole
  learner area was reachable with no account at all. It stayed invisible because those screens
  are mock-backed: nothing fetched, so nothing ever returned 401 to expose it.
- The layout stays a **server component** and renders `RequireAuth` around the shell. `/admin`
  became `"use client"` wholesale and lost its per-area `metadata` that way (`WEB-005`); this
  keeps it.
- `KNOWN_ISSUES.md`: `WEB-015`, `WEB-016` (both found by the browser pass, see below).

**Verification** — browser, production build, every step observed:
- `pnpm --filter web build` clean (31 routes).
- Anonymous `GET /student` → redirected to `/login?next=%2Fstudent`.
- Registered-but-unapproved student → **403 `AUTH_ACCOUNT_PENDING`**, and the form shows
  *"Tài khoản đang chờ quản trị viên duyệt"* — **not** the wrong-password message.
- `PATCH /admin/users/:id/approve` as admin → same credentials → **200**, landed on `/student`.
- Desktop and 375px screenshots captured.

**Two traps worth remembering from that pass**, both of which nearly produced a false report:

1. **The page under test was the wrong build for a while.** `preview_start` resolves
   `.claude/launch.json` from the *primary* working directory, not from the worktree, so it
   started the other agent's server from `D:\PersonalProject\Real`. Separately, this session's
   own `next start` died with `EADDRINUSE` on 3000 and the failure was only in the background
   log — the browser happily showed a page the whole time. **Always confirm which process is
   serving the port before trusting what the page shows.** Worktree servers were finally run on
   3100 with `CORS_ORIGIN` pointed at it.
2. **`form_input` on a React controlled input desynchronises the DOM from React state.** Setting
   a value that way, then typing, left the DOM at 12 characters while React still submitted the
   old 34-character value — producing two `401`s that looked exactly like a pending-account bug
   being mis-mapped to "wrong password". The API was returning the correct `403` all along.
   `document.querySelector('form').requestSubmit()` after typing into a JS-focused field is what
   worked; `key: Return`, `ctrl+a` and `Backspace` never reached the input.

**Found, not fixed** (pre-existing; visible only once a real account was used):
- **`WEB-015`** — the student shell greets *"Chào buổi tối, Mai Anh"* and shows 2.450 XP and a
  12-day streak while signed in as *Học Viên Demo 2*. Same defect class as `WEB-011`: invented
  data presented as the user's own.
- **`WEB-016`** — the `Sẵn sàng / Đang tải / Rỗng / Lỗi` DEMO switcher renders in the
  **production** student build. `WEB-011`'s fix made this dev-only on admin and teacher screens
  and never reached the student ones.

**Blocked — the two parts of the request that were NOT built, and why**:
- **Most of the self-study API cannot be written yet.** `docs/api/API_STUDENT.md`
  § *Accepted capabilities with no endpoint contract yet* lists foundation, grammar, character
  writing, Lego, workplace, learning path, placement/mock exams and XP/rank/streak/badges/
  leaderboard, and states plainly that **no path, DTO, error code or module invariant has been
  approved**, ending with ⛔ *"Define these in Student/Teacher module specs before adding
  endpoints."* There is no `docs/api/modules/student/` directory at all. Building these would
  mean inventing roughly thirty endpoints against the repo's own prohibition.
- **The self-study DB cannot be created yet either.** `PROJECT_KNOWLEDGE.md` §8.9 says the seven
  tables are *"a proposal; ADR-016 approves the capabilities, not these SQL boundaries or
  columns"*, and §8.10 Q1 — static JSON versus importing into MongoDB at seed time — is open and
  *"decides the entire repository layer for F10–F14"*. `DOC-011` still has the content corpus
  outside this repository.
- **SRS Flashcards is the exception and is genuinely buildable**: four endpoints are defined in
  `API_STUDENT.md`, `ENTITY_FLASHCARD` / `ENTITY_USER_FLASHCARD_STATE` / `ENTITY_USER_SAVED_WORD`
  are all full specs, and ADR-016 settled SM-2. The one gap is content — flashcards are
  *"seeded by Admin / system"* and no vocabulary source exists anywhere, including in the
  external corpus (which has grammar, writing, lego, exams, workplace, learning-path, badges,
  levels, leaderboard and foundation — **no vocabulary file**).

**Next steps**:
1. Owner decides: write the Student module specs first (the prescribed unblock), or narrow scope
   to SRS Flashcards, which needs only a vocabulary-content decision.
2. `WEB-016` before any student screen is wired to a real endpoint.
3. `WEB-015` alongside the first real student data.

**Environment note**: built in the sibling worktree `../Real-claude-student` against the isolated
database `hsk_dev_student`, because the main checkout is occupied by another agent. Local-only
`.env` there has `CORS_ORIGIN=http://localhost:3100`; restore it to 3000 before using that
worktree with a server on the default port.
