import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsUseCases } from './audit-logs.use-cases';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsUseCases],
})
export class AuditLogsModule {}
