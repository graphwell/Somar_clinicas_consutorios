import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTenantPrisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  const prisma = getTenantPrisma();
  const planos = await prisma.planoAssinatura.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { assinantes: { where: { status: 'ativo' } } } },
    },
  });

  return NextResponse.json(planos);
}

export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      nome, descricao, valor, periodicidade = 'mensal',
      servicos = [], agendamentoPrioritario = false,
      descontoProdutos = null, descontoServicosExtras = null,
    } = body;

    if (!nome || !valor) return NextResponse.json({ error: 'Nome e valor obrigatórios.' }, { status: 400 });

    const prisma = getTenantPrisma();
    let stripePriceId: string | null = null;

    // Criar price no Stripe se configurado
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' as any });
        const interval = periodicidade === 'anual' ? 'year' : 'month';
        const price = await stripe.prices.create({
          unit_amount: Math.round(valor * 100),
          currency: 'brl',
          recurring: { interval },
          product_data: { name: `${nome} — Assinatura Cliente` },
        });
        stripePriceId = price.id;
      } catch {
        // Stripe não configurado ou erro — continuar sem preço
      }
    }

    const plano = await prisma.planoAssinatura.create({
      data: {
        tenantId,
        empresaId: tenantId,
        nome,
        descricao: descricao ?? null,
        valor,
        periodicidade,
        servicos,
        ativo: true,
        agendamentoPrioritario,
        descontoProdutos: descontoProdutos ?? null,
        descontoServicosExtras: descontoServicosExtras ?? null,
        stripePriceId,
      },
    });

    return NextResponse.json(plano, { status: 201 });
  } catch (error: any) {
    console.error('[SUBSCRIPTIONS_PLANOS_POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
