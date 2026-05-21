import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAuthDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  currentPassword?;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword;
}
