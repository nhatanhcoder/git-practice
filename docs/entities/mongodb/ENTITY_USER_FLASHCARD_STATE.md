# ENTITY_USER_FLASHCARD_STATE

> **Status**: ✅ Full spec  
> **DB**: MongoDB  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Schema

```typescript
{
  _id: ObjectId,
  userId: string,          // PG User uuid
  flashcardId: ObjectId,   // → Flashcard._id
  
  // SM-2 Algorithm fields
  easeFactor: number,      // Default 2.5; range [1.3, ∞)
  repetitionsCount: number, // Successful reviews in a row; default 0
  intervalDays: number,    // Days until next review; default 1
  nextReviewDate: Date,    // Scheduled next review date
  lastReviewedAt?: Date,   // Last time student reviewed this card
  
  // Personal save flag
  isSavedByUser: boolean,  // true if student manually added to personal list (S-SRS-7)
  
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

- `{ userId: 1, flashcardId: 1 }` — unique compound index
- `{ userId: 1, nextReviewDate: 1 }` — for fetching due cards efficiently

## Business Rules

- Created on first interaction (review or manual save)
- SM-2 update on each rating:
  - **Again**: `repetitionsCount = 0`, `intervalDays = 1`, `easeFactor -= 0.2`
  - **Hard**: `intervalDays × 1.2`, `easeFactor -= 0.15`
  - **Good**: `intervalDays × easeFactor`, `easeFactor` unchanged
  - **Easy**: `intervalDays × easeFactor × 1.3`, `easeFactor += 0.15`
- `easeFactor` clamped to minimum 1.3
- Due cards = `nextReviewDate <= now` for the user
- `isSavedByUser = true` marks cards added via S-SRS-7 (personal study list)

> 📄 Full SM-2 formula: docs/architecture/SRS_ALGORITHM.md
