import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus } from '../../../../generated/prisma/client';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
