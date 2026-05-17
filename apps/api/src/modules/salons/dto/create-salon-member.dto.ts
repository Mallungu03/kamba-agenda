import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UserRole } from '../../../../generated/prisma/client';

export class CreateSalonMemberDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
