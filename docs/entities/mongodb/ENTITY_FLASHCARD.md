# ENTITY_FLASHCARD

> **Status**: ✅ Full spec  
> **DB**: MongoDB  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Schema

```typescript
{
  _id: ObjectId,
  hskLevel: 1 | 2 | 3 | 4 | 5 | 6,
  hanzi: string,           // Chinese character(s), e.g. "学习"
  pinyin: string,          // Romanization, e.g. "xuéxí"
  meaning: string,         // Vietnamese translation, e.g. "học tập"
  exampleSentence?: string,   // Example in Chinese
  examplePinyin?: string,     // Pinyin for example sentence
  exampleMeaning?: string,    // Vietnamese translation of example
  audioUrl?: string,       // Pronunciation audio (Supabase Storage)
  tags?: string[],         // Optional: ['verb', 'hsk2-core', ...]
  createdAt: Date,
  updatedAt: Date
}
```

## Business Rules

- Seeded by Admin / system — students do not create flashcards directly
- `hskLevel` used to filter decks (S-SRS-1)
- Students can click any `hanzi` in lesson/passage to save it as `UserSavedWord` (S-SRS-6)
- `UserFlashcardState` tracks per-user SRS progress for each flashcard
- `audioUrl` optional — system still functional without audio
