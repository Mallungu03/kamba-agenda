import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { UserRole } from '@generated/prisma/enums';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async buildSalonScope(
    requesterId: string,
    requesterRole: string,
    salonId?: string,
  ) {
    if (requesterRole === UserRole.SUPER_ADMIN) {
      return salonId ? { salonId } : {};
    }

    const memberships = await this.prisma.salonMember.findMany({
      where: {
        userId: requesterId,
        isActive: true,
        role: UserRole.SALON_ADMIN,
        salonId,
      },
      select: { salonId: true },
    });

    if (!memberships.length) {
      throw new ForbiddenException(
        'Você não tem permissão para este dashboard.',
      );
    }

    return { salonId: { in: memberships.map((member) => member.salonId) } };
  }
}
