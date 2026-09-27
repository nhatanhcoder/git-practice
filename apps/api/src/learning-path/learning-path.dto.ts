import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";
export class LearningPathQuery {
  @IsOptional()
  @IsString()
  @Matches(/^(hanlo_vocabulary|hsk_standard_course|han_yu_jiao_cheng|tp-[a-z0-9-]{1,97})$/)
  curriculum = "hanlo_vocabulary";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9) level = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
export class LearningRevisionDto {
  @IsInt() @Min(1) revision!: number;
}
export class StudyWordDto extends LearningRevisionDto {
  @IsInt() @Min(0) @Max(11) index!: number;
}
export class SaveLearningAnswerDto extends StudyWordDto {
  @IsString() @Length(16, 16) choiceId!: string;
}
