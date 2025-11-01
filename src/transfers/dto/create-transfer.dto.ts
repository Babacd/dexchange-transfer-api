import {
  IsNumber,
  IsString,
  IsObject,
  IsOptional,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TransferChannel } from '../entities/transfer.entity';

class RecipientDto {
  @ApiProperty({ example: '+221770000000' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name: string;
}

export class CreateTransferDto {
  @ApiProperty({ example: 12500, description: 'Montant en XOF' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'XOF' })
  @IsString()
  currency: string;

  @ApiProperty({ enum: TransferChannel, example: 'WAVE' })
  @IsEnum(TransferChannel)
  channel: TransferChannel;

  @ApiProperty({ type: RecipientDto })
  @ValidateNested()
  @Type(() => RecipientDto)
  recipient: RecipientDto;

  @ApiProperty({ example: { orderId: 'ABC-123' }, required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
