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
import { WaitlistStatus } from '../../../generated/prisma/client';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { WaitlistUseCases } from './waitlist.use-cases';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistUseCases: WaitlistUseCases) {}

  @Post()
  create(
    @Body() dto: CreateWaitlistEntryDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.waitlistUseCases.create(dto, requesterId, requesterRole);
  }

  @Get()
  findAll(
    @Query('status', new ParseEnumPipe(WaitlistStatus, { optional: true }))
    status?: WaitlistStatus,
    @Query('customerId') customerId?: string,
    @Query('professionalId') professionalId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.waitlistUseCases.findAll({
      status,
      customerId,
      professionalId,
      serviceId,
      page,
      limit,
    });
  }

  @Get('mine')
  findMine(
    @CurrentUser('id') requesterId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.waitlistUseCases.findMine(requesterId, { page, limit });
  }

  @Patch('expire')
  expireEntries() {
    return this.waitlistUseCases.expireEntries();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.waitlistUseCases.findOne(id, requesterId, requesterRole);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWaitlistEntryDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.waitlistUseCases.update(id, dto, requesterId, requesterRole);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.waitlistUseCases.remove(id, requesterId, requesterRole);
  }
}
