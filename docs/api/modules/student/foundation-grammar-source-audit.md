---
status: active
last_updated: 2026-09-10
---

# Foundation and Grammar — source audit

Read-only audit for S-SELF-2/3/9, against application commit `99a511c`.
The owner approved preparing this design, not publishing content or changing a database.
No corpus was copied, no learner files were read, and no database was accessed.

## Sources and reproducibility

External root: `D:/PersonalProject/Chinese UI test/ui-claude`.
Only content JSON, README, remaining-work notes and an asset filename inventory were inspected.
The import must eventually use an approved repository-owned source, never this absolute path.

| File under external root | Bytes | SHA-256 |
|---|---:|---|
| `backend/data/content/foundation.json` | 51965 | `97541d9f10a404d621432f2f0b2205ff68f621422c5230fe2d911b5e47351bc0` |
| `backend/data/content/grammar.json` | 42370 | `5f4b886c095ce47e3e970469bfdc89f7813ed905928bc0267712f8542cc0d19f` |

Counts were independently reproduced with Node JSON.parse and PowerShell ConvertFrom-Json.
Reproduce the counts and hashes with PowerShell (read-only):

```powershell
$sourceRoot = 'D:/PersonalProject/Chinese UI test/ui-claude/backend/data/content'
Get-FileHash -Algorithm SHA256 -LiteralPath "$sourceRoot/foundation.json", "$sourceRoot/grammar.json"
$grammarSource = Get-Content -Raw -LiteralPath "$sourceRoot/grammar.json" | ConvertFrom-Json
$grammarSource | Group-Object level | Select-Object Name,Count
$foundationSource = Get-Content -Raw -LiteralPath "$sourceRoot/foundation.json" | ConvertFrom-Json
$foundationSource.PSObject.Properties | ForEach-Object {
  [pscustomobject]@{ Group=$_.Name; Count=@($_.Value).Count }
}
```

## Inventory

| Foundation group | Records | Observed identity | Available material |
|---|---:|---|---|
| initials | 21 | `id` | sound, IPA, Hanzi/Pinyin/Vietnamese example, group |
| finals | 36 | `id` | same fields as initials |
| tones | 4 | numeric `id` 1–4 | contour, explanation, example, drawing coordinates |
| sandhi | 6 | `id` | rule, before/after Pinyin, example and translation |
| radicals | 214 | `no` 1–214, contiguous | character, stroke count, Pinyin, meaning, Han-Viet |
| listening | 6 | `id` | text transcript, translation, level and descriptive metadata |
| speaking | 6 | `id` | prompt, Pinyin, translation, focus, level |
| pdfs | 4 | `id` | descriptive cards only; no file URL |

297 Foundation records altogether; this is not a claim of 297 playable/graded lessons.

| Grammar HSK | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Records | 9 | 9 | 10 | 9 | 7 | 9 | 8 | 8 | 7 | **76** |

Grammar has 8 categories: Trật tự câu, Trợ từ, Phó từ, Câu đặc biệt, So sánh,
Liên từ, Bổ ngữ, Văn viết. All 76 ids are unique and levels are integers 1–9.
No null/empty existing fields or Unicode replacement characters were found in either JSON.
All Grammar serialized records are NFC-stable. Concatenated Grammar tokens match the example
Hanzi after removing punctuation and whitespace in all 76 records. These are structural checks,
not pedagogical approval, verified HSK placement or a guarantee of valid generated exercises.
Foundation keys are unique within each group, not a proposed global database key.

## Duplicates requiring editorial review

Repeated name is not proof of a redundant lesson; keep ids until the content owner decides.

| Repeated name | Source ids |
|---|---|
| 虽然…但是… | g018, g052 |
| 不但…而且… | g020, g057 |
| Bổ ngữ khả năng | g023, g051 |
| Bổ ngữ xu hướng kép | g026, g056 |
| 与其…不如… | g028, g060 |
| 以…为… | g035, g058 |
| 鉴于 | g037, g067 |

One exact formula repeats (g023/g051). Four exact Hanzi examples repeat:
g018/g052, g019/g053, g020/g057 and g028/g060. No automatic merging or deletion is approved.

## Media and provenance

No mp3/wav/ogg/m4a/webm/pdf files or LICENSE/COPYING/NOTICE files were found by filename
walk beneath the external root, excluding node_modules, .git, dist, build, .next and learners.
This does not establish ownership or exclude assets elsewhere, remote media, other formats,
or licenses described in other prose. No source publisher, redistribution grant or pedagogical
sign-off has been established for this import: **BLOCKED — DOC-011**.

The Foundation JSON has no audio/file URL field. Its listening `seconds`, `speed`, `accent`
and PDF `pages`/`size` are unverified descriptors, not measured media properties.
The external remaining-work notes describe Web Speech TTS and simulated speaking scores.
TTS is not a recording by a native speaker; no speaking scorer has been accepted here.
Do not ship a play/download success state without an available resource.

## Mapping evidence — source fields, not an approved DTO

| Source | Current FE shape | Design consequence |
|---|---|---|
| Grammar `id` (g001…) | mock `id` (g1…) | No inferred identity mapping; do not migrate demo mastery by index/name |
| Grammar `name`, `note` | `title`, `notes` | Explicit adapter mapping needed after transport approval |
| Grammar `hanzi`, `pinyin`, `vi` | headline + `examples[]` | One source example; do not invent extra examples |
| Grammar `category` | six-category FE union | Source has eight categories; retain source taxonomy pending editorial decision |
| Grammar `key`, `tokens`, `frequency` | absent from current GrammarPoint | Preserve them in content design; do not silently discard |
| Grammar has no mastery | fixture `mastery` + local store | Private progress must be separate from published content |
| Sounds `sound`, `hanzi`, `pinyin`, `vi`, `group` | `pinyin`, `exampleHanzi`, `examplePinyin`, `exampleVi`, `tip` | Source `pinyin` is the example pronunciation; `sound` is the sound label; group is not a tip |
| Radicals `no` | existing radical identity | Preserve canonical number; presentation adapts after contract approval |
| Tone `path` | drawing geometry | Treat as validated numeric coordinates, never arbitrary markup |

## Conflicts recorded, not silently resolved

- DEBT-003 / PROGRESS report Grammar 60/51 and thinner HSK 7–9 counts. This audited snapshot
  has 76 and the distribution above. Keep the historical report; update claims only for this hash.
- External remaining-work notes claim Foundation still has learner flags and Grammar has
  4/4/3 points at HSK 7–9. Those claims disagree with the audited JSON: no such progress fields
  were observed, and the counts are 8/8/7. Prototype notes are not production contracts.
- Current FE data differs in ids, taxonomy, examples and embedded mastery from the external
  source. Neither is automatically authoritative pedagogical content.
- CR-3 still leaves media storage undecided. This audit chooses no provider.

## Exit and remaining gates

Audit complete; source adoption, editorial deduplication, media sourcing and content rights
remain blocked. The module design in this task will collect the decision checklist.
Existing Foundation/Grammar production capabilities remain **NOT IMPLEMENTED**.
