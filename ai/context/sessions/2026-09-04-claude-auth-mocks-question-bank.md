## [2026-09-04] — Login, honest failures, and the question bank on MongoDB — Claude Code — branch `feat/s1-teacher-classes-api`

**The question asked** was narrow: *"Check(admin) — has FE-BE-DB been linked yet? Delete the mock
data."*

**The first answer was wrong, and the way it was wrong is the most useful thing here.** Read from
`main`, the repo genuinely has no backend: `apps/api/src` is five files, `apps/web` contains not a
single `fetch` or `axios` import, and `schema.prisma` has one model. I reported that, planned four
PRs to build it, got approval, created a branch, started writing an envelope interceptor and a
`RefreshToken` migration — and then `prisma migrate diff` reported that the live database already
had `refresh_tokens`, `classes` and `lessons` tables that no tracked migration creates.

`_prisma_migrations` held three rows against one migration folder on disk. `git log --all` found
the rest: **the entire backend already existed** on `feat/s1-teacher-classes-api`, eleven commits,
pushed, last touched the same day. Auth with refresh rotation and replay detection, admin users,
teacher classes and lessons, FE service layer, 80 passing e2e tests. About thirty minutes of work
was thrown away, and the branch was adopted instead of rebuilt.

**Lesson**: "does this exist?" answered from the working tree answers a different question than
"has this been done?". `git log --all --diff-filter=A` costs one command. On a repo with 30 local
branches and long-lived unmerged work, checking `main` alone is not checking.

---

### What was actually wrong

The backend was real and passing. What was broken was everything between it and a user.

**No `/login` route existed anywhere.** The FE was wired to a JWT-protected API with no way to
obtain a token. `find apps/web/src/app -iname "*login*"` returned nothing.

**So every guarded call 401'd — and every screen hid it.** `/admin/users` issued the real request,
received 401, ran `.catch(() => {})`, and rendered eight invented accounts. The screenshot of that
screen is indistinguishable from a working one; the row count even matched the eight seeded users
by coincidence. The service layer returned `FALLBACK_USERS` flagged `isFallback: true`, a flag no
caller read. `/admin/profile` showed a hardcoded admin as "my profile" and toasted "Đã lưu hồ sơ"
on a **failed** PATCH. `/admin/users/[userId]` rendered invented enrollments and attendance as that
account's record. `createTeacherClass` fabricated a class **with an enrollment code** and returned
it as created. `/teacher/classes/[classId]/lessons` looked its class up in a mock array keyed by
mock ids, so every real class — uuids — rendered "Không tìm thấy".

Full detail in `KNOWN_ISSUES.md` `WEB-011` and `WEB-012`.

### Done

- **`/login`**, mapping the registry `code` rather than the HTTP status: a pending account and a
  wrong password are both failed logins and need opposite advice.
- **Token in memory**, not `localStorage` — `working-rules.md` § Auth Rules says so and it was
  being violated. `restoreSession()` on mount turns the httpOnly refresh cookie back into a
  session, because a memory-only token means a reload starts with nothing else.
- **401 → refresh once → retry once, single-flight.** Not an optimisation: refresh tokens rotate,
  so two parallel refreshes carrying one cookie look exactly like a replayed stolen token and the
  server revokes the whole family. Sharing one promise is what stops a race causing a forced logout.
- **`RequireAuth`** on `/admin` and `/teacher`, waiting out the `unknown` state rather than
  bouncing a signed-in user on every reload.
- **Every mock fallback deleted.** `user-detail-data.js` removed, `FALLBACK_USERS` removed, the
  teacher service's three fallbacks removed, the profile screen's fake optimistic save removed.
  Screens now distinguish loading / empty / forbidden / failed-to-load and show the server's own
  message.
- **`SessionChip`** — the admin screens hardcoded "AT / Anh Tuấn" and the teacher shell "PL / Phạm
  Thị Lan", naming people who were not signed in, with no sign-out anywhere.
- **`WEB-004` closed**: all 14 REVIEW-STATE switchers are dev-only now. Over live data that widget
  let a failed load be repainted as "ready".
