## [2026-09-08] — A10: vocabulary source audit (READ-ONLY + docs) — opencode — branch `docs/a10-vocab-audit`

**Context**: TASK A10 from `docs/prompts/student-integration-checklist.md`. Type: READ-ONLY
first, DOCS after owner approval. The plan was presented with the audit findings and approved
in the same session; no data was copied, no DB written, no schema changed.

**What was audited**:
- External corpus `D:\PersonalProject\Chinese UI test\ui-claude\backend\data\content` (11 JSON files).
- `apps/api/src/mongodb/schemas/flashcard.schema.ts` + `user-flashcard-state.schema.ts`.
- `docs/entities/mongodb/ENTITY_FLASHCARD.md` + `ENTITY_USER_FLASHCARD_STATE.md`.

**Findings** (full detail in `docs/content/VOCAB_SOURCE_AUDIT.md`):
1. **No standalone vocabulary file exists.** Per A10 rule 1, grammar/exam/lego sentence data
   was not counted as vocabulary. The only near-candidates were measured:
   `writing.json` (587 characters), its embedded `words[]` (1,228 words — best Flashcard
   shape fit, but no per-word level/id), `workplace.json` (34 contextual words), and
   `levels.json` `newWords` totals (10,110 — decorative numbers with no backing list).
2. **Per-level recount (writing.json)**: 500/27/17/12/10/6/5/5/5 = 587; 587 unique; zero
   same-level and zero cross-level duplicates; zero missing fields; 1,228 word entries.
3. **Three data defects**: `喜欢` (2 chars) misfiled in a character list at level 1;
   `strokes.json` covers only 59/586 characters (10%); level 1 = 500 characters matches the
   HSK 3.0 word count — the file was almost certainly built from a word list and enriched
   with character-only fields.
4. **Mapping** to `Flashcard`: 4 required fields all mappable (`level→hskLevel`,
   `char/words[].hanzi→hanzi`, `pinyin→pinyin`, `vi→meaning`); example/audio/tags have no
   source. Direct character mapping silently drops 8 populated fields (hanViet, radical,
   radicalName, strokeCount, strokes[], components[], words[], tip) — recorded as a loss
   warning rather than forcing them into the Flashcard schema (they belong to F11
   character-writing, which already has its own screens and data).
5. **Review-state protection** (TEST A10 #8): `UserFlashcardState` is keyed by
   `(userId, flashcardId)` with unique index; any future importer must upsert by
   `{hskLevel, hanzi}` and never delete-recreate cards with state.
6. **Import stays BLOCKED** on: unknown provenance/license, owner's words-vs-characters
   decision, source not repository-owned.

**Method note**: counts were computed twice (PowerShell spot-check + Node script) and agree;
the Node pass is authoritative — PowerShell mangled multi-byte JSON keys and misread file
structure on first pass. Audit scripts were throwaway (OS temp dir, not committed).

**Done (docs)**:
- `docs/content/VOCAB_SOURCE_AUDIT.md` + `docs/content/_INDEX.md` (new doc set).
- `KNOWN_ISSUES.md` — `DOC-011` gained the A10 audit update block (no new ID; DOC-011
  already owns "corpus external/unverified"). Note: PR #49 branch also appends to
  `KNOWN_ISSUES.md` (API-015/API-016) — different entries, different lines; reconcile by
  hand per `DOC-014` if both merge closely.
- `ai/PROGRESS.md` — A10 claim → result entry.

**Verification**: `node scripts/check-docs.mjs` 8/8 (run before commit). Read-only guarantees
re-checked: `git status` shows only docs/ + ai/ changes, no data copied into the repo.

**Next**: A11 (importer) must NOT start until the owner resolves the three unlock conditions
in the audit §6.
