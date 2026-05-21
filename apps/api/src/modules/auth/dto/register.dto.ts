import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email;

  @IsString()
  @MinLength(2)
  name;

  @IsString()
  @IsStrongPassword()
  password;

  @IsOptional()
  @IsPhoneNumber()
  phone?;
}
