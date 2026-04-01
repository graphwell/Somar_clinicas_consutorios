import { IGatewayProvider, PaymentResult, WebhookResult } from '../IGatewayProvider';

export class MercadoPagoProvider implements IGatewayProvider {
  async ping(credentials: Record<string, string>): Promise<boolean> {
    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });
      return response.ok;
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
      // Criação de preferência de Checkout Pro ou PIX explícito
      const body = {
        items: [
          { title: 'Pagamento Serviço', quantity: 1, unit_price: amount, currency_id: currency.toUpperCase() }
        ],
        metadata
      };

      const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credentials.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro MercadoPago');

      return {
        success: true,
        transactionId: data.id,
        checkoutUrl: data.init_point,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async refund(credentials: Record<string, string>, transactionId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${transactionId}/refunds`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async webhookHandler(req: Request, rawBody: string, secret?: string): Promise<WebhookResult> {
    // MercadoPago webhooks consist in 'data.id' and 'type'.
    // Typically fetched to validate real status.
    try {
      const json = JSON.parse(rawBody);
      return {
        handled: true,
        type: json.type || json.action,
        metadata: { id: json.data?.id },
      };
    } catch (e: any) {
      return { handled: false, error: e.message };
    }
  }
}
