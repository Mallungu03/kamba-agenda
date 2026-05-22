import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardUseCases } from './dashboard.use-cases';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardUseCases],
})
export class DashboardModule {}
