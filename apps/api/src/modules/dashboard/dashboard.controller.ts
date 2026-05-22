import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { DashboardUseCases } from './dashboard.use-cases';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardUseCases: DashboardUseCases) {}

  @Get('overview')
  overview(
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
    @Query('salonId') salonId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardUseCases.overview(requesterId, requesterRole, {
      salonId,
      from,
      to,
    });
  }

  @Get('professionals')
  professionals(
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
    @Query('salonId') salonId?: string,
  ) {
    return this.dashboardUseCases.professionals(
      requesterId,
      requesterRole,
      salonId,
    );
  }
}
