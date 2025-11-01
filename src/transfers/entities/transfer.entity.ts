import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransferDocument = Transfer & Document;

export enum TransferStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

export enum TransferChannel {
  WAVE = 'WAVE',
  OM = 'OM',
}

@Schema({ timestamps: true })
export class Transfer {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  reference: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, enum: TransferChannel })
  channel: TransferChannel;

  @Prop({ type: Object, required: true })
  recipient: {
    phone: string;
    name: string;
  };

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ required: true })
  fees: number;

  @Prop({ required: true })
  total: number;

  @Prop({ required: true, enum: TransferStatus, default: TransferStatus.PENDING })
  status: TransferStatus;

  @Prop()
  provider_ref?: string;

  @Prop()
  error_code?: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const TransferSchema = SchemaFactory.createForClass(Transfer);

// Index pour améliorer les performances de recherche
TransferSchema.index({ reference: 1 });
TransferSchema.index({ status: 1 });
TransferSchema.index({ channel: 1 });
TransferSchema.index({ amount: 1 });
TransferSchema.index({ createdAt: -1 });
