import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateSalonDto {
  @IsString()
  @MinLength(2)
  name;

  @IsOptional()
  @IsString()
  slug?;

  @IsOptional()
  @IsString()
  description?;

  @IsPhoneNumber()
  phone;

  @IsOptional()
  @IsEmail()
  email?;

  @IsString()
  @MinLength(2)
  address;

  @IsString()
  @MinLength(2)
  city;

  @IsOptional()
  @IsString()
  state?;

  @IsOptional()
  @IsString()
  zipCode?;

  @IsOptional()
  @IsString()
  logoUrl?;

  @IsOptional()
  @IsString()
  coverUrl?;

  @IsOptional()
  @IsString()
  timezone?;
}
