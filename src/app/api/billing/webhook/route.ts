import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
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
      const meta = session.metadata as Record<string, string> | null ?? {};
      const { tenantId, plano, pedidoItemIds } = meta as {
        tenantId?: string; plano?: string; pedidoItemIds?: string;
      };

      // ── Vitrine: pagamento de produtos ──
      if (pedidoItemIds && tenantId && session.mode === 'payment') {
        const ids = pedidoItemIds.split(',').filter(Boolean);
        if (ids.length > 0) {
          await prisma.pedidoItem.updateMany({
            where: { id: { in: ids }, tenantId },
            data: { status: 'paid_online', paymentIntentId: session.payment_intent as string || null },
          });
        }
        break;
      }

      // ── Assinatura Synka ──
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (tenantId && subId && plano) {
        await prisma.assinatura.update({
          where: { tenantId },
          data: { stripeSubId: subId, plano, status: 'active' },
        });

        // Módulo 3: Disparar preparação da migração para produção
        try {
          await WhatsAppMigration.prepareMigration(tenantId);
        } catch (migError) {
          console.error('[STRIPE_WEBHOOK] Erro ao disparar migração:', migError);
        }
      }
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as any;
      const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const tenantId = (sub as any).metadata?.tenantId;

        await prisma.assinatura.updateMany({
          where: { stripeSubId: sub.id },
          data: {
            status: 'active',
            proximoVencimento: new Date((sub as any).current_period_end * 1000),
          },
        });

        // Módulo 3: Garantir que se for o primeiro pagamento após trial, a migração ocorra
        if (tenantId) {
          try {
            await WhatsAppMigration.prepareMigration(tenantId);
          } catch (migError) {
            console.error('[STRIPE_WEBHOOK] Erro ao disparar migração (invoice):', migError);
          }
        }
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
