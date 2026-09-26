import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** GET /student/grammar — HSK 1–9 filters + stable pagination (02 §2/§3). */
export class ListGrammarQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  hskLevel?: number;

  /** Source category verbatim — intentionally not an enum (grammar-rules). */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  /**
   * Assigned-only (API-020 §3.8): narrow the full catalog to grammar points
   * attached to the caller's active-enrollment lessons, before pagination.
   * Query booleans arrive as strings — accept both spellings.
   */
  @IsOptional()
  @Transform(({ value }) =>
    value === true || value === 'true' ? true : value === false || value === 'false' ? false : value,
  )
  @IsBoolean()
  assignedOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/**
 * PUT /student/grammar/progress — explicit idempotent SET (D3),
 * same no-toggle rule as the foundation write.
 */
export class SetGrammarProgressDto {
  @IsString()
  @MaxLength(120)
  grammarId!: string;

  @IsBoolean()
  studied!: boolean;
}

/**
 * POST /student/grammar/:id/practice — one reorder attempt.
 * `submissionId` is the retry identity (§8): the client mints one uuid per
 * attempt and reuses it only to recover a lost response — never across two
 * different answers.
 */
export class SubmitPracticeDto {
  @IsString()
  @IsUUID('4')
  submissionId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  answer!: string[];
}
