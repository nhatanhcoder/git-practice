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

  // Aggregate counters required by S-SRS-5 retention stats
  totalReviews: number,    // All submitted ratings; default 0
  correctReviews: number,  // Ratings >= 3; default 0
  
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
- Production scheduling uses the single SM-2 formula in `FLOW_SRS_REVIEW.md`
- UI ratings map to quality: **Again=0, Hard=3, Good=4, Easy=5** (ADR-016)
- Quality below 3 resets `repetitionsCount = 0` and `intervalDays = 1`
- Every rating recalculates `easeFactor` with the SM-2 formula; minimum 1.3
- Successful intervals are 1 day, then 6 days, then `round(previousInterval × easeFactor)`
- Due cards = `nextReviewDate <= now` for the user
- `isSavedByUser = true` marks cards added via S-SRS-7 (personal study list)
- `correctReviews <= totalReviews`; retention is `correctReviews / totalReviews`

> **Conflict recorded 2026-09-05:** `FLOW_SRS_REVIEW.md` uses the older field names
> `repetitions` / `interval`. This entity is authoritative, so production code uses
> `repetitionsCount` / `intervalDays`. The flow must be corrected in a dedicated docs pass.

> 📄 Full SM-2 formula: `docs/flows/FLOW_SRS_REVIEW.md`
