import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: any) {
    return this.prisma.notification.create({ data: dto });
  }

  async findAll(query: {
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.status) where.status = query.status;

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notification not found');
    return notif;
  }

  async markSent(id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  async retry(id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notification not found');

    const retryCount = (notif.retryCount ?? 0) + 1;

    return this.prisma.notification.update({
      where: { id },
      data: { retryCount, status: 'PENDING', errorMessage: null },
    });
  }

  async remove(id: number) {
    await this.prisma.notification.delete({ where: { id: String(id) } });
    return { deleted: true };
  }
}
