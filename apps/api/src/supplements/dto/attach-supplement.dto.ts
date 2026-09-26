import { IsIn, IsString, Length } from 'class-validator';

/** POST /teacher/lessons/:id/supplements — API-020 §3.1. */
export class AttachSupplementDto {
  @IsIn(['learning_unit', 'grammar_point'])
  sourceType!: 'learning_unit' | 'grammar_point';

  @IsString()
  @Length(1, 200)
  sourceKey!: string;
}
