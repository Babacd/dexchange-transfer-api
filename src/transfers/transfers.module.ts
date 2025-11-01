import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { TransfersRepository } from './transfers.repository';
import { Transfer, TransferSchema } from './entities/transfer.entity';
import { AuditModule } from '../audit/audit.module';
import { ProviderSimulator } from './provider.simulator';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Transfer.name, schema: TransferSchema }]),
    AuditModule,
  ],
  controllers: [TransfersController],
  providers: [TransfersService, TransfersRepository, ProviderSimulator],
})
export class TransfersModule {}
