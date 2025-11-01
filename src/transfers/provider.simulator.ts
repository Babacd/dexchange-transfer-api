import { Injectable } from '@nestjs/common';

interface ProcessResult {
  success: boolean;
  provider_ref?: string;
  error_code?: string;
}

@Injectable()
export class ProviderSimulator {
  /**
   * Simule le traitement d'un transfert
   * 70% de réussite, 30% d'échec
   */
  async processTransfer(transferId: string, amount: number): Promise<ProcessResult> {
    // Simulation d'un délai de traitement (2-3 secondes)
    await this.delay(2000 + Math.random() * 1000);

    const random = Math.random();
    
    // 70% de réussite
    if (random < 0.7) {
      return {
        success: true,
        provider_ref: this.generateProviderRef(),
      };
    }
    
    // 30% d'échec
    return {
      success: false,
      error_code: this.getRandomErrorCode(),
    };
  }

  private generateProviderRef(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PROV-${timestamp}-${random}`;
  }

  private getRandomErrorCode(): string {
    const errorCodes = [
      'INSUFFICIENT_FUNDS',
      'INVALID_RECIPIENT',
      'NETWORK_ERROR',
      'TIMEOUT',
      'PROVIDER_UNAVAILABLE',
    ];
    
    const randomIndex = Math.floor(Math.random() * errorCodes.length);
    return errorCodes[randomIndex];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
