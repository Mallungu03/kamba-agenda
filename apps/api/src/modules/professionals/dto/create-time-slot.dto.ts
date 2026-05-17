import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { SlotStatus } from '../../../../generated/prisma/client';

export class CreateTimeSlotDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;

  @IsOptional()
  @IsDateString()
  lockedUntil?: string;

  @IsOptional()
  @IsString()
  lockedBy?: string;
}
