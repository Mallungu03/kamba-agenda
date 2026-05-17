import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertSalonScheduleDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  openTime: string;

  @IsString()
  closeTime: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}
