import { Test, TestingModule } from '@nestjs/testing';
import { TransfersService } from './transfers.service';
import { TransfersRepository } from './transfers.repository';
import { AuditService } from '../audit/audit.service';
import { ProviderSimulator } from './provider.simulator';
import { TransferStatus } from './entities/transfer.entity';
import { ConflictException } from '@nestjs/common';

describe('TransfersService', () => {
  let service: TransfersService;
  let repository: TransfersRepository;
  let auditService: AuditService;
  let providerSimulator: ProviderSimulator;

  const mockRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockProviderSimulator = {
    processTransfer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransfersService,
        {
          provide: TransfersRepository,
          useValue: mockRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: ProviderSimulator,
          useValue: mockProviderSimulator,
        },
      ],
    }).compile();

    service = module.get<TransfersService>(TransfersService);
    repository = module.get<TransfersRepository>(TransfersRepository);
    auditService = module.get<AuditService>(AuditService);
    providerSimulator = module.get<ProviderSimulator>(ProviderSimulator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateFees', () => {
    it('devrait calculer les frais à 0.8% arrondi au supérieur', () => {
      // Test avec différents montants
      expect(service.calculateFees(10000)).toBe(100); // 80 -> min 100
      expect(service.calculateFees(12500)).toBe(100); // 100
      expect(service.calculateFees(15000)).toBe(120); // 120
      expect(service.calculateFees(50000)).toBe(400); // 400
      expect(service.calculateFees(100000)).toBe(800); // 800
      expect(service.calculateFees(200000)).toBe(1500); // 1600 -> max 1500
      expect(service.calculateFees(500000)).toBe(1500); // 4000 -> max 1500
    });

    it('devrait appliquer le minimum de 100', () => {
      const fees = service.calculateFees(1000); // 8 -> 100
      expect(fees).toBe(100);
    });

    it('devrait appliquer le maximum de 1500', () => {
      const fees = service.calculateFees(300000); // 2400 -> 1500
      expect(fees).toBe(1500);
    });

    it('devrait arrondir au supérieur', () => {
      const fees = service.calculateFees(12501); // 100.008 -> 101
      expect(fees).toBe(101);
    });
  });

  describe('Transitions d\'état', () => {
    it('devrait passer de PENDING à PROCESSING puis SUCCESS', async () => {
      const mockTransfer: any = {
        _id: '123',
        reference: 'TRF-20250101-TEST',
        amount: 10000,
        status: TransferStatus.PENDING,
      };

      mockRepository.findById.mockResolvedValue(mockTransfer);
      mockRepository.update.mockResolvedValueOnce({
        ...mockTransfer,
        status: TransferStatus.PROCESSING,
      });
      mockProviderSimulator.processTransfer.mockResolvedValue({
        success: true,
        provider_ref: 'PROV-TEST-123',
      });
      mockRepository.update.mockResolvedValueOnce({
        ...mockTransfer,
        status: TransferStatus.SUCCESS,
        provider_ref: 'PROV-TEST-123',
      });

      const result = await service.process('123');

      expect(mockRepository.update).toHaveBeenCalledWith('123', {
        status: TransferStatus.PROCESSING,
      });
      expect(mockProviderSimulator.processTransfer).toHaveBeenCalledWith('123', 10000);
      expect(mockRepository.update).toHaveBeenCalledWith('123', {
        status: TransferStatus.SUCCESS,
        provider_ref: 'PROV-TEST-123',
      });
      expect(result.status).toBe(TransferStatus.SUCCESS);
      expect(result.provider_ref).toBe('PROV-TEST-123');
    });

    it('devrait passer de PENDING à PROCESSING puis FAILED', async () => {
      const mockTransfer: any = {
        _id: '123',
        reference: 'TRF-20250101-TEST',
        amount: 10000,
        status: TransferStatus.PENDING,
      };

      mockRepository.findById.mockResolvedValue(mockTransfer);
      mockRepository.update.mockResolvedValueOnce({
        ...mockTransfer,
        status: TransferStatus.PROCESSING,
      });
      mockProviderSimulator.processTransfer.mockResolvedValue({
        success: false,
        error_code: 'NETWORK_ERROR',
      });
      mockRepository.update.mockResolvedValueOnce({
        ...mockTransfer,
        status: TransferStatus.FAILED,
        error_code: 'NETWORK_ERROR',
      });

      const result = await service.process('123');

      expect(result.status).toBe(TransferStatus.FAILED);
      expect(result.error_code).toBe('NETWORK_ERROR');
    });

    it('ne devrait pas traiter un transfert avec statut final (SUCCESS)', async () => {
      const mockTransfer: any = {
        _id: '123',
        reference: 'TRF-20250101-TEST',
        amount: 10000,
        status: TransferStatus.SUCCESS,
      };

      mockRepository.findById.mockResolvedValue(mockTransfer);

      await expect(service.process('123')).rejects.toThrow(ConflictException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('ne devrait pas traiter un transfert avec statut final (FAILED)', async () => {
      const mockTransfer: any = {
        _id: '123',
        reference: 'TRF-20250101-TEST',
        amount: 10000,
        status: TransferStatus.FAILED,
      };

      mockRepository.findById.mockResolvedValue(mockTransfer);

      await expect(service.process('123')).rejects.toThrow(ConflictException);
    });

    it('ne devrait pas traiter un transfert avec statut final (CANCELED)', async () => {
      const mockTransfer: any = {
        _id: '123',
        reference: 'TRF-20250101-TEST',
        amount: 10000,
        status: TransferStatus.CANCELED,
      };

      mockRepository.findById.mockResolvedValue(mockTransfer);

      await expect(service.process('123')).rejects.toThrow(ConflictException);
    });

    it('devrait pouvoir annuler un transfert PENDING', async () => {
      const mockTransfer: any = {
        _id: '123',
        reference: 'TRF-20250101-TEST',
        amount: 10000,
        status: TransferStatus.PENDING,
      };

      mockRepository.findById.mockResolvedValue(mockTransfer);
      mockRepository.update.mockResolvedValue({
        ...mockTransfer,
        status: TransferStatus.CANCELED,
      });

      const result = await service.cancel('123');

      expect(mockRepository.update).toHaveBeenCalledWith('123', {
        status: TransferStatus.CANCELED,
      });
      expect(result.status).toBe(TransferStatus.CANCELED);
    });

    it('ne devrait pas pouvoir annuler un transfert non PENDING', async () => {
      const mockTransfer: any = {
        _id: '123',
        reference: 'TRF-20250101-TEST',
        amount: 10000,
        status: TransferStatus.PROCESSING,
      };

      mockRepository.findById.mockResolvedValue(mockTransfer);

      await expect(service.cancel('123')).rejects.toThrow(ConflictException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });
});
