# 🧠 SRS_ALGORITHM.md — Spaced Repetition System (SM-2)

> **Algorithm**: SuperMemo SM-2  
> **Implementation**: NestJS FlashcardsModule + MongoDB

---

## 1. Tổng quan SM-2

SM-2 lên lịch ôn tập dựa trên **chất lượng recall** của người học.  
Càng nhớ tốt → interval càng dài → học ít hơn nhưng nhớ lâu hơn.

```
Rating  Meaning     Action
──────────────────────────────
  0     Again       Quên hoàn toàn — ôn lại ngay hôm nay
  1     Again       Nhớ lờ mờ — ôn lại hôm nay
  2     Hard        Nhớ nhưng khó — interval ngắn
  3     Good        Nhớ đúng với chút do dự
  4     Easy        Nhớ dễ dàng
  5     Easy!       Nhớ rất dễ, nhanh
```

---

## 2. Algorithm Formula

```typescript
// lib/srs/sm2.ts
export interface SM2Input {
  rating: 0 | 1 | 2 | 3 | 4 | 5;   // Chất lượng recall
  repetitions: number;               // Số lần đã ôn liên tiếp thành công
  interval: number;                  // Interval hiện tại (ngày)
  easeFactor: number;               // EF: độ dễ nhớ (default 2.5)
}

export interface SM2Output {
  newRepetitions: number;
  newInterval: number;
  newEaseFactor: number;
  nextReviewDate: Date;
}

export function calculateSM2(input: SM2Input): SM2Output {
  const { rating, repetitions, interval, easeFactor } = input;

  let newRepetitions: number;
  let newInterval: number;
  let newEaseFactor: number;

  if (rating < 3) {
    // Failed: reset
    newRepetitions = 0;
    newInterval = 1;
    newEaseFactor = easeFactor;  // EF không giảm khi fail
  } else {
    // Success
    newRepetitions = repetitions + 1;

    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }

    // Update EF
    newEaseFactor = easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
    newEaseFactor = Math.max(1.3, newEaseFactor);  // EF không xuống dưới 1.3
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return { newRepetitions, newInterval, newEaseFactor, nextReviewDate };
}
```

---

## 3. EF Calculation Examples

| Rating | EF trước | EF sau | Thay đổi |
|--------|---------|--------|---------|
| 0 (Again) | 2.5 | 2.5 | ±0 (không phạt EF) |
| 2 (Hard) | 2.5 | 2.18 | -0.32 |
| 3 (Good) | 2.5 | 2.36 | -0.14 |
| 4 (Easy) | 2.5 | 2.5 | ±0 |
| 5 (Easy!) | 2.5 | 2.6 | +0.1 |

---

## 4. Interval Progression Example

Giả sử luôn rating = 3 (Good), EF = 2.5:

```
Rep 1: interval = 1 day   → review ngày mai
Rep 2: interval = 6 days  → review 6 ngày sau
Rep 3: interval = 15 days → round(6 × 2.5)
Rep 4: interval = 38 days → round(15 × 2.5)
Rep 5: interval = 95 days → round(38 × 2.5)
```

---

## 5. MongoDB Schema

```typescript
// database/mongoose/schemas/user-flashcard-state.schema.ts
@Schema({ collection: 'user_flashcard_states', timestamps: true })
export class UserFlashcardState {
  @Prop({ required: true, index: true })
  userId: string;  // UUID từ PostgreSQL

  @Prop({ type: Types.ObjectId, ref: 'Flashcard', required: true })
  flashcardId: Types.ObjectId;

  @Prop({ default: 0 })
  repetitions: number;

  @Prop({ default: 1 })
  interval: number;  // days

  @Prop({ default: 2.5 })
  easeFactor: number;

  @Prop({ default: () => new Date() })
  nextReviewDate: Date;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ default: 0 })
  correctReviews: number;
}

// Compound index: một user chỉ có một state per flashcard
UserFlashcardStateSchema.index({ userId: 1, flashcardId: 1 }, { unique: true });

// Index cho review queue query
UserFlashcardStateSchema.index({ userId: 1, nextReviewDate: 1 });
```

---

## 6. Review Queue API

```typescript
// flashcards.service.ts
async getReviewQueue(userId: string, limit = 20): Promise<Flashcard[]> {
  // Lấy cards đến hạn ôn hôm nay (nextReviewDate <= now)
  const states = await this.userFlashcardStateModel
    .find({
      userId,
      nextReviewDate: { $lte: new Date() }
    })
    .sort({ nextReviewDate: 1 })  // Ưu tiên quá hạn lâu nhất
    .limit(limit)
    .lean();

  const flashcardIds = states.map(s => s.flashcardId);
  const flashcards = await this.flashcardModel.find({
    _id: { $in: flashcardIds }
  });

  // Attach state vào flashcard để FE biết lịch sử
  return flashcards.map(fc => ({
    ...fc.toJSON(),
    state: states.find(s => s.flashcardId.equals(fc._id))
  }));
}
```

---

## 7. Submit Review API

```typescript
// POST /flashcards/:flashcardId/review
// Body: { rating: 0|1|2|3|4|5 }

async submitReview(
  flashcardId: string,
  userId: string,
  rating: 0|1|2|3|4|5
): Promise<SM2Output> {

  // Lấy state hiện tại
  const state = await this.userFlashcardStateModel.findOne({ userId, flashcardId });
  if (!state) throw new BusinessException('FLASHCARD_NOT_IN_REVIEW', '...', 400);

  // Tính SM-2
  const result = calculateSM2({
    rating,
    repetitions: state.repetitions,
    interval: state.interval,
    easeFactor: state.easeFactor,
  });

  // Cập nhật state
  await this.userFlashcardStateModel.updateOne(
    { userId, flashcardId },
    {
      $set: {
        repetitions: result.newRepetitions,
        interval: result.newInterval,
        easeFactor: result.newEaseFactor,
        nextReviewDate: result.nextReviewDate,
      },
      $inc: {
        totalReviews: 1,
        correctReviews: rating >= 3 ? 1 : 0,
      }
    }
  );

  return result;
}
```

---

## 8. SRS Stats Dashboard

```typescript
// GET /flashcards/stats
async getStats(userId: string) {
  const states = await this.userFlashcardStateModel.find({ userId });
  const now = new Date();

  return {
    totalCards: states.length,
    dueToday: states.filter(s => s.nextReviewDate <= now).length,
    dueTomorrow: states.filter(s => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return s.nextReviewDate > now && s.nextReviewDate <= tomorrow;
    }).length,
    mature: states.filter(s => s.interval >= 21).length,  // 3+ weeks
    accuracy: states.length > 0
      ? Math.round(states.reduce((sum, s) => sum + s.correctReviews / (s.totalReviews || 1), 0) / states.length * 100)
      : 0,
    streak: 0  // TODO: Implement study streak
  };
}
```
