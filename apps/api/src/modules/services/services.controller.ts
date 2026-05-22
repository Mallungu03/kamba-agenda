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
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Public } from '@/shared/decorators/public.decorator';
import { AssignProfessionalServiceDto } from './dto/assign-professional-service.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesUseCases } from './services.use-cases';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesUseCases: ServicesUseCases) {}

  @Post('salon/:salonId')
  create(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: CreateServiceDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.servicesUseCases.create(
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
    @Query('search') search?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.servicesUseCases.findAll({
      salonId,
      search,
      isActive,
      page,
      limit,
    });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesUseCases.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.servicesUseCases.update(id, dto, requesterId, requesterRole);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.servicesUseCases.remove(id, requesterId, requesterRole);
  }

  @Post(':id/professionals')
  assignProfessional(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignProfessionalServiceDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.servicesUseCases.assignProfessional(
      id,
      dto,
      requesterId,
      requesterRole,
    );
  }

  @Delete(':id/professionals/:professionalId')
  unassignProfessional(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.servicesUseCases.unassignProfessional(
      id,
      professionalId,
      requesterId,
      requesterRole,
    );
  }
}
