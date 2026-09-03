import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @Length(1, 100, { message: 'Mật khẩu hiện tại không được để trống' })
  currentPassword!: string;

  @IsString()
  @Length(8, 100, { message: 'Mật khẩu mới phải từ 8 ký tự trở lên' })
  newPassword!: string;
}
