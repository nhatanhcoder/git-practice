import { Type } from 'class-transformer';
import {
  IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min,
  MaxLength, ValidateNested,
} from 'class-validator';
import { ALL_SUB_TYPES, type QuestionSkill } from '../../mongodb/schemas/question.schema';

export class QuestionContentDto {
  @IsOptional() @IsString() @MaxLength(2000) audioUrl?: string;
  @IsOptional() @IsString() @MaxLength(20000) transcript?: string;
  @IsOptional() @IsString() @MaxLength(20000) passage?: string;
  @IsOptional() @IsString() @MaxLength(5000) prompt?: string;
  @IsOptional() @IsString() @MaxLength(5000) rubric?: string;
}

export class QuestionOptionDto {
  @IsString() @MaxLength(8) id!: string;
  @IsString() @MaxLength(2000) text!: string;
}

export class CreateQuestionDto {
  @IsIn(['listening', 'reading', 'writing'])
  skill!: QuestionSkill;

  @IsIn(ALL_SUB_TYPES)
  subType!: string;

  // HSK 1–9. `1–6` is stale everywhere in this repo (DOC-004).
  @IsInt() @Min(1) @Max(9)
  hskLevel!: number;

  @IsOptional() @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @IsOptional() @ValidateNested() @Type(() => QuestionContentDto)
  content?: QuestionContentDto;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  /**
   * Deliberately untyped beyond "present or not": it is a string for single MCQ,
   * a string[] for multi/ordering/matching and null for writing. The cross-field
   * rules that actually make it valid live in the service, where the skill and
   * sub-type are known — a per-field decorator cannot see them.
   */
  @IsOptional()
  correctAnswer?: string | string[] | null;

  @IsOptional() @IsString() @MaxLength(5000)
  explanation?: string | null;
}
