import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../config/database/prisma.service';

@Injectable()
export class SalonsService {
  readonly salonSelect = {
    id: true,
    name: true,
    slug: true,
    description: true,
    phone: true,
    email: true,
    address: true,
    city: true,
    state: true,
    zipCode: true,
    logoUrl: true,
    coverUrl: true,
    timezone: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  async ensureSalonExists(id: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!salon) {
      throw new NotFoundException('Salão não encontrado.');
    }
  }

  async ensureMemberBelongsToSalon(memberId: string, salonId: string) {
    const member = await this.prisma.salonMember.findFirst({
      where: { id: memberId, salonId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Membro do salão não encontrado.');
    }
  }

  async ensureCanManageSalon(
    salonId: string,
    userId: string,
    requesterRole: string,
  ) {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true },
    });

    if (!salon) {
      throw new NotFoundException('Salão não encontrado.');
    }

    if (requesterRole === UserRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.salonMember.findFirst({
      where: {
        salonId,
        userId,
        isActive: true,
        role: UserRole.SALON_ADMIN,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Você não tem permissão para este salão.');
    }
  }

  async ensureSlugIsAvailable(slug: string, currentSalonId: string) {
    const normalizedSlug = this.normalizeSlug(slug);
    const existingSalon = await this.prisma.salon.findFirst({
      where: {
        slug: normalizedSlug,
        id: { not: currentSalonId },
      },
      select: { id: true },
    });

    if (existingSalon) {
      throw new ConflictException('Slug já está em uso.');
    }
  }

  async resolveUniqueSlug(value: string): Promise<string> {
    const baseSlug = this.normalizeSlug(value);
    let slug = baseSlug;
    let suffix = 1;

    while (
      await this.prisma.salon.findUnique({
        where: { slug },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  normalizeSlug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
