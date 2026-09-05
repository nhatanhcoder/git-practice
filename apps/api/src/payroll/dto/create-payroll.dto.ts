import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreatePayrollDto {
  @IsNotEmpty()
  @IsUUID()
  teacherId!: string;

  @IsNotEmpty()
  @IsDateString()
  periodStart!: string;

  @IsNotEmpty()
  @IsDateString()
  periodEnd!: string;
}
