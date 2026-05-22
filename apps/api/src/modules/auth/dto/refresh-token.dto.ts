import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken;

  @IsOptional()
  @IsUUID()
  deviceId?;
}
