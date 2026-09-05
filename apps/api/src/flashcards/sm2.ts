import type { PublicSrsRating } from './dto/review-flashcard.dto';

export type Sm2State = {
  rating: PublicSrsRating;
  repetitionsCount: number;
  intervalDays: number;
  easeFactor: number;
};

export type Sm2Result = {
  repetitionsCount: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: Date;
};

const DAY_MS = 86_400_000;

/** Canonical SM-2 from FLOW_SRS_REVIEW.md, using entity-spec field names. */
export function calculateSm2(input: Sm2State, now = new Date()): Sm2Result {
  let repetitionsCount: number;
  let intervalDays: number;

  if (input.rating < 3) {
    repetitionsCount = 0;
    intervalDays = 1;
  } else {
    repetitionsCount = input.repetitionsCount + 1;
    if (input.repetitionsCount === 0) intervalDays = 1;
    else if (input.repetitionsCount === 1) intervalDays = 6;
    else intervalDays = Math.round(input.intervalDays * input.easeFactor);
  }

  const delta = 5 - input.rating;
  const easeFactor = Math.max(
    1.3,
    input.easeFactor + (0.1 - delta * (0.08 + delta * 0.02)),
  );

  return {
    repetitionsCount,
    intervalDays,
    easeFactor,
    nextReviewDate: new Date(now.getTime() + intervalDays * DAY_MS),
  };
}

