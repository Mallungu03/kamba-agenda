import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../../../generated/prisma/client';
import { UsersUseCases } from './users.use-cases';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Roles } from '@/shared/decorators/roles.decorators';

@Controller('users')
export class UsersController {
  constructor(private readonly usersUseCases: UsersUseCases) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll(
    @CurrentUser('role') role: string,
    @Query('search') search?: string,
    @Query('role') userRole?: UserRole,
    @Query('isActive') isActive?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.usersUseCases.findAll(role, {
      search,
      role: userRole,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      page,
      limit,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.usersUseCases.findOne(id, requesterId, requesterRole);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.usersUseCases.update(
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
    return this.usersUseCases.remove(id, role);
  }
}
