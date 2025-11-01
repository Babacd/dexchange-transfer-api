import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export enum AuditAction {
  TRANSFER_CREATED = 'TRANSFER_CREATED',
  TRANSFER_PROCESSING = 'TRANSFER_PROCESSING',
  TRANSFER_SUCCESS = 'TRANSFER_SUCCESS',
  TRANSFER_FAILED = 'TRANSFER_FAILED',
  TRANSFER_CANCELED = 'TRANSFER_CANCELED',
}

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, enum: AuditAction })
  action: AuditAction;

  @Prop({ required: true })
  transferId: string;

  @Prop({ required: true })
  transferReference: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Date })
  createdAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Index pour améliorer les performances
AuditLogSchema.index({ transferId: 1 });
AuditLogSchema.index({ createdAt: -1 });
