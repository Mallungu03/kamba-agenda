import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AuditLogsUseCases } from './audit-logs.use-cases';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsUseCases: AuditLogsUseCases) {}

  @Get()
  findAll(
    @CurrentUser('role') requesterRole: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.auditLogsUseCases.findAll(requesterRole, {
      userId,
      action,
      entityType,
      entityId,
      from,
      to,
      page,
      limit,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('role') requesterRole: string,
  ) {
    return this.auditLogsUseCases.findOne(id, requesterRole);
  }
}
