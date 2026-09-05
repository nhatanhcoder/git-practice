import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateClassDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 200, { message: 'Tên lớp từ 1 đến 200 ký tự' })
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  hskLevel?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
