import { Injectable } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AppointmentStatus, UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '@/config/database/prisma.service';

@Injectable()
export class DashboardUseCases {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly prisma: PrismaService,
  ) {}

  async overview(
    requesterId: string,
    requesterRole: string,
    query: { salonId?: string; from?: string; to?: string },
  ) {
    const scope = await this.dashboardService.buildSalonScope(
      requesterId,
      requesterRole,
      query.salonId,
    );
    const dateFilter =
      query.from || query.to
        ? {
            gte: query.from ? new Date(query.from) : undefined,
            lte: query.to ? new Date(query.to) : undefined,
          }
        : undefined;

    const where = { ...scope, createdAt: dateFilter };

    const [
      appointmentsByStatus,
      totalAppointments,
      revenue,
      newCustomers,
      waitlistCounts,
      upcomingAppointments,
    ] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where: { ...where, status: AppointmentStatus.COMPLETED },
        select: { service: { select: { price: true } } },
      }),
      this.prisma.user.count({
        where: { role: UserRole.CUSTOMER, createdAt: dateFilter },
      }),
      this.prisma.waitlist.groupBy({
        by: ['status'],
        where: query.salonId
          ? { professional: { salonId: query.salonId } }
          : undefined,
        _count: { id: true },
      }),
      this.prisma.appointment.findMany({
        where: {
          ...scope,
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
          },
          slot: { startTime: { gte: new Date() } },
        },
        orderBy: { slot: { startTime: 'asc' } },
        take: 10,
        select: {
          id: true,
          status: true,
          customer: { select: { id: true, name: true } },
          professional: {
            select: { id: true, user: { select: { name: true } } },
          },
          service: { select: { id: true, name: true, price: true } },
          slot: { select: { startTime: true, endTime: true } },
        },
      }),
    ]);

    return {
      totalAppointments,
      appointmentsByStatus,
      revenue: revenue.reduce(
        (sum, appointment) => sum + Number(appointment.service.price),
        0,
      ),
      newCustomers,
      waitlistCounts,
      upcomingAppointments,
    };
  }

  async professionals(
    requesterId: string,
    requesterRole: string,
    salonId?: string,
  ) {
    const scope = await this.dashboardService.buildSalonScope(
      requesterId,
      requesterRole,
      salonId,
    );

    return this.prisma.professional.findMany({
      where: scope.salonId ? { salonId: scope.salonId } : undefined,
      orderBy: [{ rating: 'desc' }, { totalReviews: 'desc' }],
      take: 10,
      select: {
        id: true,
        rating: true,
        totalReviews: true,
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { appointments: true, waitlistEntries: true } },
      },
    });
  }
}
