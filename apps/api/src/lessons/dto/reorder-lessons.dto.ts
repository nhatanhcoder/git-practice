import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class ReorderLessonItemDto {
  @IsUUID('4', { message: 'id phải là UUID hợp lệ' })
  id!: string;

  @IsInt()
  @Min(1)
  orderIndex!: number;
}

export class ReorderLessonsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderLessonItemDto)
  items!: ReorderLessonItemDto[];
}
