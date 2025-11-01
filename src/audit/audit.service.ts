import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument, AuditAction } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(
    action: AuditAction,
    transferId: string,
    transferReference: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const auditLog = new this.auditLogModel({
      action,
      transferId,
      transferReference,
      metadata,
    });

    await auditLog.save();

    console.log(`[AUDIT] ${action} - Transfer: ${transferReference}`, metadata || '');
  }

  async getTransferAuditLogs(transferId: string): Promise<AuditLog[]> {
    return this.auditLogModel.find({ transferId }).sort({ createdAt: -1 }).exec();
  }
}
