import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TransfersModule } from './transfers/transfers.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb+srv://babacd345:passer123@dexchange-transfers.vzmfpv8.mongodb.net/?appName=dexchange-transfers',
    ),
    TransfersModule,
    AuditModule,
  ],
})
export class AppModule {}
