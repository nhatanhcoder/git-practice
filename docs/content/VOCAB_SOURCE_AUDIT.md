---
status: active
owner: Nhật
last_updated: 2026-09-08
task: A10
---

# Vocabulary Source Audit — Hán Lộ corpus

> READ-ONLY audit (TASK A10, `docs/prompts/student-integration-checklist.md`). No data was
> copied, no DB was written, no schema was changed while producing this document.
> **Import stays BLOCKED** until the conditions in §6 are met.

## 1. Where the audit looked

- External corpus: `D:\PersonalProject\Chinese UI test\ui-claude\backend\data\content` — 11 files:
  `badges, exams, foundation, grammar, leaderboard, learning-path, lego, levels, strokes,
  workplace, writing`. **There is no file named vocabulary or flashcards.**
- Repo schemas: `apps/api/src/mongodb/schemas/flashcard.schema.ts`,
  `user-flashcard-state.schema.ts`.
- Repo docs: `docs/entities/mongodb/ENTITY_FLASHCARD.md`, `ENTITY_USER_FLASHCARD_STATE.md`.

## 2. Does real vocabulary exist?

**No standalone vocabulary list exists.** Per A10 rule 1 ("do not infer vocabulary from
grammar.json"), the nearest candidates were measured, not assumed:

| Source | What it actually holds | Fit as Flashcard seed |
|---|---|---|
| `writing.json` | 587 **characters** (586 single-char, 1 two-char `喜欢` misfiled at level 1), each with pinyin/vi/hanViet/radical/strokes/components/words[]/tip | Weak — this is the *character-writing* dataset (F11), not vocabulary |
| `writing.json → words[]` | 1,228 embedded compound words `{hanzi, pinyin, vi}` | Best shape match, but **no per-word hskLevel and no id** — level can only be inherited from the parent character entry |
| `workplace.json` | 34 words across 6 scenarios (HSK 4–6) | Contextual, tiny; not a general vocabulary source |
| `levels.json` | Declares `newWords` per level (500/772/973/1000/1071/1140/1800/1900/1936 = 10,110 total) | **Decoration only** — no word list corresponds to these numbers |
| `grammar.json`, `lego.json`, `exams.json` | Sentence/example data | Not vocabulary (A10 rule 1 explicitly) |

## 3. Per-level counts (self-recounted, writing.json)

| HSK | entries | notes |
|---|---:|---|
| 1 | 500 | includes `喜欢` — the only multi-char entry in the file |
| 2 | 27 | |
| 3 | 17 | |
| 4 | 12 | |
| 5 | 10 | |
| 6 | 6 | |
| 7 | 5 | |
| 8 | 5 | |
| 9 | 5 | |
| **total** | **587** | 587/587 unique; no same-level duplicates; no cross-level duplicates |

Field completeness across all 587 entries: pinyin 0 missing, vi 0 missing, hanViet 0 missing,
tip 0 missing, words 0 missing, radical 0 missing, strokeCount 0 missing, strokes[] 0 missing,
components[] 0 missing. 1,228 word entries inside `words[]`.

**Data defects found (3):**

1. `喜欢` (2 chars) sits in a character list at level 1 — misfiled as a character.
2. `strokes.json` covers only **59/586** single-character entries (10%). Stroke animation for
   the other 90% has no source.
3. HSK 1 = 500 *characters* matches no real character-distribution of any HSK standard; it
   matches the HSK 3.0 **word** count for level 1 (500 words). The file was almost certainly
   built from a word list, then enriched with character fields (radical, strokes) that only
   make sense for single characters — which is also why levels 2–9 collapse to a handful of
   entries each.

## 4. Mapping to the existing schema (no field/schema added)

`Flashcard` requires: `hskLevel`, `hanzi`, `pinyin`, `meaning`. Mapping from the corpus:

| Flashcard field | Corpus source | Status |
|---|---|---|
| `hskLevel` | `writing.json → level` (or parent entry's level for `words[]`) | OK |
| `hanzi` | `char` (or `words[].hanzi`) | OK |
| `pinyin` | `pinyin` | OK |
| `meaning` | `vi` | OK |
| `exampleSentence` / `examplePinyin` / `exampleMeaning` | none in corpus | stays empty |
| `audioUrl` | none anywhere in the corpus | stays empty (CR-3 also unresolved) |
| `tags` | none | stays empty |

**Silent-loss warning**: mapping `writing.json` directly drops 8 populated fields —
`hanViet`, `radical`, `radicalName`, `strokeCount`, `strokes[]`, `components[]`, `words[]`,
`tip`. A10 rule 4 requires the mapping not to silently lose information: if characters are
imported, these fields either go somewhere documented or the loss is recorded per-import as
accepted. They do **not** fit the current `Flashcard` schema, which is fine — the character
dataset serves the character-writing feature (F11) and should not be forced into Flashcards.

## 5. Review-state protection (TEST A10 #8)

`UserFlashcardState` references `flashcardId` (ObjectId) with a unique index on
`(userId, flashcardId)` and indexes on `nextReviewDate`. Consequences for any future importer:

- **Never delete-and-recreate** cards that already have state — that resets every learner's
  SRS schedule (easeFactor, intervalDays, nextReviewDate, review counters).
- Upsert keyed by the existing index `{hskLevel, hanzi}` (`flashcard.schema.ts:28`):
  existing document → update fields in place (stable `_id`); missing → insert.
- Re-running the same input must be a no-op change set (idempotent).

## 6. Import unlock conditions — ✅ ALL RESOLVED (owner, 2026-09-08)

1. **Provenance/license** — ✅ owner confirmed the Hán Lộ corpus is theirs and permitted for
   this product (session 2026-09-08, recorded in
   `ai/context/sessions/2026-09-08-opencode-a11-vocab-importer.md`).
2. **Owner decision: words vs characters** — ✅ **words**: the 1,228 embedded `words[]`
   entries are the Flashcard seed. Characters stay with the character-writing feature (F11).
3. **Source is now repository-owned** — ✅ `writing.json` copied verbatim (byte-identical,
   388,024 bytes) to `apps/api/content/writing.json`. This copy is the import source of
   record; deployment no longer depends on `D:\` on a developer machine for the vocabulary
   slice. The other 10 corpus files remain external (`DOC-011`, A12+ scope).

### Import decisions carried into A11

- **Dedup key**: `hanzi`. 1,228 candidates → **1,119 unique cards**. 80 extra exact
  duplicates (15 cross-level), 29 hanzi with conflicting pinyin/meaning — mostly the same
  word listed under each constituent character with formatting variance (e.g. `你好` as
  `nǐhǎo` under 好 and `nǐ hǎo` under 你).
- **Conflict policy**: deterministic winner = lowest level, then source order; all losers are
  reported, never silently dropped. Winner level = the lowest level the hanzi appears at
  (per-level outcome: 922/50/40/32/25/16/12/11/11).
- **Field mapping**: `words[].hanzi → hanzi`, `pinyin → pinyin`, `vi → meaning`, level
  inherited from the parent character entry; `tags: ["hanlo"]` provenance tag; no example/
  audio fields (no source). Upsert by `hanzi` alone (any level) so a later level change
  updates the existing card instead of creating a cross-level duplicate.
- **Review state**: importer never reads or writes `user_flashcard_states`; upsert preserves
  `_id`. TASK A11 enforces dry-run default + explicit `--apply`.

## 7. Audit trail

- Audit scripts: throwaway Node scripts under the OS temp dir (not committed, not in the repo).
- All counts in §3 were computed twice (once via PowerShell spot-check, once via Node script)
  and agree; the Node pass is authoritative because PowerShell mangled multi-byte keys.
- No repo file outside `docs/content/`, `ai/`, and `KNOWN_ISSUES.md` was touched by this task.
