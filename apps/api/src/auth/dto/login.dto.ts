import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'email không đúng định dạng' })
  email!: string;

  @IsString()
  @Length(1, 100, { message: 'password không được để trống' })
  password!: string;
}
