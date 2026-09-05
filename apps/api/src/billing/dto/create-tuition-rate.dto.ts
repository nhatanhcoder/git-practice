import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { TuitionBillingCycle } from '@prisma/client';

export class CreateTuitionRateDto {
  @IsNotEmpty()
  @IsUUID()
  studentId!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'rateAmount must be a positive decimal string with up to 2 decimal places' })
  rateAmount!: string;

  @IsOptional()
  @IsEnum(TuitionBillingCycle)
  billingCycle?: TuitionBillingCycle = TuitionBillingCycle.monthly;

  @IsNotEmpty()
  @IsDateString()
  effectiveFrom!: string;
}
