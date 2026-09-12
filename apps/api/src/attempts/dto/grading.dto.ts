import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const GRADING_QUEUE_STATUSES = ['submitted', 'graded'] as const;

/**
 * INV-TGRD-02 (04-attempts-grading): queue filters. Ownership is implicit —
 * `attempt.assignment.teacherId === currentUser` — never a query param.
 */
export class ListAttemptsQuery {
  @IsOptional()
  @IsIn(GRADING_QUEUE_STATUSES, { message: 'status phải là submitted hoặc graded' })
  status?: (typeof GRADING_QUEUE_STATUSES)[number];

  @IsOptional()
  @IsUUID(undefined, { message: 'assignmentId phải là uuid' })
  assignmentId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'classId phải là uuid' })
  classId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

class GradeItemDto {
  // MongoDB Question _id, not a uuid — must still name an answer of this attempt.
  @IsString()
  @Matches(/^[0-9a-f]{24}$/i, { message: 'questionId phải là Mongo ObjectId' })
  questionId!: string;

  // INV-TGRD-04: ≥ 0, no upper bound — per-question max is not modeled (§16-Q2).
  @IsNumber({}, { message: 'teacherScore phải là số' })
  @Min(0, { message: 'teacherScore không được âm' })
  teacherScore!: number;

  @IsOptional()
  @IsString()
  @Length(0, 2000, { message: 'teacherFeedback tối đa 2000 ký tự' })
  teacherFeedback?: string;
}

/**
 * INV-TGRD-08: the grade body carries §3.4 fields only. Anything else trips the
 * global whitelist pipe — the teacher can never write autoScore, selectedOptions,
 * writtenAnswer, studentId or the attempt timestamps through here.
 */
export class GradeAttemptDto {
  @ValidateNested({ each: true })
  @Type(() => GradeItemDto)
  grades!: GradeItemDto[];
}
