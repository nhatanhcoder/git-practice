---
title: Backend Module Specs — Student
status: active
last_updated: 2026-09-18
---

# Backend Module Specs — Student

| # | Module | File | Status | Invariants | Blocked by |
|---|---|---|---|---|:---|
| 1 | SRS Flashcards | `01-srs-flashcards.md` | ✅ `accepted` | 12 | vocabulary source for production seed; streak timezone |
| 2 | Foundation and Grammar | [02-foundation-grammar.md](02-foundation-grammar.md) | 🔶 proposed → owner-approved to code 2026-09-16 (D1–D5) | 12 proposed | G-practice deferred; media none |
| 4 | Progress Analytics (S-ANL-1..3) | [04-progress-analytics.md](04-progress-analytics.md) | ✅ implemented 2026-09-16 | 7 | none for S-ANL-1/2; S-ANL-3 separate |
| 3 | Attempt Lifecycle (S-ASGN-2..7) | [03-attempt-lifecycle.md](03-attempt-lifecycle.md) | 🔶 proposed → owner-approved to code 2026-09-12 | 12 | none — AI re-open recorded in §16-Q0 |
| 3 | Word bank (S-SRS-6/7) | `02-word-bank.md` | ✅ `implemented 2026-09-12` | 8 | none for this slice — full click-to-save surface arrives with the content screens (§16) |
| 4 | Placement (Task C) | [04-placement.md](04-placement.md) | 🔶 proposed → owner-directed to code 2026-09-13 | 8 | paper depth capped by the question bank (F13/DOC-011 adjacency in §16-Q3) |
| 5 | Leaderboard + Attempt Badges | [05-gamification-analytics.md](05-gamification-analytics.md) | ✅ implemented 2026-09-16 | 8 | none for bounded slice |
| 6 | Writing + Lego + Workplace | [06-writing-lego-workplace.md](06-writing-lego-workplace.md) | ✅ implemented 2026-09-18 | 10 | none for bounded slice |

Numbering note: the Foundation/Grammar proposal holds `02` by publication order (2026-09-10);
the word bank kept its own `02-` file name to avoid renaming a linked doc, so student
module numbering is by row, not filename.

The remaining self-study, drill, gamification and analytics capabilities are accepted product
scope under ADR-016 but do not yet have transport contracts. Writing, Lego and Workplace left
that list on 2026-09-18 under module 6. Add a module here before coding any other capability.
Placement left that list on 2026-09-13 (module 4). Platform mock exams (F13) stay contract-less —
`/student/exams` is served from `mock_test` assignments + the attempt lifecycle, not from F13 papers.

Numbering note: row/file `03` is reserved for the attempt-lifecycle module (open PR #73);
this slice takes `04` so the two never collide whatever merges first.


## Source audits

- [Foundation and Grammar source audit](foundation-grammar-source-audit.md) — audited 2026-09-10; content adoption and media remain blocked.

- [04-mistakes](04-mistakes.md) — S-MSTK, implemented; Task B owner approval 2026-09-13; 8 invariants.
- [05-learning-path](05-learning-path.md) — ✅ implemented vocabulary-first catalog and owned progress; 12 invariants. **§17 addendum 2026-09-19**: teacher-authored paths (ADR-017) join this same catalog — additive, no invariant or response shape changed. The authoring/moderation specs live outside this set: [teacher 07](../teacher/07-learning-catalog.md) + [admin 09](../09-learning-catalog-moderation.md).
