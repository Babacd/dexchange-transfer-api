import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validApiKey = process.env.API_KEY || 'DEXCHANGE-API-KEY-2025-TEST-SECURE';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];

    // Pas de clé → 401
    if (!apiKey) {
      throw new UnauthorizedException('API Key manquante');
    }

    // Clé invalide → 403
    if (apiKey !== this.validApiKey) {
      throw new ForbiddenException('API Key invalide');
    }

    return true;
  }
}
