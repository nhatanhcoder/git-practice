# 2026-09-02 — Second pass on the Teacher UI bugs (C1, C3, question DTO) — Claude Code

**Context**: after PR #22 merged, an independent review of `main@74a1e76` found that 3 of the 7
fixes were only partial. The review was right on all three, and one of them was worse than
reported. This session closed them.

**Correcting my own record first**: `WEB-006` and `PROGRESS.md` claimed all seven were closed.
They were not. The over-claim was caught by someone else's review, not by my own verification —
that is the part worth remembering.

**Why all three slipped, one root cause**: each fix was applied to the path named in the report,
not to the rule behind it. C1 was fixed for the class-change path only; C3's conversion covered
the files I had open; B2 fixed the Writing field but not the shape the entity actually specifies.
None of the three checks asked "where else does this rule have to hold?" — and for C1, nobody
checked the fixtures at all.

**Done**:
- **C1 (P1)** — `questionIdsForClass()` is now the single eligibility rule, applied at
  `openEdit`, on class change, in the selected-count, and at the write in `submitDraft`.
  Previously `openEdit` trusted stored ids, `step2Valid` counted ids the picker had hidden, and
  the draft was written raw. Fixture `a4` was the reported symptom: "1 đã chọn" with no checkbox
  ticked and Save enabled.
  **The fixtures were also wrong, which the report only partly caught** — 4 of 5, not 1:
  a2 held `q3` (HSK 4) in an HSK-5 class; a3 held `q6` (HSK 2) in an HSK-3 class; a5 held `q9`
  (HSK 5) in an HSK-4 class; a4 held `q11` (HSK 4) in an HSK-5 class **and** declared
  `hskLevel: 4` for a class that is HSK 5. All five now agree with their class.
- **C3 (P2)** — the income drawer and the lessons modal had been missed by the first overlay
  pass. Both now go through `Overlay` / `useOverlay`.
- **B2/DTO (P2)** — options became `{ id, text }` per `ENTITY_QUESTION`; `correctAnswer`
  references those ids and is an **array** for multi-answer. `q5` had stored its two answers as
  the single string `"A + B"`, which nothing could match — so the preview marked neither option
  correct. Added `toQuestionDto()` mapping the flat editor ViewModel onto the entity's nested
  `content` (`transcript` / `passage` / `prompt` + `rubric`). `expectedResultOf()` now resolves
  ids back to option text, since a raw "B" tells a teacher nothing.
  ⛔ `content.audioUrl` is deliberately never set — audio upload is unimplemented and the storage
  provider is undecided (`CR-3`).
- **Test infrastructure** — `teacher-rules` moved `.ts` → `.js` with JSDoc, following the repo's
  own precedent (`src/lib/user-status.js`). The test had been hand-stripping TypeScript with
  regexes; that broke the moment a signature used `string[]`. It now imports the module directly.
  3 new C1 regression cases (14 in the file, 34 across the suite).

**Verification** (production build):
- `pnpm --filter web build` green · 34/34 tests · check-docs 8/8 · 9/9 Teacher routes HTTP 200
- C1: `a4` opened for edit now shows "1 đã chọn" **with 1 checkbox actually ticked** out of 2
  HSK-5 questions — count and checkboxes agree
- C3: income drawer — focus moves inside, Tab stays trapped, Escape closes, and with a **real**
  mouse click + real Escape focus returns to the opening row. (A synthetic `.focus()`/`.click()`
  test reported `BODY`; that was a harness artifact, confirmed by repeating with real input.)
  Lessons modal — focus moves inside and Tab is trapped.
- B2: list shows `B. 一双鞋` for MCQ and plain text for short-answer; the multi-answer preview
  marks **both** B and C correct, which was impossible with the old concatenated string
- Desktop and 375px

**Blocker / needs follow-up**:
- Unchanged from the first pass: **Q-SES-3 still open** (requiring `actualEnd` picks option (a)
  on the FE while the backend has not decided); screens remain `🔶` — fully mocked, no API.
- Batch D (Playwright) still not started; it needs its own approval.

**Next steps**:
- Review the PR. If Playwright is wanted, approve it separately.
