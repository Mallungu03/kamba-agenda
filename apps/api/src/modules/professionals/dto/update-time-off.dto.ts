import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateTimeOffDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;
}
