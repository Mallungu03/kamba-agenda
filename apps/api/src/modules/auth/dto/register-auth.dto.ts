import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
  MinLength,
} from 'class-validator';

export class RegisterAuthDto {
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
