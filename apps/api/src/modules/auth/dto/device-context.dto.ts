import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class DeviceContextDto {
  @IsOptional()
  @IsUUID()
  deviceId?;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?;
}
