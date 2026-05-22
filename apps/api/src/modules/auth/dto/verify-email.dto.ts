import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  email;

  @IsString()
  @Length(6, 6)
  code;
}
