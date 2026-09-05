import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ALL_SUB_TYPES, type QuestionSkill } from '../../mongodb/schemas/question.schema';

export class ListQuestionsQuery {
  @IsOptional() @IsIn(['listening', 'reading', 'writing'])
  skill?: QuestionSkill;

  @IsOptional() @IsIn(ALL_SUB_TYPES)
  subType?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9)
  hskLevel?: number;

  @IsOptional() @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  /** Free text over prompt / passage / transcript / option text. */
  @IsOptional() @IsString() @MaxLength(200)
  q?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}
