import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransfersModule } from './transfers/transfers.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/dexchange-transfers',
    ),
    TransfersModule,
    AuditModule,
  ],
})
export class AppModule {}
