import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMins: number;

  @IsNumberString()
  price: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferBefore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferAfter?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
