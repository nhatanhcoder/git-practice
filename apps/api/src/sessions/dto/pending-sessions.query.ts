import { IsOptional, IsInt, Min, Max, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum SessionSort {
  scheduledDate_asc = 'scheduledDate_asc',
  scheduledDate_desc = 'scheduledDate_desc',
}

export class PendingSessionsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(SessionSort)
  sort?: SessionSort = SessionSort.scheduledDate_asc;
}
