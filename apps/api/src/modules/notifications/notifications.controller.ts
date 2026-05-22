import { Controller, Get, Patch, Param, Delete, Query } from '@nestjs/common';
import { NotificationsUseCases } from './notifications.use-cases';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/shared/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsUseCases: NotificationsUseCases) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = user.id;
    return this.notificationsUseCases.findAll({
      userId,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const userId = user.id;
    return this.notificationsUseCases.findOne(userId, id);
  }

  @Patch(':id/mark-all-read')
  maekAllRead() {
    return 'mark all read';
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationsUseCases.remove(id);
  }
}
