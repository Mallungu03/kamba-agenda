import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignInDto {
  @IsEmail()
  email;

  @IsString()
  @MinLength(8)
  password;
}
