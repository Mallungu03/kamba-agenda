import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateWaitlistEntryDto {
  @IsUUID()
  professionalId;

  @IsUUID()
  serviceId;

  @IsOptional()
  @IsUUID()
  customerId?;

  @IsDateString()
  preferredDate;

  @IsOptional()
  @IsDateString()
  preferredStart?;

  @IsOptional()
  @IsDateString()
  expiresAt?;
}
