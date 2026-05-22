import { IsEmail, IsString, IsStrongPassword, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email;

  @IsString()
  @Length(6, 6)
  code;

  @IsString()
  @IsStrongPassword()
  newPassword;
}
