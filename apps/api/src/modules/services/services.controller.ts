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
import { AssignProfessionalServiceDto } from './dto/assign-professional-service.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post('salon/:salonId')
  create(
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: CreateServiceDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.servicesService.create(
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
  ) {
    return this.servicesService.findAll({ salonId, search, isActive });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.servicesService.update(id, dto, requesterId, requesterRole);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.servicesService.remove(id, requesterId, requesterRole);
  }

  @Post(':id/professionals')
  assignProfessional(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignProfessionalServiceDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.servicesService.assignProfessional(
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
    return this.servicesService.unassignProfessional(
      id,
      professionalId,
      requesterId,
      requesterRole,
    );
  }
}
