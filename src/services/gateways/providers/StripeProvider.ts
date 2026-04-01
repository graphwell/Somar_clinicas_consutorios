import Stripe from 'stripe';
import { IGatewayProvider, PaymentResult, WebhookResult } from '../IGatewayProvider';

export class StripeProvider implements IGatewayProvider {
  private getStripe(secretKey: string): Stripe {
    return new Stripe(secretKey, {
      apiVersion: '2024-06-20' as any,
    });
  }

  async ping(credentials: Record<string, string>): Promise<boolean> {
    try {
      const stripe = this.getStripe(credentials.secretKey);
      await stripe.balance.retrieve();
      return true;
    } catch (e) {
      console.error('[STRIPE_PING_ERROR]', e);
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
      const stripe = this.getStripe(credentials.secretKey);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'boleto'],
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: 'Pagamento Serviço' },
            unit_amount: Math.round(amount * 100), // Em centavos
          },
          quantity: 1,
        }],
        mode: 'payment',
        metadata: metadata || {},
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      });

      return {
        success: true,
        transactionId: session.id,
        checkoutUrl: session.url as string,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async refund(credentials: Record<string, string>, transactionId: string): Promise<boolean> {
    try {
      const stripe = this.getStripe(credentials.secretKey);
      await stripe.refunds.create({
        payment_intent: transactionId,
      });
      return true;
    } catch (error) {
      console.error('[STRIPE_REFUND_ERROR]', error);
      return false;
    }
  }

  async webhookHandler(req: Request, rawBody: string, secret?: string): Promise<WebhookResult> {
    const sig = req.headers.get('stripe-signature') || '';
    if (!secret || !sig) {
      return { handled: false, error: 'Signature and webhookSecret required.' };
    }

    try {
      // In a real approach, you might need internal stripe credentials if the webhook uses environment secrets or dynamic ones.
      // Usually webhook triggers require the 'secret' argument to be the webhook secret key configured globally or per user.
      const stripe = new Stripe('noop'); 
      const event = stripe.webhooks.constructEvent(rawBody, sig, secret);

      return {
        handled: true,
        type: event.type,
        metadata: (event.data.object as any).metadata || {},
      };
    } catch (error: any) {
      return { handled: false, error: error.message };
    }
  }
}
