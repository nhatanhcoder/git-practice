import { IsOptional, IsString, Matches } from 'class-validator';

/**
 * INV-TGRD-06 request: which Writing answers to suggest for. Omitted = all
 * Writing answers of the attempt. Non-writing ids are rejected (suggest is
 * writing-only) — the default already covers "everything suggestible".
 */
export class AiSuggestDto {
  @IsOptional()
  @IsString({ each: true })
  @Matches(/^[0-9a-f]{24}$/i, { each: true, message: 'questionId phải là Mongo ObjectId' })
  questionIds?: string[];
}
