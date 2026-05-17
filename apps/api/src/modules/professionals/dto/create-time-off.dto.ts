import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateTimeOffDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;
}
