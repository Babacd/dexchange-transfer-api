import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogSchema } from './entities/audit-log.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
