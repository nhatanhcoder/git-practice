import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, ValidateNested } from 'class-validator';

export class PlacementAnswerDto {
  @IsString()
  questionId!: string;

  /** Option ids. INV-PLC-04 grades exact set-match; papers are single-answer. */
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  selectedOptions!: string[];
}

export class SubmitPlacementDto {
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PlacementAnswerDto)
  answers!: PlacementAnswerDto[];
}
