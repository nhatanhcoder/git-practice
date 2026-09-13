import { IsOptional, IsString, Length, Matches } from 'class-validator';

/**
 * INV-ATLP-10 (03-attempt-lifecycle): the autosave payload carries the answer
 * shape only. Unknown fields are rejected by the global whitelist pipe.
 * `questionId` names a MongoDB Question `_id` (24-hex ObjectId); membership in
 * the assignment's `questionIds` is checked in the service, not here.
 */
export class SaveAnswerDto {
  @IsString()
  @Matches(/^[0-9a-f]{24}$/i, { message: 'questionId phải là Mongo ObjectId' })
  questionId!: string;

  @IsOptional()
  @IsString({ each: true })
  selectedOptions?: string[];

  @IsOptional()
  @IsString()
  @Length(0, 10000, { message: 'writtenAnswer tối đa 10000 ký tự' })
  writtenAnswer?: string;
}
