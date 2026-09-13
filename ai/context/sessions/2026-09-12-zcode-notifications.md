## [2026-09-12] — Student completion wave, slice 1: Notifications module 07 end to end — zcode — branch `feat/student-notifications`

**Context**: the owner's instruction was "làm và tự test đến khi pass" over the audit list of
uncoded student features (self-study, gamification, lesson detail, word bank, drill, quiz
room, S-ANL-4/5, S-BILL-3). All of them sit behind "no contract yet" gates, so the working
method agreed in the plan: write/pin the spec decisions, then code to them, one slice per
branch with full verification and its own PR. Slice order (smallest dependency footprint
first): notifications → word bank → drill → gamification → lesson detail → self-study →
quiz room. This file records slice 1.

**Done**:
1. **BE mailbox** (`apps/api/src/notifications/`): repository whose every method takes
   `userId` as a required first parameter — the ownership constraint is structural
   (INV-NOTIF-05), not remembered. Service: `createManyWithinTx` is the ONLY creation path
   (takes the caller's transaction handle — INV-NOTIF-08/§7), list/count/mark-read/read-all
   with the guarded one-way gate (idempotent second read keeps the first `readAt`,
   INV-NOTIF-03/04; already-read ⇒ 200 no-op, never 409). Controller: 4 endpoints, no
   `@Roles` (every authenticated role reads its own), static segments before `:id`,
   `NOTIFICATION_NOT_FOUND` 404 registered (foreign row ⇒ bare 404, never 403).
2. **Producers wired in-transaction**: register fans out `new_<role>_registration` to every
   active admin (N admins = N rows, one multi-row insert); approve/suspend write
   `account_approved`/`account_suspended` inside the guarded conditional update — a second
   concurrent approve matches 0 rows so no second notification (INV-NOTIF-12). Billing
   single-create moved onto the service; **batch restructured from per-row loop writes to
   one transaction + createMany + read-back-by-code for the real invoice ids** (DEBT-007).
3. **FE**: `lib/student/notifications-service.ts` (sentences per enum type — no message
   column exists, FE builds text per the §16 default; deep-link only where referenceType
   allows, null ⇒ never a fake link) + `/student/notifications` page (loading/error/empty/
   all-read/ready as five distinct facts; mark-read only after the server confirms; failed
   marks leave the row exactly as the server last said) + shell bell in desktop HUD and
   mobilebar, polling every 60s (DEBT-002), badge renders only the last server-confirmed
   count.

**Verification**: notifications e2e **20/20** against the real DB (ownership checked against
DB rows, not just responses; no POST/DELETE routes exist; fan-out count == active admins;
second approve ⇒ no second row; foreign `:id` ⇒ 404 and B's row untouched; envelope/ISO-8601)
· **full API suite 208/208 across 35 suites** (baseline on main was 190; nothing broke)
· `nest build` + `tsc --noEmit` clean · web build clean · web unit tests 156/156 ·
check-docs 9/9 · Playwright `student-notifications.spec.ts` **4/4** on a production build
with real login · screenshot forensics PASS (badge "1" appears with 1 unread and disappears
after mark-read; unread dot vs dimmed read rows; "Đánh dấu tất cả đã đọc" renders only with
unread>0; no 375px overflow).

**Procedural notes for the next slices**:
- One real parser trap cost a build cycle: `account_*/new_assignment` inside a JS block
  comment — `*/` closes the comment early and SWC fails with a confusing "Expected ';'".
  Avoid `type_*/…` globs inside comments.
- The notifications e2e suite self-creates and deletes its accounts; it does NOT touch the
  seed admin's mailbox (only counts a baseline). Keep it that way (API-012's lesson).
- The desktop screenshot from the spec is a 375px frame — the test sets the viewport by
  hand; if a real 1280px capture of the mailbox is wanted, add a separate screenshot test.
- 2 `student-identity.spec.ts` cases remain red on this branch for the pre-existing reason
  (missing `a01.student@hsk.local` fixture + 429 rate-limit cascade), proven unrelated by
  stashing on the WEB-020 branch. That fix belongs to its own slice.

**Not done (recorded, not lost)**: producers for `session_submitted_for_review` (teacher
submit endpoint), `deadline_reminder` (scheduler unowned), `graded` (Sprint 4), and the
`new_assignment` producer — wait, that one ALREADY exists from the S3 slice on
`feat/s3-assignments` (PR #63): on merge, three lanes' producers coexist; the module's
`createManyWithinTx` is not used there yet (S3 predates it). Unifying S3's publish fan-out
onto the service is a small follow-up when #63 lands. Partial-unique anti-duplicate
migration + composite/partial indexes deferred until the table carries real load (spec §8/§11).

**Next steps (this wave)**: slice 2 word bank (S-SRS-6/7) → slice 3 drill → slice 4
gamification → slice 5 lesson detail (after PR #63 merges) → slice 6 self-study → slice 7
quiz room. Each with the same RECORD discipline as this one.

## Merge review follow-up — 2026-09-12

Merged the current `main` security/bootstrap/dead-code work into the branch. The SRS stylesheet
conflict kept main's owner-requested dense flashcard grid and retained the notification styles
that did not overlap it. The four CI lint failures in `notifications.e2e.test.ts` were fixed with
typed response envelopes and by removing an unused admin mailbox count. This review does not
restate the earlier real-DB result: the database-backed notification suite is NOT RUN in the
review worktree and must be proved again by current-head CI before merge.
