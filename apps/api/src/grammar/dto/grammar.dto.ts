import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
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
