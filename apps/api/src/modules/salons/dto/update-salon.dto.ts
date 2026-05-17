import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateSalonDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?;

  @IsOptional()
  @IsString()
  slug?;

  @IsOptional()
  @IsString()
  description?;

  @IsOptional()
  @IsPhoneNumber()
  phone?;

  @IsOptional()
  @IsEmail()
  email?;

  @IsOptional()
  @IsString()
  @MinLength(2)
  address?;

  @IsOptional()
  @IsString()
  @MinLength(2)
  city?;

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

  @IsOptional()
  @IsBoolean()
  isActive?;
}
