import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';

export enum InvoiceSort {
  periodStart_asc = 'periodStart_asc',
  periodStart_desc = 'periodStart_desc',
  dueDate_asc = 'dueDate_asc',
}

export class ListInvoicesQuery {
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
  studentId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  periodFrom?: string;

  @IsOptional()
  @IsDateString()
  periodTo?: string;

  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  overdue?: boolean;

  @IsOptional()
  @IsEnum(InvoiceSort)
  sort?: InvoiceSort = InvoiceSort.periodStart_desc;
}
