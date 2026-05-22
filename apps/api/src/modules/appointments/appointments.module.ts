import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsUseCases } from './appointments.use-cases';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsUseCases],
})
export class AppointmentsModule {}
