import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { CreateTimeOffDto } from './dto/create-time-off.dto';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpdateTimeOffDto } from './dto/update-time-off.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { UpsertAvailabilityDto } from './dto/upsert-availability.dto';
import { ProfessionalsService } from './professionals.service';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post('salon/:salonId')
  create(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: CreateProfessionalDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.create(
      salonId,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Public()
  @Get()
  findAll(
    @Query('salonId') salonId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('search') search?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
  ) {
    return this.professionalsService.findAll({
      salonId,
      serviceId,
      search,
      isActive,
    });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfessionalDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.update(
      id,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.remove(id, requesterId, requesterRole);
  }

  @Get(':id/appointments')
  findAppointments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.findAppointments(
      id,
      requesterId,
      requesterRole,
    );
  }

  @Public()
  @Get(':id/reviews')
  findReviews(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findReviews(id);
  }

  @Patch(':id/reviews/:reviewId/response')
  respondReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: RespondReviewDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.respondReview(
      id,
      reviewId,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Get(':id/availabilities')
  findAvailabilities(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findAvailabilities(id);
  }

  @Post(':id/availabilities')
  upsertAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertAvailabilityDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.upsertAvailability(
      id,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Delete(':id/availabilities/:availabilityId')
  removeAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('availabilityId', ParseUUIDPipe) availabilityId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.removeAvailability(
      id,
      availabilityId,
      requesterId,
      requesterRole,
    );
  }

  @Get(':id/time-offs')
  findTimeOffs(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findTimeOffs(id);
  }

  @Post(':id/time-offs')
  createTimeOff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTimeOffDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.createTimeOff(
      id,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Patch(':id/time-offs/:timeOffId')
  updateTimeOff(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('timeOffId', ParseUUIDPipe) timeOffId: string,
    @Body() dto: UpdateTimeOffDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.updateTimeOff(
      id,
      timeOffId,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Delete(':id/time-offs/:timeOffId')
  removeTimeOff(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('timeOffId', ParseUUIDPipe) timeOffId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.removeTimeOff(
      id,
      timeOffId,
      requesterId,
      requesterRole,
    );
  }

  @Get(':id/slots')
  findSlots(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findSlots(id);
  }

  @Post(':id/slots')
  createSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTimeSlotDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.createSlot(
      id,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Patch(':id/slots/:slotId')
  updateSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: UpdateTimeSlotDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.updateSlot(
      id,
      slotId,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Delete(':id/slots/:slotId')
  removeSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.professionalsService.removeSlot(
      id,
      slotId,
      requesterId,
      requesterRole,
    );
  }
}
