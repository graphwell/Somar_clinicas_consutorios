import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/vitrine/checkout
 * Rota PÚBLICA — chamada pelo fluxo de agendamento.
 * Cria uma Stripe Checkout Session (mode: payment) com price_data inline.
 *
 * Body: {
 *   slug: string            — slug da clínica (para resolver tenantId)
 *   agendamentoId?: string
 *   items: Array<{ pedidoItemId: string }>  — IDs dos PedidoItem já criados
 *   successUrl: string
 *   cancelUrl: string
 * }
 */
export async function POST(req: NextRequest) {
  let body: {
    slug?: string;
    agendamentoId?: string;
    items?: Array<{ pedidoItemId: string }>;
    successUrl?: string;
    cancelUrl?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }

  if (!body.slug || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'slug e items[] obrigatórios' }, { status: 400 });
  }

  const clinica = await prisma.clinica.findUnique({
    where: { slug: body.slug },
    select: { tenantId: true, nome: true, aceitaPagamento: true },
  });
  if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
  if (!clinica.aceitaPagamento) {
    return NextResponse.json({ error: 'Pagamento online não habilitado para esta clínica' }, { status: 403 });
  }

  // Buscar os PedidoItens para montar os line items
  const pedidoItens = await prisma.pedidoItem.findMany({
    where: {
      id: { in: body.items.map(i => i.pedidoItemId) },
      tenantId: clinica.tenantId,
      status: 'reserved',
    },
    include: {
      produto: { select: { nome: true, preco: true } },
      combo: { select: { nome: true, preco: true } },
    },
  });

  if (pedidoItens.length === 0) {
    return NextResponse.json({ error: 'Nenhum item válido para checkout' }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-06-20' as Parameters<typeof Stripe>[1]['apiVersion'],
  });

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = pedidoItens.map(item => {
    const nomeProduto = item.produto?.nome || item.combo?.nome || 'Produto';
    const precoUnitario = Math.round(item.precoUnitario * 100); // centavos

    return {
      quantity: item.quantidade,
      price_data: {
        currency: 'brl',
        unit_amount: precoUnitario,
        product_data: { name: nomeProduto },
      },
    };
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: body.successUrl || `${appUrl}/agendar/${body.slug}?vitrine_success=true`,
      cancel_url: body.cancelUrl || `${appUrl}/agendar/${body.slug}`,
      metadata: {
        tenantId: clinica.tenantId,
        agendamentoId: body.agendamentoId || '',
        pedidoItemIds: pedidoItens.map(i => i.id).join(','),
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[vitrine/checkout POST]', err);
    return NextResponse.json({ error: 'Erro ao criar sessão de pagamento' }, { status: 500 });
  }
}
