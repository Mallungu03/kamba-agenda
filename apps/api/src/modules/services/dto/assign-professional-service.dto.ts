import {
  IsInt,
  IsNumberString,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssignProfessionalServiceDto {
  @IsUUID()
  professionalId: string;

  @IsOptional()
  @IsNumberString()
  customPrice?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customDuration?: number;
}
