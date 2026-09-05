import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, Length } from 'class-validator';

export const REGISTER_ROLES = ['student', 'teacher'] as const;

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'email không đúng định dạng' })
  @Length(1, 255, { message: 'email tối đa 255 ký tự' })
  email!: string;

  @IsString()
  @Length(8, 100, { message: 'password phải từ 8 ký tự trở lên' })
  password!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100, { message: 'fullName phải từ 1 đến 100 ký tự' })
  fullName!: string;

  @IsIn(REGISTER_ROLES, { message: 'role phải là student hoặc teacher' })
  role!: (typeof REGISTER_ROLES)[number];
}
