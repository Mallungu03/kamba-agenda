import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AppointmentsUseCases } from './appointments.use-cases';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AppointmentStatus } from '../../../generated/prisma/client';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsUseCases: AppointmentsUseCases) {}

  @Post()
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.appointmentsUseCases.create(
      createAppointmentDto,
      requesterId,
      requesterRole,
    );
  }

  @Get()
  findAll(
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
    @Query('status', new ParseEnumPipe(AppointmentStatus, { optional: true }))
    status?: AppointmentStatus,
    @Query('customerId') customerId?: string,
    @Query('professionalId') professionalId?: string,
    @Query('salonId') salonId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.appointmentsUseCases.findAll(
      {
        status,
        customerId,
        professionalId,
        salonId,
        serviceId,
        from,
        to,
      },
      requesterId,
      requesterRole,
    );
  }

  @Get('mine')
  findMine(@CurrentUser('id') requesterId: string) {
    return this.appointmentsUseCases.findMine(requesterId);
  }

  @Get('salon/:salonId')
  findBySalon(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.appointmentsUseCases.findBySalon(
      salonId,
      requesterId,
      requesterRole,
    );
  }

  @Get('professional/:professionalId')
  findByProfessional(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.appointmentsUseCases.findByProfessional(
      professionalId,
      requesterId,
      requesterRole,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.appointmentsUseCases.findOne(id, requesterId, requesterRole);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.appointmentsUseCases.update(
      id,
      updateAppointmentDto,
      requesterId,
      requesterRole,
    );
  }

  @Patch(':id/confirm')
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.appointmentsUseCases.confirm(id, requesterId, requesterRole);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.appointmentsUseCases.cancel(
      id,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Patch(':id/complete')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.appointmentsUseCases.complete(id, requesterId, requesterRole);
  }

  @Patch(':id/no-show')
  markNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.appointmentsUseCases.markNoShow(id, requesterId, requesterRole);
  }

  @Get(':id/notifications')
  findNotifications(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.appointmentsUseCases.findNotifications(
      id,
      requesterId,
      requesterRole,
    );
  }

  @Post(':id/review')
  createReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.appointmentsUseCases.createReview(id, dto, requesterId);
  }

  @Patch(':id/review')
  updateReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.appointmentsUseCases.updateReview(id, dto, requesterId);
  }

  @Delete(':id/review')
  removeReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.appointmentsUseCases.removeReview(id, requesterId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.appointmentsUseCases.remove(id, requesterId, requesterRole);
  }
}
