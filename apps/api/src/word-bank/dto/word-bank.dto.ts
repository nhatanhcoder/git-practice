import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { WORD_BANK_SOURCE_TYPES, type WordBankSourceType } from '../../mongodb/schemas/user-saved-word.schema';

/**
 * At least one CJK character — the bank bookmarks Chinese words; an all-Latin save is a
 * client bug reaching the API, not a learner's choice (02-word-bank.md §3). CJK Unified
 * Ideographs + Extension A + the Compatibility block cover every hanzi the catalog
 * carries; pinyin-only bookmarks are rejected without banning Vietnamese notes.
 */
const CJK_CHAR = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

export class SaveWordDto {
  @IsString({ message: 'hanzi phải là chuỗi' })
  @Length(1, 20, { message: 'hanzi phải dài từ 1 đến 20 ký tự' })
  @Matches(CJK_CHAR, { message: 'hanzi phải chứa ít nhất một chữ Hán' })
  hanzi!: string;

  @IsString({ message: 'pinyin phải là chuỗi' })
  @Length(1, 50, { message: 'pinyin phải dài từ 1 đến 50 ký tự' })
  pinyin!: string;

  @IsString({ message: 'meaning phải là chuỗi' })
  @Length(1, 200, { message: 'meaning phải dài từ 1 đến 200 ký tự' })
  meaning!: string;

  @IsIn(WORD_BANK_SOURCE_TYPES as unknown as string[], {
    message: `sourceType phải thuộc ${WORD_BANK_SOURCE_TYPES.join(' | ')}`,
  })
  sourceType!: WordBankSourceType;

  @IsOptional()
  @IsString({ message: 'sourceId phải là chuỗi' })
  @Length(1, 100, { message: 'sourceId tối đa 100 ký tự' })
  sourceId?: string;

  @IsOptional()
  @IsString({ message: 'note phải là chuỗi' })
  @Length(1, 500, { message: 'note tối đa 500 ký tự' })
  note?: string;
}

export class ListWordBankQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải ≥ 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải ≥ 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  limit: number = 50;
}
