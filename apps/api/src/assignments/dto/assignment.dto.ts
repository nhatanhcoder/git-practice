import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';

export const ASSIGNMENT_TYPES = ['homework', 'mock_test'] as const;
export const ASSIGNMENT_STATUSES = ['draft', 'published'] as const;

/**
 * INV-TASG-02 (ENTITY_ASSIGNMENT): `mock_test` requires `timeLimitMinutes > 0`;
 * `homework` must not carry one. Expressed here as cross-field validation so a
 * bad request fails with VALIDATION_ERROR before any service call.
 */
export class CreateAssignmentDto {
  @IsUUID(undefined, { message: 'classId phải là uuid' })
  classId!: string;

  @IsString()
  @Length(1, 300, { message: 'title phải từ 1 đến 300 ký tự' })
  title!: string;

  @IsIn(ASSIGNMENT_TYPES, { message: 'type phải là homework hoặc mock_test' })
  type!: (typeof ASSIGNMENT_TYPES)[number];

  @IsOptional()
  @IsISO8601({}, { message: 'dueDate phải là UTC ISO 8601' })
  dueDate?: string | null;

  @ValidateIf((o) => o.type === 'mock_test')
  @IsInt()
  @Min(1, { message: 'mock_test phải có timeLimitMinutes > 0' })
  timeLimitMinutes!: number | null;

  @ValidateIf((o) => o.type !== 'mock_test')
  @IsOptional()
  @IsInt()
  timeLimitMinutes_never!: undefined;

  @IsOptional()
  @IsIn(ASSIGNMENT_STATUSES, { message: 'status phải là draft hoặc published' })
  status?: (typeof ASSIGNMENT_STATUSES)[number];

  @IsArray()
  @ArrayNotEmpty({ message: 'ASSIGNMENT_NO_QUESTIONS — assignment cần ít nhất một câu hỏi' })
  @ArrayUnique({ message: 'questionIds không được trùng' })
  @IsString({ each: true })
  questionIds!: string[];
}

/**
 * INV-TASG-04 / spec §3.4: `classId` and `teacherId` are never writable — an
 * assignment cannot move between classes. Everything else revalidates as create.
 */
export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  @Length(1, 300, { message: 'title phải từ 1 đến 300 ký tự' })
  title?: string;

  @IsOptional()
  @IsIn(ASSIGNMENT_TYPES, { message: 'type phải là homework hoặc mock_test' })
  type?: (typeof ASSIGNMENT_TYPES)[number];

  @IsOptional()
  @IsISO8601({}, { message: 'dueDate phải là UTC ISO 8601' })
  dueDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeLimitMinutes?: number | null;

  @IsOptional()
  @IsIn(ASSIGNMENT_STATUSES, { message: 'status phải là draft hoặc published' })
  status?: (typeof ASSIGNMENT_STATUSES)[number];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'ASSIGNMENT_NO_QUESTIONS — assignment cần ít nhất một câu hỏi' })
  @ArrayUnique({ message: 'questionIds không được trùng' })
  @IsString({ each: true })
  questionIds?: string[];
}

export class ListAssignmentsQuery {
  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsIn(ASSIGNMENT_STATUSES)
  status?: (typeof ASSIGNMENT_STATUSES)[number];

  @IsOptional()
  @IsIn(ASSIGNMENT_TYPES)
  type?: (typeof ASSIGNMENT_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
