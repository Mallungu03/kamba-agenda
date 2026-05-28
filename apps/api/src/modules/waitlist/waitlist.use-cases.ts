import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, WaitlistStatus } from '../../../generated/prisma/client';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { WaitlistService } from './waitlist.service';
import { getPagination, paginated } from '@/shared/utils/pagination';
import { PrismaService } from '@/config/database/prisma.service';

@Injectable()
export class WaitlistUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly waitlistService: WaitlistService,
  ) {}

  async create(
    dto: CreateWaitlistEntryDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const customerId = String(dto.customerId ?? requesterId);

    if (customerId !== requesterId && requesterRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Apenas super administradores podem criar espera para outro cliente.',
      );
    }

    const [customer, professional, service] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: customerId },
        select: { id: true, isActive: true },
      }),
      this.prisma.professional.findUnique({
        where: { id: String(dto.professionalId) },
        select: { id: true, salonId: true, isActive: true },
      }),
      this.prisma.service.findUnique({
        where: { id: String(dto.serviceId) },
        select: { id: true, salonId: true, isActive: true },
      }),
    ]);

    if (!customer?.isActive) throw new NotFoundException('Cliente inválido.');
    if (!professional?.isActive) {
      throw new NotFoundException('Profissional inválido.');
    }
    if (!service?.isActive) throw new NotFoundException('Serviço inválido.');

    if (professional.salonId !== service.salonId) {
      throw new ConflictException(
        'Serviço e profissional precisam pertencer ao mesmo salão.',
      );
    }

    const entry = await this.prisma.waitlist.create({
      data: {
        customerId,
        professionalId: String(dto.professionalId),
        serviceId: String(dto.serviceId),
        preferredDate: new Date(String(dto.preferredDate)),
        preferredStart: dto.preferredStart
          ? new Date(String(dto.preferredStart))
          : undefined,
        expiresAt: dto.expiresAt
          ? new Date(String(dto.expiresAt))
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      select: this.waitlistService.getSelect(),
    });

    await this.waitlistService.createAuditLog(
      requesterId,
      'WAITLIST_CREATED',
      entry.id,
      null,
      entry,
    );

    return entry;
  }

  async findAll(query: {
    status?: WaitlistStatus;
    customerId?: string;
    professionalId?: string;
    serviceId?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit, skip, take } = getPagination(query);
    const where = {
      status: query.status,
      customerId: query.customerId,
      professionalId: query.professionalId,
      serviceId: query.serviceId,
    };

    const [items, total] = await Promise.all([
      this.prisma.waitlist.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: this.waitlistService.getSelect(),
      }),
      this.prisma.waitlist.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findMine(userId: string, query: { page?: string; limit?: string }) {
    return this.findAll({ ...query, customerId: userId });
  }

  async findOne(id: string, requesterId: string, requesterRole: string) {
    const entry = await this.waitlistService.ensureEntry(id);
    await this.waitlistService.ensureCanAccess(
      entry,
      requesterId,
      requesterRole,
    );
    return this.prisma.waitlist.findUnique({
      where: { id },
      select: this.waitlistService.getSelect(),
    });
  }

  async update(
    id: string,
    dto: UpdateWaitlistEntryDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const entry = await this.waitlistService.ensureEntry(id);
    await this.waitlistService.ensureCanAccess(
      entry,
      requesterId,
      requesterRole,
    );

    const updated = await this.prisma.waitlist.update({
      where: { id },
      data: {
        preferredDate: dto.preferredDate
          ? new Date(String(dto.preferredDate))
          : undefined,
        preferredStart: dto.preferredStart
          ? new Date(String(dto.preferredStart))
          : undefined,
        expiresAt: dto.expiresAt ? new Date(String(dto.expiresAt)) : undefined,
        status: dto.status as WaitlistStatus,
      },
      select: this.waitlistService.getSelect(),
    });

    await this.waitlistService.createAuditLog(
      requesterId,
      'WAITLIST_UPDATED',
      id,
      entry,
      updated,
    );

    return updated;
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    const entry = await this.waitlistService.ensureEntry(id);
    await this.waitlistService.ensureCanAccess(
      entry,
      requesterId,
      requesterRole,
    );

    const updated = await this.prisma.waitlist.update({
      where: { id },
      data: { status: 'CANCELLED' },
      select: this.waitlistService.getSelect(),
    });

    await this.waitlistService.createAuditLog(
      requesterId,
      'WAITLIST_CANCELLED',
      id,
      entry,
      updated,
    );

    return updated;
  }

  async expireEntries() {
    return this.waitlistService.expireEntries();
  }
}
