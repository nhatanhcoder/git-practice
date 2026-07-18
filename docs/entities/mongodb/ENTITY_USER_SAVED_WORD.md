# ENTITY_USER_SAVED_WORD

> **Status**: ✅ Full spec  
> **DB**: MongoDB  
> **New entity** — supports S-SRS-6 (click-to-save word)  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Schema

```typescript
{
  _id: ObjectId,
  userId: string,          // PG User uuid
  hanzi: string,           // The saved Chinese word/character
  pinyin: string,          // Romanization
  meaning: string,         // Vietnamese meaning (looked up at save time)
  sourceType: 'lesson' | 'passage' | 'flashcard_browser' | 'other',
  sourceId?: string,       // ID of the source (lessonId / assignmentId)
  note?: string,           // Optional personal note by student
  savedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

- `{ userId: 1 }` — for fetching user's word bank
- `{ userId: 1, hanzi: 1 }` — unique compound (prevent duplicate saves)

## Business Rules

- Created when student clicks on a word anywhere in the app (S-SRS-6):
  - Lesson content
  - Reading passage in Assignment
  - Flashcard browser
- `hanzi` + `pinyin` + `meaning` copied at save time (not dynamically fetched)
- Duplicate `(userId, hanzi)` → upsert (update savedAt, note)
- Student can delete from kho từ (S-SRS-7)
- Words in kho từ can be started as a custom SRS review session (S-SRS-7)
- Does **not** create a `UserFlashcardState` automatically — only when student explicitly starts review from kho từ
