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
    if (!assinatura?.stripeSubId) {
      return NextResponse.json({ error: 'Sem assinatura ativa para cancelar.' }, { status: 400 });
    }

    // Cancela ao fim do período vigente (não corta acesso imediatamente)
    await stripe.subscriptions.update(assinatura.stripeSubId, { cancel_at_period_end: true });
    await prisma.assinatura.update({ where: { tenantId }, data: { status: 'canceling' } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[BILLING_CANCELAR_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Erro ao cancelar assinatura.' }, { status: 500 });
  }
}
