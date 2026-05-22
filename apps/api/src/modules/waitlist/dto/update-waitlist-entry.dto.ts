import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { WaitlistStatus } from '../../../../generated/prisma/client';

export class UpdateWaitlistEntryDto {
  @IsOptional()
  @IsDateString()
  preferredDate?;

  @IsOptional()
  @IsDateString()
  preferredStart?;

  @IsOptional()
  @IsDateString()
  expiresAt?;

  @IsOptional()
  @IsEnum(WaitlistStatus)
  status?;
}
