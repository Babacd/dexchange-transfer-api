import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { QueryTransferDto } from './dto/query-transfer.dto';
import { TransfersRepository } from './transfers.repository';
import { Transfer, TransferStatus } from './entities/transfer.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { ProviderSimulator } from './provider.simulator';

@Injectable()
export class TransfersService {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly auditService: AuditService,
    private readonly providerSimulator: ProviderSimulator,
  ) {}

  async create(createTransferDto: CreateTransferDto): Promise<Transfer> {
    const { amount, currency, channel, recipient, metadata } = createTransferDto;

    // Calcul des frais
    const fees = this.calculateFees(amount);
    const total = amount + fees;

    // Génération de la référence unique
    const reference = this.generateReference();

    // Création du transfert
    const transfer = await this.transfersRepository.create({
      reference,
      amount,
      currency,
      channel,
      recipient,
      metadata,
      fees,
      total,
      status: TransferStatus.PENDING,
    });

    // Log d'audit
    await this.auditService.log(
      AuditAction.TRANSFER_CREATED,
      transfer._id.toString(),
      transfer.reference,
      { amount, fees, total },
    );

    return transfer;
  }

  async findAll(query: QueryTransferDto) {
    return this.transfersRepository.findWithPagination(query);
  }

  async findOne(id: string): Promise<Transfer> {
    const transfer = await this.transfersRepository.findById(id);
    
    if (!transfer) {
      throw new NotFoundException(`Transfer avec l'id ${id} introuvable`);
    }

    return transfer;
  }

  async process(id: string): Promise<Transfer> {
    const transfer = await this.findOne(id);

    // Vérifier si le statut est final
    if (this.isFinalStatus(transfer.status)) {
      throw new ConflictException(
        `Impossible de traiter un transfert avec le statut ${transfer.status}`,
      );
    }

    // Mettre à jour le statut à PROCESSING
    await this.transfersRepository.update(id, { status: TransferStatus.PROCESSING });
    await this.auditService.log(
      AuditAction.TRANSFER_PROCESSING,
      transfer._id.toString(),
      transfer.reference,
    );

    // Simuler le traitement
    const result = await this.providerSimulator.processTransfer(id, transfer.amount);

    let updatedTransfer: Transfer;

    if (result.success) {
      // Succès
      updatedTransfer = await this.transfersRepository.update(id, {
        status: TransferStatus.SUCCESS,
        provider_ref: result.provider_ref,
      });

      await this.auditService.log(
        AuditAction.TRANSFER_SUCCESS,
        transfer._id.toString(),
        transfer.reference,
        { provider_ref: result.provider_ref },
      );
    } else {
      // Échec
      updatedTransfer = await this.transfersRepository.update(id, {
        status: TransferStatus.FAILED,
        error_code: result.error_code,
      });

      await this.auditService.log(
        AuditAction.TRANSFER_FAILED,
        transfer._id.toString(),
        transfer.reference,
        { error_code: result.error_code },
      );
    }

    return updatedTransfer;
  }

  async cancel(id: string): Promise<Transfer> {
    const transfer = await this.findOne(id);

    // Seul PENDING peut être annulé
    if (transfer.status !== TransferStatus.PENDING) {
      throw new ConflictException(
        `Impossible d'annuler un transfert avec le statut ${transfer.status}. Seuls les transferts PENDING peuvent être annulés.`,
      );
    }

    const updatedTransfer = await this.transfersRepository.update(id, {
      status: TransferStatus.CANCELED,
    });

    await this.auditService.log(
      AuditAction.TRANSFER_CANCELED,
      transfer._id.toString(),
      transfer.reference,
    );

    return updatedTransfer;
  }

  /**
   * Calcul des frais : 0.8% arrondi au supérieur
   * min = 100, max = 1500
   */
  calculateFees(amount: number): number {
    const feeRate = 0.008; // 0.8%
    let fees = Math.ceil(amount * feeRate);

    // Appliquer min et max
    fees = Math.max(100, Math.min(1500, fees));

    return fees;
  }

  /**
   * Génération de référence unique : TRF-20250101-XXXX
   */
  private generateReference(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `TRF-${year}${month}${day}-${random}`;
  }

  /**
   * Vérifie si un statut est final
   */
  private isFinalStatus(status: TransferStatus): boolean {
    return [
      TransferStatus.SUCCESS,
      TransferStatus.FAILED,
      TransferStatus.CANCELED,
    ].includes(status);
  }
}
