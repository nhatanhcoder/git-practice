import { IsInt, IsUUID, Min } from 'class-validator';

/** One row of PATCH /teacher/lessons/:id/supplements/reorder — API-020 §3.3. */
export class ReorderSupplementItemDto {
  @IsUUID('4')
  id!: string;

  @IsInt()
  @Min(1)
  orderIndex!: number;
}
