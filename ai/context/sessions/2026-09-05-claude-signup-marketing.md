## [2026-09-05] — Signup screen, marketing data collection, and the auth UI — Claude Code — branch `feat/auth-signup-marketing`

**Context**:
The owner asked to update registration, add fields that collect data for advertising, and make
the login/signup UI attractive with animation. Investigation found there was **no registration
screen at all** — only `/login` — no Page Contract for either, and no consent or marketing
modelling anywhere in the entity or API docs. `POST /auth/register` accepted four fields.

**Owner decisions (2026-09-05)**: separate `UserMarketingProfile` table rather than widening
`User`; two-step signup with a skippable second step; Hán Lộ design direction.

**Done**:
- `UserMarketingProfile` (1:1, migration `20260905163207_add_user_marketing_profile`) with
  demographics, intent, attribution and consent columns, plus four enums.
- `marketing-rules.ts` — consent decisions as pure functions.
- `GET` / `PATCH` / `DELETE /auth/me/marketing`, and an optional `marketing` block on
  `POST /auth/register` stored in the same transaction.
- `/register` (new, two-step wizard) and `/login` rebuilt on the Hán Lộ tokens, which moved to
  `apps/web/src/styles/hanlu/` and are now shared with `/student/landing`.
- `AuthShell`, `auth.css`, `API_AUTH.md` § the three new endpoints.

**Why the data lives in its own table** — three reasons that all cost more to retrofit:
withdrawing consent deletes one row and leaves the account alone; auth queries stop carrying
gender, phone and birth year around; and RBAC over it is separate from everything else.

**Why consent is shaped the way it is.** The point of the table is that the data is *usable*
for advertising, and it only is if the consent is valid — so these are engineering constraints,
not paperwork:

- The checkbox is separate from account creation and unticked by default. Bundled consent is
  unusable consent, which would make every field above it unusable too.
- Granting stamps `consentedAt` and `consentVersion`. A boolean cannot answer "what exactly did
  this person agree to, and when", which is the question that actually gets asked later.
- Re-sending `true` does **not** move the original date; withdrawing clears the channels;
  an edit that says nothing about consent leaves it alone.
- **Birth year is collected largely for this**: HSK learners include minors, and someone under
  16 cannot validly consent for their own data to be used in advertising. Their request is
  refused and the row is marked, so a query for "who may we advertise to" cannot pick them up.
  Year only, never a full date of birth — a year is enough for an age bracket.

**Two design problems found while building, both worth remembering:**

1. **The two-step flow cannot be two requests.** A new account is `pending` until an admin
   approves it, so there is no session to call `PATCH /auth/me/marketing` with after signing up.
   Step 2 therefore submits *with* the registration. Noticing this after building the FE would
   have meant rebuilding it.
2. **A service returning bare `null` produces an empty 200 body.** `EnvelopeInterceptor`
   deliberately passes `null` through so 204s stay bodiless, so `GET /auth/me/marketing` had to
   answer with an object carrying `exists: false` instead. A client cannot tell an empty body
   apart from a truncated response.

**Also**: `check-docs` caught an invented `AUTH_UNAUTHORIZED` error code in the first draft of
the API docs. The real codes are `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED`. The rule against
inventing codes earns its keep.

**Verification** — browser, production build, against the real API:
- Registered an account through the form with `?utm_source=fb&utm_medium=cpc&utm_campaign=hsk4-t9`
  on the URL, landed on `/login?registered=1` with the pending message.
- Confirmed **in Postgres** that the row carried `birthYear` 1998, gender, `province` "Đà Nẵng"
  with diacritics intact, phone normalised `0912 345 678` → `0912345678`, `learningGoal`
  `study_abroad`, `currentLevel` 3, `referralSource` TikTok, all three `utm*` fields, and
  consent stamped `2026-09-05.v1` with a timestamp.
- Consent unticked by default; channel chips appear only once ticked.
- Desktop and 375px both render, no horizontal overflow; the art panel becomes a header strip
  on mobile rather than disappearing.
- Full API suite **164/164 across 26 suites** (23 new), web build clean, `check-docs` 8/8.
- Demo accounts deleted afterwards.

**Blocker / needs follow-up**:
- **No Page Contract exists for `/login` or `/register`.** `working-rules.md` requires
  `flow-mapper` → Page Contract before building a screen, and this went straight to code because
  the owner asked for the screens directly. The contracts should be back-filled.
- **`DOC-006` is still open and this work sits on top of it** — the entity calls the field
  `nickname`, the API calls it `fullName`. Deliberately not picked a side; the register form
  says "Họ và tên" and sends `fullName`, exactly as the endpoint already did.
- **No admin surface for this data yet.** RBAC intends Admin read access, but no
  `/admin/users/:id/marketing` endpoint or screen exists, so the collected data cannot currently
  be viewed or exported by anyone.
- **The consent text is placeholder wording.** It is clear and honest, but nobody with authority
  over the wording has approved it, and `consentVersion` is stamped `2026-09-05.v1` against it.

**Next steps**:
1. Back-fill the two Page Contracts.
2. Decide who approves the consent wording, then bump `CONSENT_VERSION` if it changes.
3. Admin read surface for the marketing data — otherwise it is collected and unreadable.
