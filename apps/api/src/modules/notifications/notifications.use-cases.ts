import { Injectable, NotFoundException } from '@nestjs/common';
import { getPagination, paginated } from '@/shared/pagination';
import { PrismaService } from '@/config/database/prisma.service';

@Injectable()
export class NotificationsUseCases {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { userId: string; page?: number; limit?: number }) {
    const userId = query.userId;

    const { page, limit, skip, take } = getPagination(query);

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllRead(userId: string) {
    return await this.prisma.notification.updateMany({
      where: { userId },
      data: {},
    });
  }

  async remove(id: string) {
    await this.prisma.notification.delete({ where: { id } });
    return { deleted: true };
  }
}
