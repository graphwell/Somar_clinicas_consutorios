import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTenantPrisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any });
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID não fornecido na sessão.' }, { status: 401 });
    }

    const prisma = getTenantPrisma();
    const assinatura = await prisma.assinatura.findUnique({ where: { tenantId } });
    if (!assinatura?.stripeCustomerId) {
      return NextResponse.json({ error: 'Sem assinatura ativa para gerenciar.' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synka.somar.ia.br';
    const session = await stripe.billingPortal.sessions.create({
      customer: assinatura.stripeCustomerId,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[BILLING_PORTAL_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Erro ao abrir portal de pagamento.' }, { status: 500 });
  }
}
