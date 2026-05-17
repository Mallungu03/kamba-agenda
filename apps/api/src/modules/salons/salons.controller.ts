import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SalonsService } from './salons.service';
import { CreateSalonDto } from './dto/create-salon.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';

@Controller('salons')
export class SalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Post()
  create(@Body() createSalonDto: CreateSalonDto) {
    return this.salonsService.create(createSalonDto);
  }

  @Get()
  findAll() {
    return this.salonsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salonsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSalonDto: UpdateSalonDto) {
    return this.salonsService.update(+id, updateSalonDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salonsService.remove(+id);
  }
}
