import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProfessionalDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
