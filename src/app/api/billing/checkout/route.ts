import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

const PLANS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
};

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  try {
    const { tenantId, plano, email } = await request.json();
    if (!tenantId || !plano || !PLANS[plano]) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    // Buscar ou criar customer no Stripe
    let assinatura = await prisma.assinatura.findUnique({ where: { tenantId } });
    let customerId = assinatura?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { tenantId } });
      customerId = customer.id;
      if (!assinatura) {
        await prisma.assinatura.create({ data: { tenantId, stripeCustomerId: customerId } });
      } else {
        await prisma.assinatura.update({ where: { tenantId }, data: { stripeCustomerId: customerId } });
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://somar-clinicas-consutorios.vercel.app';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PLANS[plano], quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=true`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
      metadata: { tenantId, plano },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[BILLING_CHECKOUT_ERROR]', error);
    return NextResponse.json({ error: 'Erro ao criar sessão de pagamento.' }, { status: 500 });
  }
}
