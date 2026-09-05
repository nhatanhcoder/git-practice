import { IsDateString, IsEnum, IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';
import { PayRateType } from '@prisma/client';

export class CreatePayRateDto {
  @IsNotEmpty()
  @IsUUID()
  teacherId!: string;

  @IsNotEmpty()
  @IsEnum(PayRateType)
  rateType!: PayRateType;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'rateAmount must be a positive decimal string with up to 2 decimal places' })
  rateAmount!: string;

  @IsNotEmpty()
  @IsDateString()
  effectiveFrom!: string;
}
