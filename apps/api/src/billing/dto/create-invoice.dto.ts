import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateInvoiceDto {
  @IsNotEmpty()
  @IsUUID()
  studentId!: string;

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
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'totalAmount must be a positive decimal string with up to 2 decimal places' })
  totalAmount?: string;
}
