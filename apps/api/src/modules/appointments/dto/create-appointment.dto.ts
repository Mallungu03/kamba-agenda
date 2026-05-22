import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  professionalId;

  @IsUUID()
  serviceId;

  @IsUUID()
  slotId;

  @IsOptional()
  @IsUUID()
  customerId?;

  @IsOptional()
  @IsString()
  notes?;
}
