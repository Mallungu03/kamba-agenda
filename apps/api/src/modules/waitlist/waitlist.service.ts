import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '@/config/database/prisma.service';
import { toJson } from '@/shared/utils/json';

@Injectable()
export class WaitlistService implements OnModuleInit, OnModuleDestroy {
  expiryTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.expiryTimer = setInterval(() => {
      void this.safeExpireEntries();
    }, 60_000);
    void this.safeExpireEntries();
  }

  onModuleDestroy() {
    if (this.expiryTimer) {
      clearInterval(this.expiryTimer);
    }
  }

  async safeExpireEntries() {
    try {
      await this.expireEntries();
    } catch (error) {
      console.error(
        '[waitlist] Não foi possível expirar entradas. Verifique se as migrations foram aplicadas.',
        error instanceof Error ? error.message : error,
      );
    }
  }

  async expireEntries() {
    return this.prisma.waitlist.updateMany({
      where: {
        status: { in: ['WAITING', 'NOTIFIED'] },
        expiresAt: { lte: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
  }

  async ensureEntry(id: string) {
    const entry = await this.prisma.waitlist.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        professional: { select: { userId: true, salonId: true } },
      },
    });

    if (!entry)
      throw new NotFoundException('Entrada da waitlist não encontrada.');
    return entry;
  }

  async ensureCanAccess(
    entry: {
      customerId: string;
      professional: { userId: string; salonId: string };
    },
    userId: string,
    requesterRole: string,
  ) {
    if (
      requesterRole === UserRole.SUPER_ADMIN ||
      entry.customerId === userId ||
      entry.professional.userId === userId
    ) {
      return;
    }

    const membership = await this.prisma.salonMember.findFirst({
      where: {
        userId,
        salonId: entry.professional.salonId,
        role: UserRole.SALON_ADMIN,
        isActive: true,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Você não tem permissão para esta waitlist.',
      );
    }
  }

  async createAuditLog(
    userId: string,
    action: string,
    entityId: string,
    oldValues: unknown,
    newValues: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: 'Waitlist',
        entityId,
        oldValues: toJson(oldValues),
        newValues: toJson(newValues),
      },
    });
  }

  getSelect() {
    return {
      id: true,
      professionalId: true,
      serviceId: true,
      customerId: true,
      preferredDate: true,
      preferredStart: true,
      status: true,
      notifiedAt: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { id: true, name: true, email: true, phone: true } },
      professional: {
        select: {
          id: true,
          userId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      service: { select: { id: true, name: true, durationMins: true } },
    };
  }
}
