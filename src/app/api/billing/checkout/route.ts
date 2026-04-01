import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTenantPrisma } from '@/lib/prisma';
import { getPlanoInfo, getUpsells } from '@/lib/planos-synka';

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any });
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID não fornecido na sessão.' }, { status: 401 });
    }

    const { plano, upsells = [] } = await request.json();
    const planoDetails = getPlanoInfo(plano);
    const addons = getUpsells(upsells);

    if (!plano || !planoDetails || !planoDetails.stripePriceId || planoDetails.id === 'trial') {
      return NextResponse.json({ error: 'Plano inválido ou inexistente.' }, { status: 400 });
    }

    // Gerando o Array Dinâmico de Itens p/ o Carrinho do Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: planoDetails.stripePriceId, quantity: 1 }
    ];

    addons.forEach(addon => {
      if (addon.stripePriceId) {
        lineItems.push({ price: addon.stripePriceId, quantity: 1 });
      }
    });

    const prisma = getTenantPrisma();

    // Buscar Clínica para pegar infos
    const clinica = await prisma.clinica.findUnique({ where: { tenantId } });
    if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 });

    const email = `admin@${clinica.slug}.synka.io`;

    // Buscar ou criar customer no Stripe
    let assinatura = await prisma.assinatura.findUnique({ where: { tenantId } });
    let customerId = assinatura?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { tenantId } });
      customerId = customer.id;
      if (!assinatura) {
        await prisma.assinatura.create({ data: { tenantId, stripeCustomerId: customerId, status: 'trial' } });
      } else {
        await prisma.assinatura.update({ where: { tenantId }, data: { stripeCustomerId: customerId } });
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://somar-clinicas-consutorios.vercel.app';
    const metadataUpsells = addons.map(a => a.id).join(',');

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',    // Continua sendo uma assinatura mesmo que existam itens únicos mesclados ("setup")
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${appUrl}/dashboard/finance?tab=integracoes&success=true`,
      cancel_url: `${appUrl}/planos?canceled=true`,
      metadata: { 
        tenantId, 
        plano: planoDetails.id,
        upsells: metadataUpsells 
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[BILLING_CHECKOUT_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar sessão de pagamento.' }, { status: 500 });
  }
}
