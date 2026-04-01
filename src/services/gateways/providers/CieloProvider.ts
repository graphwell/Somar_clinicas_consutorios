import { IGatewayProvider, PaymentResult, WebhookResult } from '../IGatewayProvider';

export class CieloProvider implements IGatewayProvider {
  private getHeaders(credentials: Record<string, string>) {
    return {
      'MerchantId': credentials.merchantId,
      'MerchantKey': credentials.merchantKey,
      'Content-Type': 'application/json',
    };
  }

  async ping(credentials: Record<string, string>): Promise<boolean> {
    try {
      // Stub check using transaction GET endpoint (would 404 on UUID but 401 on bad keys)
      const res = await fetch('https://api.cieloecommerce.cielo.com.br/1/sales/00000000-0000-0000-0000-000000000000', {
        headers: this.getHeaders(credentials),
      });
      return res.status !== 401 && res.status !== 403;
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
      return {
        success: true,
        transactionId: `C_${Date.now()}`,
        checkoutUrl: 'cielo-checkout-url-stub',
      };
    } catch (error: any) {
      return { success: false, error: 'Erro Cielo: ' + error.message };
    }
  }

  async refund(credentials: Record<string, string>, transactionId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://api.cieloecommerce.cielo.com.br/1/sales/${transactionId}/void`, {
        method: 'PUT',
        headers: this.getHeaders(credentials),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async webhookHandler(req: Request, rawBody: string, secret?: string): Promise<WebhookResult> {
    try {
      const data = JSON.parse(rawBody);
      return {
        handled: true,
        type: data.Payment?.Status ? `status_${data.Payment.Status}` : 'unknown',
        metadata: { paymentId: data.Payment?.PaymentId },
      };
    } catch (e: any) {
      return { handled: false, error: e.message };
    }
  }
}
