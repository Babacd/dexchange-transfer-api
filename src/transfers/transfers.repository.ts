import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transfer, TransferDocument } from './entities/transfer.entity';
import { QueryTransferDto } from './dto/query-transfer.dto';

@Injectable()
export class TransfersRepository {
  constructor(
    @InjectModel(Transfer.name)
    private transferModel: Model<TransferDocument>,
  ) {}

  async create(transferData: Partial<Transfer>): Promise<Transfer> {
    const transfer = new this.transferModel(transferData);
    return transfer.save();
  }

  async findById(id: string): Promise<Transfer | null> {
    return this.transferModel.findById(id).exec();
  }

  async findByReference(reference: string): Promise<Transfer | null> {
    return this.transferModel.findOne({ reference }).exec();
  }

  async findWithPagination(query: QueryTransferDto) {
    const { status, channel, minAmount, maxAmount, q, limit = 20, cursor } = query;

    // Construction du filtre
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (channel) {
      filter.channel = channel;
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      filter.amount = {};
      if (minAmount !== undefined) {
        filter.amount.$gte = minAmount;
      }
      if (maxAmount !== undefined) {
        filter.amount.$lte = maxAmount;
      }
    }

    if (q) {
      filter.$or = [
        { reference: { $regex: q, $options: 'i' } },
        { 'recipient.name': { $regex: q, $options: 'i' } },
      ];
    }

    // Cursor-based pagination
    if (cursor) {
      filter._id = { $gt: cursor };
    }

    const items = await this.transferModel
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .exec();

    // Vérifier s'il y a une page suivante
    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? results[results.length - 1]._id.toString() : null;

    return {
      items: results,
      nextCursor,
    };
  }

  async update(id: string, updateData: Partial<Transfer>): Promise<Transfer | null> {
    return this.transferModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }
}