- **Question bank on MongoDB** — the first module to use the connection for anything but a health
  ping. Schema per `ENTITY_QUESTION.md`, five endpoints, cross-field rules in a pure
  `question-rules.ts`, ownership enforced in the service, `/teacher/questions` wired to it.

### Verification

Everything below was run, not assumed.

```
pnpm --filter api test          93/93   (13 new, against real Postgres + Atlas)
pnpm --filter web build         Compiled successfully
PW_AREA=admin   test:screens    20/20   desktop 1280 + 375px
PW_AREA=teacher test:screens    14/14   desktop 1280 + 375px
node --test apps/web/scripts/*  36/36
node scripts/check-docs.mjs     8/8
```

Screenshots were opened and read, not counted — three defects came out of looking at them: the
teacher shell naming the wrong person, the REVIEW-STATE switcher still shipping in production, and
`/admin/payroll` scrolling horizontally at 375px.

In a browser, on the production build: signed in as `admin@hsk.local`, approved
`teacher.pending@hsk.local` from the UI, `PATCH .../approve → 200`, and the row changed to `active`
**in Postgres**. A student token on `/admin/users` returns `403 AUTH_INSUFFICIENT_ROLE` with the
flat envelope. `/teacher/questions` renders seven questions served from Atlas with Chinese intact.

The 401 path was exercised deliberately rather than reasoned about: the API was restarted with an
8-second access TTL, and the network log shows `GET /admin/users?role=teacher` **401** →
`POST /auth/refresh` **200** → the same GET **200**, invisible to the user.

### Things worth knowing next session

- **The Playwright harness lived only on `feat/student-hanlu-ui`**, while the rule mandating it
  (`CLAUDE.md`, `working-rules.md` § Verify) is on that branch too. This branch had no way to run
  the check it is required to run. Cherry-picked here and taught to sign in — without that, every
  guarded screen screenshots the login gate and still passes, because that gate renders its own
  `<main>` with an `<h1>` and returns 200, exactly like the "not found" branch the spec already
  guards against.
- **`KNOWN_ISSUES.md` has diverged across two live branches** and both are appending ids
  independently. `DOC-014`. This session skipped `WEB-007`–`WEB-010` and `API-010` deliberately.
  Do not let git auto-merge that file.
- **Manually approving `teacher.pending@hsk.local` breaks three tests** (`API-012`). It happened
  here: the suite went 93/93 → 90/93 with no code change, because two tests depend on that seed row
  staying `pending` while every other suite builds its own fixtures.
- Chinese text stored as `?????` on a first manual check. It was the Windows shell's encoding, not
  the app — which is why round-tripping CJK is now an assertion in the test suite rather than a
  thing someone eyeballs once.

### Not done, and why

Five admin screens are **still fully mocked and were deliberately left that way**: invoices,
payroll, pay-rates, tuition-rates, monitoring. Deleting their mock data would leave blank screens,
because the endpoints behind them cannot be written yet — money representation has never been
decided (`ADR-010`, entities use `Decimal(10,2)` and VND has no minor unit), `API-002` has two
contradictory rate-reading formulas that produce two different amounts for the same period,
`SCOPE-01` leaves Classes/Enrollment undefined while Sessions and Payroll depend on it, and
`API-004` means `/admin/sessions/pending` would be permanently empty. Those are owner decisions,
not coding ones.

`/teacher/assignments`, `/teacher/grading`, `/teacher/sessions` and `/teacher/income` are also
still mocked: no Assignment, Attempt, Session or Income endpoints exist.

### Next steps

1. Merge this branch. It fast-forwards onto `main` cleanly (`main...branch` = `0 · 15`).
2. Reconcile `KNOWN_ISSUES.md` with `feat/student-hanlu-ui` **by hand** before either lands
   (`DOC-014`).
3. Settle `CR-3` (storage), then audio upload — until then no listening question can be created
   from the UI (`API-011`).
4. `API-012`: give those two tests their own fixture instead of a shared seed row.
