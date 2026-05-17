import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../../../generated/prisma/client';

export class UpdateSalonMemberDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
