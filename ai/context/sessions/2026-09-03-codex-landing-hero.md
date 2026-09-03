## [2026-09-03] — Student landing hero polish — codex — branch `feat/student-hanlu-ui`

**Done**:
- Increased supporting-copy and tag contrast in the light theme without changing the intentionally
  faint decorative watermark.
- Capped the desktop hero height at 820px so tall screens no longer create the oversized blank band.
- Moved the decorative Hanzi watermark from behind the copy to the portrait side; preserved the
  mobile content order and removed the height floor below the tablet breakpoint.

**Verification**:
- `pnpm --filter web build` — passed; 38 routes generated.
- `PW_ROUTES=/student/landing pnpm --filter web test:screens -- --timeout=120000` — 2/2 passed
  against a production server at desktop 1280×800 and mobile 375×812.
- Opened both generated full-page screenshots. Also inspected the light-mode hero at 1280×800,
  1280×1108 and 375×812; the tall desktop hero measured 820px and page width did not overflow.
- Browser console inspection for the mobile render returned no errors or warnings.
- `pnpm check:docs` — failed on the same 18 pre-existing `endpoint-undefined` violations recorded
  in `DOC-013`; this CSS-only task introduced no contract or endpoint reference.

**Scope/decisions**:
- Existing screen polish only; no Page Contract, design-baseline document or API contract changed.
- No DB schema, auth, RBAC, payment rule, endpoint, field or error code changed.
- The screen remains 🔶 because its data is mocked.

**Remaining project blocker**:
- `DOC-013` is pre-existing and unrelated: the repository docs gate reports undefined Student API
  endpoints that require the docs/API lane to reconcile.
