import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a positive decimal string with up to 2 decimal places' })
  amount!: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  transactionReference?: string;
}
