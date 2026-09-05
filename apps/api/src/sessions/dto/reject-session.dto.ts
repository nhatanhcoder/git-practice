import { IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class RejectSessionDto {
  @IsNotEmpty({ message: 'rejectionReason không được để trống' })
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @Length(10, 2000, { message: 'rejectionReason phải có từ 10 đến 2000 ký tự' })
  rejectionReason!: string;
}
