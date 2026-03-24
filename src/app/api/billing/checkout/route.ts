import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';
import { getTenantPrisma } from '@/lib/prisma';

const PLANS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  max: process.env.STRIPE_PRICE_MAX || '',
};

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any });
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);
    const { plano } = await request.json();

    if (!plano || !PLANS[plano]) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    // Buscar Clínica para pegar email admin
    const clinica = await prisma.clinica.findUnique({ where: { tenantId } });
    if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 });

    const email = clinica.adminPhone + "@synka.io"; // Fallback email pattern or use a real field if exists

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
  } catch (error: any) {
    console.error('[BILLING_CHECKOUT_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar sessão de pagamento.' }, { status: 500 });
  }
}
