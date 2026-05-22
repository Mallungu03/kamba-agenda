import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getPagination, paginated } from '@/shared/pagination';
import { PrismaService } from '@/config/database/prisma.service';
import { UserRole } from '@generated/prisma/enums';

@Injectable()
export class AuditLogsUseCases {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(
    requesterRole: string,
    query: {
      userId?: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      from?: string;
      to?: string;
      page?: string;
      limit?: string;
    },
  ) {
    if (requesterRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Apenas super administradores podem consultar auditoria.',
      );
    }
    const { page, limit, skip, take } = getPagination(query);
    const where = {
      userId: query.userId,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      createdAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(id: string, requesterRole: string) {
    if (requesterRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Apenas super administradores podem consultar auditoria.',
      );
    }
    const auditLog = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!auditLog) {
      throw new NotFoundException('Audit log não encontrado.');
    }

    return auditLog;
  }
}
