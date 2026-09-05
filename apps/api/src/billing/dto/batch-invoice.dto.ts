import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class BatchInvoicePreviewDto {
  @IsNotEmpty()
  @IsDateString()
  periodStart!: string;

  @IsNotEmpty()
  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  studentIds?: string[];
}

export class BatchInvoiceCreateDto extends BatchInvoicePreviewDto {
  @IsOptional()
  @IsString()
  previewHash?: string;
}
