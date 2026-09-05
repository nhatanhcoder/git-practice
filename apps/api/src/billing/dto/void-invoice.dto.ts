import { IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class VoidInvoiceDto {
  @IsNotEmpty({ message: 'Lý do hủy hóa đơn không được để trống' })
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @Length(5, 500, { message: 'Lý do hủy phải từ 5 đến 500 ký tự' })
  reason!: string;
}
