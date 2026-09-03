## [2026-09-03] — Combined Student learning domain decisions — codex — branch `codex/student-domain-decisions`

**Done**:
- Added accepted ADR-016: one product with two connected lanes, class learning and personal
  self-study. Teacher-selected catalog units are supplemental practice; only an
  Assignment/Attempt produces an official graded result.
- Accepted Foundation, Grammar, Writing, Lego, Workplace, Placement, curriculum paths, platform
  mock exams, XP, ranks, streaks, badges and leaderboard into the product domain.
- Chose production SM-2 over the FE's five-box Leitner mock. Standardized the UI mapping as
  Again=0, Hard=3, Good=4 and Easy=5, and standardized the canonical ease-factor formula across
  ADR, flow, entity, glossary, workflow prompt, roadmap and Student actor docs.
- Closed product conflict `SCOPE-02`. Kept `DOC-011` open with better evidence: the ten JSON
  files were located at `D:\PersonalProject\Chinese UI test\ui-claude\backend\data\content`,
  outside this repo, so production import/seed remains unresolved.
- Corrected an unrelated identifier collision in Admin module docs: missing Teacher session
  transitions now reference existing issue `API-004`, not product-model issue `SCOPE-02`.

**Authority/boundaries**:
- Student self-study progress is private by default.
- A teacher may view completion only for catalog units assigned to active students in the
  teacher's own class.
- Catalog authoring/publishing ownership, persistence boundaries, fields, endpoints, error codes,
  XP curve, leaderboard privacy and force-unlock behavior remain `⛔` pending contract review.
- ADR-016 accepts domain capabilities, not the proposed tables in `PROJECT_KNOWLEDGE.md` §8.9.

**Verification**:
- `node scripts/check-docs.mjs` — all 8 checks passed before every commit.
- `git diff --check` — clean apart from Git's existing CRLF normalization warnings.
- No code under `apps/**` changed; build and Playwright are not required for this docs-only task.

**Commits**:
- `7abb847` — accepted combined learning domain and Student/RBAC rules.
- `7df8807` — aligned project knowledge, roadmap and domain/API indexes.
- `3a7129e` — standardized the SM-2 rating/formula contract.

**Follow-up**:
- Write module/entity specs before implementing any new schema or endpoint.
- Validate and import/seed the external content corpus without depending on a developer-machine path.
- After UI PR #24 merges, add an ADR-016 reference to its Hán Lộ distilled status document.
