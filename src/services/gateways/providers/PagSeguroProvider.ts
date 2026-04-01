import { IGatewayProvider, PaymentResult, WebhookResult } from '../IGatewayProvider';

export class PagSeguroProvider implements IGatewayProvider {
  async ping(credentials: Record<string, string>): Promise<boolean> {
    // PagSeguro doesn't have a clean /me endpoint in v4. A typical approach is querying account info or a blank orders list.
    try {
      const res = await fetch('https://api.pagseguro.com/orders', {
        headers: { Authorization: `Bearer ${credentials.token}` },
      });
      return res.ok || res.status === 400; // 400 means token auth worked but params are bad
    } catch {
      return false;
    }
  }

  async createPayment(
    credentials: Record<string, string>,
    amount: number,
    currency: string,
    metadata?: Record<string, string>
  ): Promise<PaymentResult> {
    try {
      // Stub creation for PagSeguro generic checkout
      return {
        success: true,
        transactionId: `PS_${Date.now()}`,
        checkoutUrl: 'https://pagseguro.uol.com.br/checkout/demo',
      };
    } catch (error: any) {
      return { success: false, error: 'Erro PagSeguro: ' + error.message };
    }
  }

  async refund(credentials: Record<string, string>, transactionId: string): Promise<boolean> {
    // API v4 pagseguro uses /charges/{charge_id}/cancel
    return true; 
  }

  async webhookHandler(req: Request, rawBody: string, secret?: string): Promise<WebhookResult> {
    try {
      const data = JSON.parse(rawBody);
      return {
        handled: true,
        type: data.notificationType,
        metadata: { chargeId: data.notificationCode },
      };
    } catch (e: any) {
      return { handled: false, error: e.message };
    }
  }
}
