import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { UpdateMarketingProfileDto } from './marketing-profile.dto';

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

  /**
   * Optional marketing profile, sent by step 2 of the signup wizard.
   *
   * It has to travel with the registration rather than be saved afterwards: a new account is
   * `pending` until an admin approves it, so there is no session to call
   * PATCH /auth/me/marketing with. Collecting it later would mean collecting it days later, or
   * not at all.
   *
   * Skipping step 2 simply omits this, which is a valid registration.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMarketingProfileDto)
  marketing?: UpdateMarketingProfileDto;
}
