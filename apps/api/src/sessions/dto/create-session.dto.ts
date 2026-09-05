import { IsNotEmpty, IsString, IsUUID, Matches, MaxLength, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @IsNotEmpty()
  @IsUUID()
  classId!: string;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'scheduledDate must be YYYY-MM-DD' })
  scheduledDate!: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'scheduledStart must be HH:mm' })
  scheduledStart!: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'scheduledEnd must be HH:mm' })
  scheduledEnd!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  topic!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
