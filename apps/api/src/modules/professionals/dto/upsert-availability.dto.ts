import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertAvailabilityDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsBoolean()
  isOff?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  appointmentGap?: number;
}
