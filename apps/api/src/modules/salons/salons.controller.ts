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
import { SalonsService } from './salons.service';
import { CreateSalonMemberDto } from './dto/create-salon-member.dto';
import { CreateSalonDto } from './dto/create-salon.dto';
import { UpdateSalonMemberDto } from './dto/update-salon-member.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { UpsertSalonScheduleDto } from './dto/upsert-salon-schedule.dto';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Public } from '../../shared/decorators/public.decorator';

@Controller('salons')
export class SalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Post()
  create(
    @Body() createSalonDto: CreateSalonDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.salonsService.create(createSalonDto, userId);
  }

  @Public()
  @Get()
  findAll(
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
  ) {
    return this.salonsService.findAll({ city, search, isActive });
  }

  @Get('mine')
  findMine(@CurrentUser('id') userId: string) {
    return this.salonsService.findMine(userId);
  }

  @Public()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.salonsService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salonsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSalonDto: UpdateSalonDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsService.update(
      id,
      updateSalonDto,
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
    return this.salonsService.remove(id, requesterId, requesterRole);
  }

  @Get(':id/members')
  findMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsService.findMembers(id, requesterId, requesterRole);
  }

  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSalonMemberDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsService.addMember(id, dto, requesterId, requesterRole);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateSalonMemberDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsService.updateMember(
      id,
      memberId,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsService.removeMember(
      id,
      memberId,
      requesterId,
      requesterRole,
    );
  }

  @Public()
  @Get(':id/schedules')
  findSchedules(@Param('id', ParseUUIDPipe) id: string) {
    return this.salonsService.findSchedules(id);
  }

  @Post(':id/schedules')
  upsertSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertSalonScheduleDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsService.upsertSchedule(
      id,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Delete(':id/schedules/:scheduleId')
  removeSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsService.removeSchedule(
      id,
      scheduleId,
      requesterId,
      requesterRole,
    );
  }
}
