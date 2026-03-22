import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature') || '';
  const rawBody = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[STRIPE_WEBHOOK] Assinatura inválida:', err);
    return new NextResponse('Webhook Signature Error', { status: 400 });
  }

  const getMetadata = (obj: any) => obj?.metadata as { tenantId: string; plano: string };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { tenantId, plano } = getMetadata(session);
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (tenantId && subId) {
        await prisma.assinatura.update({
          where: { tenantId },
          data: { stripeSubId: subId, plano, status: 'active' },
        });
      }
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as any;
      const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        await prisma.assinatura.updateMany({
          where: { stripeSubId: sub.id },
          data: {
            status: 'active',
            proximoVencimento: new Date((sub as any).current_period_end * 1000),
          },
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.assinatura.updateMany({
        where: { stripeSubId: sub.id },
        data: { status: 'canceled' },
      });
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as any;
      const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      if (subId) {
        await prisma.assinatura.updateMany({ where: { stripeSubId: subId }, data: { status: 'past_due' } });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
