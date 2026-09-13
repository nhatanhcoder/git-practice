## [2026-09-12] — Student invoice read path (S-BILL-1/2, SCOPE-BILL-01) — zcode — branch `feat/student-invoices`

**Context**: owner asked to check whether the student invoice work existed, continue it if
partial, or start it. Checked first: no BE endpoint, no FE route, no Page Contract anywhere —
but `API_STUDENT.md` § Billing already defined both endpoints, RBAC granted students 🔒
read-own, and accepted `06-billing.md` §5 (SCOPE-BILL-01) mandated exactly how: dedicated
handler, `studentId` from the token in the WHERE, `status <> 'void'` hidden, never the admin
handler reused. Task type: CODE, money-adjacent — the owner's instruction named the scope, so
it served as the explicit approval; nothing outside that scope was touched.

**Task type**: CODE. No DB schema change, no Auth mechanism change, no RBAC matrix edit
(implemented the already-granted 🔒 row), no money arithmetic anywhere.

**Done (BE)** — commit `ff6c9f8` (rebased; originally `89183f3`):
- `StudentInvoicesController` (`@Controller('student/invoices')`, `@Roles('student')`) +
  `listMyInvoices` / `getMyInvoiceDetail` in `BillingService` + `ListMyInvoicesQuery`
  (page/limit/status only — **no `studentId` field at all**, so `forbidNonWhitelisted`
  rejects `?studentId=` with `VALIDATION_ERROR`; the filter physically cannot be influenced).
- Ownership is a WHERE condition on every query (`studentId = actorId`, `status <> void`),
  never read-then-check (INV-BILLING-33). Foreign invoice, voided invoice and malformed uuid
  all → `INVOICE_NOT_FOUND` 404 — "not yours" and "does not exist" are one answer.
- Responses omit `studentId`/`studentName`/`studentEmail` (INV-BILLING-34); `recordedBy`
  carries only the admin's id + display name. Money stays decimal strings; `outstandingAmount`
  derived server-side (INV-BILLING-16, ADR-010); payments[] `paidAt ASC, id ASC`.
- **Real bug the e2e caught in the first cut**: `?status=void` fell through to the unfiltered
  branch and listed everything non-void. Void now answers an explicit empty set. Also learned
  Prisma takes ONE filter key per status object (`equals` + `not` together silently misbehaves).

**Done (docs)** — commit `d435d09`: Page Contracts `student-invoices.md` +
`student-invoice-detail.md` (flow-mapper template, 7 states each), registered in
`pages/_INDEX.md`, billing branch + 2 transition rows added to `student-flow.md`. The
status-drift check earned its keep twice: caught me writing `built` before the code existed,
then `contracted` after the code landed.

**Done (FE)** — commit `a9abdb9` + fix `ce9c9d7`:
- `lib/student/invoices-rules.ts` (leaf pure module, Node-testable) + `invoices-service.ts`
  (apiRequest only, no fallbacks) + `/student/invoices` and `/student/invoices/[invoiceId]`
  pages + sidebar "Học phí" entry + PAGE_TITLES mapping.
- Money renders from envelope decimal strings via `formatMoney` (digit grouping **without
  Number()** — digit-exact even past 2^53); totals are three separate tiles; the FE subtracts
  nothing. `not_found` collapses not-yours/nonexistent/voided, mirroring the API.
- Browser check caught the due date rendering as a doubled range ("10/10/2026 – 10/10/2026");
  fixed with a single-date `formatDate` + regression test.

**Environment incidents — all recorded in `KNOWN_ISSUES.md` GIT-004, none were code bugs**:
1. A second session shared this checkout and switched branches under me: my branch refs were
   zeroed (recovered via `git fsck --lost-found` + `git update-ref`), and mid-browser-test the
   served build was replaced by a branch without my routes → the blank detail screen that
   briefly looked like my bug. Finished all work in worktree `D:\PersonalProject\Real-invoices`.
2. A stale API process served a pre-rebase build (404 "Cannot GET") — looked like a missing
   route; the process predated the rebase.
3. Multi-tab refresh races produced endless "Đang kiểm tra phiên đăng nhập…" in new tabs while
   old tabs worked — pre-existing auth-layer limitation (single-flight is per-tab only; see
   API-016), reproduced and left alone (out of scope).

**Verification** (all in the worktree, rebased onto origin/main; the two carried
non-invoice commits — lesson-detail and dashboard-live, each owned by its own session/branch —
were dropped from this branch so the PR stays single-purpose):
- invoice e2e **10/10** (isolation, void-hidden, email-absent, role-gate, filter, ordering)
- full API suite **262/262 across 45 suites** (tsx CLI per BUILD-005; Node 25 loader broken)
- web build **44/44**, both routes generated (`○` list, `ƒ` detail)
- web script tests **170/170** (15 new in `student-invoices.test.mjs`)
- check-docs **9/9**
- **Live browser** (production build, real login `student@hsk.local`, 2 seeded invoices):
  list — codes, status chips, correct digit grouping (1.500.000,00 ₫), server outstanding
  (1.000.000,00 ₫); detail — three amount tiles + payment history with recorder display name;
  screenshots read. States no one looked at in the browser: empty, error, invalid_id,
  not_found (all covered by unit/e2e instead).

**Blocker / needs follow-up**:
- GIT-004: the second session was still active in the main checkout when this session ended;
  the worktree convention needs enforcing.
- Notification deep-link: `new_invoice` now has a real target; the notification producer
  already sets `referenceType: 'invoice'` — FE notification list wiring is the notifications
  lane's remaining slice.

**Next steps**:
- PR review/merge for `feat/student-invoices`.
- If the owner wants the student invoice list linked from the dashboard's "Khả dụng ngay"
  section, that is a one-line follow-up in the dashboard lane.
