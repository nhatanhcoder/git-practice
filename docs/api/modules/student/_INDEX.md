---
title: Backend Module Specs — Student
status: active
last_updated: 2026-09-10
---

# Backend Module Specs — Student

| # | Module | File | Status | Invariants | Blocked by |
|---|---|---|---|---|:---|
| 1 | SRS Flashcards | `01-srs-flashcards.md` | ✅ `accepted` | 12 | vocabulary source for production seed; streak timezone |
| 2 | Foundation and Grammar | [02-foundation-grammar.md](02-foundation-grammar.md) | 🔶 proposed / NOT IMPLEMENTED | 12 proposed | content, storage, transport, media and completion decisions |
| 3 | Attempt Lifecycle (S-ASGN-2..7) | [03-attempt-lifecycle.md](03-attempt-lifecycle.md) | 🔶 proposed → owner-approved to code 2026-09-12 | 11 | none — AI re-open recorded in §16-Q0 |
| 3 | Word bank (S-SRS-6/7) | `02-word-bank.md` | ✅ `implemented 2026-09-12` | 8 | none for this slice — full click-to-save surface arrives with the content screens (§16) |

Numbering note: the Foundation/Grammar proposal holds `02` by publication order (2026-09-10);
the word bank kept its own `02-` file name to avoid renaming a linked doc, so student
module numbering is by row, not filename.

The remaining self-study, drill, gamification and analytics capabilities are accepted product
scope under ADR-016 but do not yet have transport contracts. Add modules here before coding them.


## Source audits

- [Foundation and Grammar source audit](foundation-grammar-source-audit.md) — audited 2026-09-10; content adoption and media remain blocked.
