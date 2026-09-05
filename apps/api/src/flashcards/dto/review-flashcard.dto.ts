import { IsIn } from 'class-validator';

export const PUBLIC_SRS_RATINGS = [0, 3, 4, 5] as const;
export type PublicSrsRating = (typeof PUBLIC_SRS_RATINGS)[number];

export class ReviewFlashcardDto {
  @IsIn(PUBLIC_SRS_RATINGS)
  rating!: PublicSrsRating;
}

