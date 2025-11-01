import mongoose from 'mongoose';
import { TransferStatus, TransferChannel } from './transfers/entities/transfer.entity';
import { AuditAction } from './audit/entities/audit-log.entity';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://babacd345:passer123@dexchange-transfers.vzmfpv8.mongodb.net/?appName=dexchange-transfers';

async function seed() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Nettoyer les collections
    const TransferModel = mongoose.model('Transfer', new mongoose.Schema({}, { strict: false }));
    const AuditLogModel = mongoose.model('AuditLog', new mongoose.Schema({}, { strict: false }));

    await TransferModel.deleteMany({});
    await AuditLogModel.deleteMany({});
    console.log('🧹 Collections nettoyées');

    // Créer des transferts de test
    const transfers = [];
    const statuses = [
      TransferStatus.PENDING,
      TransferStatus.SUCCESS,
      TransferStatus.FAILED,
      TransferStatus.CANCELED,
    ];
    const channels = [TransferChannel.WAVE, TransferChannel.OM];

    for (let i = 0; i < 20; i++) {
      const amount = Math.floor(Math.random() * 90000) + 10000; // 10k à 100k
      const fees = calculateFees(amount);
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];

      const transfer = {
        reference: generateReference(i),
        amount,
        currency: 'XOF',
        channel,
        recipient: {
          phone: `+22177${String(i).padStart(7, '0')}`,
          name: `Client ${i + 1}`,
        },
        metadata: {
          orderId: `ORD-${String(i).padStart(4, '0')}`,
        },
        fees,
        total: amount + fees,
        status,
        ...(status === TransferStatus.SUCCESS && {
          provider_ref: `PROV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        }),
        ...(status === TransferStatus.FAILED && {
          error_code: ['INSUFFICIENT_FUNDS', 'NETWORK_ERROR', 'TIMEOUT'][
            Math.floor(Math.random() * 3)
          ],
        }),
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Dans les 7 derniers jours
        updatedAt: new Date(),
      };

      transfers.push(transfer);
    }

    const insertedTransfers = await TransferModel.insertMany(transfers);
    console.log(`✅ ${insertedTransfers.length} transferts créés`);

    // Créer des logs d'audit
    const auditLogs = [];
    for (const transfer of insertedTransfers) {
      auditLogs.push({
        action: AuditAction.TRANSFER_CREATED,
        transferId: transfer._id.toString(),
        transferReference: transfer.reference,
        metadata: {
          amount: transfer.amount,
          fees: transfer.fees,
          total: transfer.total,
        },
        createdAt: transfer.createdAt,
      });

      if (transfer.status === TransferStatus.SUCCESS) {
        auditLogs.push({
          action: AuditAction.TRANSFER_PROCESSING,
          transferId: transfer._id.toString(),
          transferReference: transfer.reference,
          createdAt: new Date(transfer.createdAt.getTime() + 1000),
        });
        auditLogs.push({
          action: AuditAction.TRANSFER_SUCCESS,
          transferId: transfer._id.toString(),
          transferReference: transfer.reference,
          metadata: { provider_ref: transfer.provider_ref },
          createdAt: new Date(transfer.createdAt.getTime() + 3000),
        });
      } else if (transfer.status === TransferStatus.FAILED) {
        auditLogs.push({
          action: AuditAction.TRANSFER_PROCESSING,
          transferId: transfer._id.toString(),
          transferReference: transfer.reference,
          createdAt: new Date(transfer.createdAt.getTime() + 1000),
        });
        auditLogs.push({
          action: AuditAction.TRANSFER_FAILED,
          transferId: transfer._id.toString(),
          transferReference: transfer.reference,
          metadata: { error_code: transfer.error_code },
          createdAt: new Date(transfer.createdAt.getTime() + 3000),
        });
      } else if (transfer.status === TransferStatus.CANCELED) {
        auditLogs.push({
          action: AuditAction.TRANSFER_CANCELED,
          transferId: transfer._id.toString(),
          transferReference: transfer.reference,
          createdAt: new Date(transfer.createdAt.getTime() + 500),
        });
      }
    }

    await AuditLogModel.insertMany(auditLogs);
    console.log(`✅ ${auditLogs.length} logs d'audit créés`);

    console.log('\n🎉 Seed terminé avec succès !');
    console.log(`📊 Statistiques :`);
    console.log(
      `   - Transferts PENDING: ${transfers.filter((t) => t.status === TransferStatus.PENDING).length}`,
    );
    console.log(
      `   - Transferts SUCCESS: ${transfers.filter((t) => t.status === TransferStatus.SUCCESS).length}`,
    );
    console.log(
      `   - Transferts FAILED: ${transfers.filter((t) => t.status === TransferStatus.FAILED).length}`,
    );
    console.log(
      `   - Transferts CANCELED: ${transfers.filter((t) => t.status === TransferStatus.CANCELED).length}`,
    );

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
}

function calculateFees(amount: number): number {
  const feeRate = 0.008; // 0.8%
  let fees = Math.ceil(amount * feeRate);
  fees = Math.max(100, Math.min(1500, fees));
  return fees;
}

function generateReference(index: number): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const suffix = String(index).padStart(4, '0');
  return `TRF-${year}${month}${day}-${suffix}`;
}

seed();
