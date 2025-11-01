import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { QueryTransferDto } from './dto/query-transfer.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('transfers')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau transfert' })
  @ApiResponse({
    status: 201,
    description: 'Transfert créé avec succès',
    schema: {
      example: {
        reference: 'TRF-20250101-A3B2',
        amount: 12500,
        currency: 'XOF',
        channel: 'WAVE',
        recipient: { phone: '+221770000000', name: 'Jane Doe' },
        metadata: { orderId: 'ABC-123' },
        fees: 100,
        total: 12600,
        status: 'PENDING',
        _id: '507f1f77bcf86cd799439011',
        createdAt: '2025-01-01T12:00:00.000Z',
        updatedAt: '2025-01-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'API Key manquante' })
  @ApiResponse({ status: 403, description: 'API Key invalide' })
  create(@Body() createTransferDto: CreateTransferDto) {
    return this.transfersService.create(createTransferDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des transferts avec pagination' })
  @ApiResponse({
    status: 200,
    description: 'Liste des transferts',
    schema: {
      example: {
        items: [
          {
            reference: 'TRF-20250101-A3B2',
            amount: 12500,
            currency: 'XOF',
            channel: 'WAVE',
            recipient: { phone: '+221770000000', name: 'Jane Doe' },
            fees: 100,
            total: 12600,
            status: 'PENDING',
            _id: '507f1f77bcf86cd799439011',
          },
        ],
        nextCursor: '507f1f77bcf86cd799439011',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'API Key manquante' })
  @ApiResponse({ status: 403, description: 'API Key invalide' })
  findAll(@Query() query: QueryTransferDto) {
    return this.transfersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un transfert par son ID' })
  @ApiParam({ name: 'id', description: 'ID du transfert' })
  @ApiResponse({ status: 200, description: 'Transfert trouvé' })
  @ApiResponse({ status: 404, description: 'Transfert introuvable' })
  @ApiResponse({ status: 401, description: 'API Key manquante' })
  @ApiResponse({ status: 403, description: 'API Key invalide' })
  findOne(@Param('id') id: string) {
    return this.transfersService.findOne(id);
  }

  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Simuler le traitement d'un transfert" })
  @ApiParam({ name: 'id', description: 'ID du transfert' })
  @ApiResponse({
    status: 200,
    description: 'Transfert traité avec succès ou échec',
    schema: {
      example: {
        reference: 'TRF-20250101-A3B2',
        amount: 12500,
        status: 'SUCCESS',
        provider_ref: 'PROV-1704110400000-ABC123',
        _id: '507f1f77bcf86cd799439011',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transfert introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Impossible de traiter un transfert avec un statut final',
  })
  @ApiResponse({ status: 401, description: 'API Key manquante' })
  @ApiResponse({ status: 403, description: 'API Key invalide' })
  process(@Param('id') id: string) {
    return this.transfersService.process(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler un transfert' })
  @ApiParam({ name: 'id', description: 'ID du transfert' })
  @ApiResponse({
    status: 200,
    description: 'Transfert annulé avec succès',
    schema: {
      example: {
        reference: 'TRF-20250101-A3B2',
        amount: 12500,
        status: 'CANCELED',
        _id: '507f1f77bcf86cd799439011',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transfert introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Seuls les transferts PENDING peuvent être annulés',
  })
  @ApiResponse({ status: 401, description: 'API Key manquante' })
  @ApiResponse({ status: 403, description: 'API Key invalide' })
  cancel(@Param('id') id: string) {
    return this.transfersService.cancel(id);
  }
}
