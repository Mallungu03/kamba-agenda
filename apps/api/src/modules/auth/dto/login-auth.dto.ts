import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginAuthDto {
  @IsEmail()
  email;

  @IsString()
  @MinLength(8)
  password;
}
