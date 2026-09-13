import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
export class ListMistakesQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
export class ReviewMistakeDto {
  @IsInt() @Min(1) version!: number;
  @IsOptional() @IsBoolean() recalled?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) selectedOptions?: string[];
}
