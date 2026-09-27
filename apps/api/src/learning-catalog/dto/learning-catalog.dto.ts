import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateLearningPathDto {
  @IsString()
  @Length(3, 300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateLearningPathDto {
  @IsOptional()
  @IsString()
  @Length(3, 300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class LearningWordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  hanzi!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  pinyin!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  meaning!: string;
}

export class CreateLearningUnitDto {
  @IsIn(['authored', 'reference'])
  kind!: 'authored' | 'reference';

  @IsString()
  @Length(3, 300)
  title!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  level!: number;

  @ValidateIf((value: CreateLearningUnitDto) => value.kind === 'authored')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => LearningWordDto)
  words?: LearningWordDto[];

  @ValidateIf((value: CreateLearningUnitDto) => value.kind === 'reference')
  @IsString()
  @Length(1, 100)
  referenceSlug?: string;
}

export class UpdateLearningUnitDto {
  @IsOptional()
  @IsString()
  @Length(3, 300)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => LearningWordDto)
  words?: LearningWordDto[];
}

export class ReorderLearningUnitItemDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  order!: number;
}

export class EmptyBodyDto {}

export class TeacherLearningPathQuery {
  @IsOptional()
  @IsIn(['draft', 'pending_review', 'approved', 'rejected', 'suspended'])
  status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
}

export class AdminLearningPathQuery extends TeacherLearningPathQuery {
  @IsOptional()
  @IsString()
  teacherId?: string;
}

export class TeacherPublishedLearningUnitQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  curriculum?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
}

export class AdminPublishedLearningUnitQuery {
  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  pathId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
}

export class RejectLearningPathDto {
  @IsString()
  rejectionReason!: string;
}
