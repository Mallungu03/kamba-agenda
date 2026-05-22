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
import { CreateSalonMemberDto } from './dto/create-salon-member.dto';
import { CreateSalonDto } from './dto/create-salon.dto';
import { UpdateSalonMemberDto } from './dto/update-salon-member.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { UpsertSalonScheduleDto } from './dto/upsert-salon-schedule.dto';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Public } from '@/shared/decorators/public.decorator';
import { SalonsUseCases } from './salons.use-cases';

@Controller('salons')
export class SalonsController {
  constructor(private readonly salonsUseCases: SalonsUseCases) {}

  @Post()
  create(
    @Body() createSalonDto: CreateSalonDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.salonsUseCases.create(createSalonDto, userId);
  }

  @Public()
  @Get()
  findAll(
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.salonsUseCases.findAll({ city, search, isActive, page, limit });
  }

  @Get('mine')
  findMine(@CurrentUser('id') userId: string) {
    return this.salonsUseCases.findMine(userId);
  }

  @Public()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.salonsUseCases.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salonsUseCases.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSalonDto: UpdateSalonDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsUseCases.update(
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
    return this.salonsUseCases.remove(id, requesterId, requesterRole);
  }

  @Get(':id/members')
  findMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsUseCases.findMembers(id, requesterId, requesterRole);
  }

  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSalonMemberDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsUseCases.addMember(id, dto, requesterId, requesterRole);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateSalonMemberDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsUseCases.updateMember(
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
    return this.salonsUseCases.removeMember(
      id,
      memberId,
      requesterId,
      requesterRole,
    );
  }

  @Public()
  @Get(':id/schedules')
  findSchedules(@Param('id', ParseUUIDPipe) id: string) {
    return this.salonsUseCases.findSchedules(id);
  }

  @Public()
  @Get(':id/gallery')
  findGallery(@Param('id', ParseUUIDPipe) id: string) {
    return this.salonsUseCases.findGallery(id);
  }

  @Post(':id/gallery')
  addGalleryImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { imageUrl: string; caption?: string },
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsUseCases.addGalleryImage(
      id,
      body,
      requesterId,
      requesterRole,
    );
  }

  @Delete(':id/gallery/:imageId')
  removeGalleryImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsUseCases.removeGalleryImage(
      id,
      imageId,
      requesterId,
      requesterRole,
    );
  }

  @Post(':id/schedules')
  upsertSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertSalonScheduleDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.salonsUseCases.upsertSchedule(
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
    return this.salonsUseCases.removeSchedule(
      id,
      scheduleId,
      requesterId,
      requesterRole,
    );
  }
}
