import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorators';
import { UserRole } from '../../../generated/prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll(@CurrentUser('role') role: string) {
    return this.usersService.findAll(role);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.usersService.findOne(id, requesterId, requesterRole);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.usersService.update(
      id,
      updateUserDto,
      requesterId,
      requesterRole,
    );
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.remove(id, role);
  }
}
