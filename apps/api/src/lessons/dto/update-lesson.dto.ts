import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { LESSON_CONTENT_TYPES } from './create-lesson.dto';

export class UpdateLessonDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 300, { message: 'Tiêu đề bài học từ 1 đến 300 ký tự' })
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(LESSON_CONTENT_TYPES, { message: 'contentType phải là text, video, document hoặc mixed' })
  contentType?: (typeof LESSON_CONTENT_TYPES)[number];

  @IsOptional()
  @IsString()
  contentUrl?: string;
}
