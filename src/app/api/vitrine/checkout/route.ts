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
    pacienteId?: string;
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

  // Verificar desconto de assinante (campo pacienteId opcional — sem ele, sem desconto)
  let percentualDesconto = 0;
  let planoNomeDesconto: string | null = null;
  if (body.pacienteId) {
    const agora = new Date();
    const assinaturaAtiva = await prisma.assinaturaCliente.findFirst({
      where: {
        pacienteId: body.pacienteId,
        tenantId: clinica.tenantId,
        status: 'ativo',
        periodoInicio: { lte: agora },
        OR: [{ periodoFim: null }, { periodoFim: { gte: agora } }],
      },
      include: { plano: { select: { descontoProdutos: true, nome: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (assinaturaAtiva?.plano) {
      const desconto = (assinaturaAtiva.plano as { descontoProdutos?: number | null }).descontoProdutos ?? 0;
      if (desconto > 0) {
        percentualDesconto = desconto;
        planoNomeDesconto  = (assinaturaAtiva.plano as { nome: string }).nome;
      }
    }
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

  const fatorDesconto = 1 - percentualDesconto / 100;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = pedidoItens.map(item => {
    const nomeProduto = item.produto?.nome || item.combo?.nome || 'Produto';
    const precoBase   = item.precoUnitario * fatorDesconto;
    const precoUnitario = Math.round(precoBase * 100); // centavos

    return {
      quantity: item.quantidade,
      price_data: {
        currency: 'brl',
        unit_amount: precoUnitario,
        product_data: {
          name: percentualDesconto > 0
            ? `${nomeProduto} (${percentualDesconto}% OFF plano)`
            : nomeProduto,
        },
      },
    };
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synka.somar.ia.br';

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

    const totalOriginal   = pedidoItens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);
    const totalFinal      = pedidoItens.reduce((s, i) => s + i.precoUnitario * fatorDesconto * i.quantidade, 0);
    const valorDescontado = Math.round((totalOriginal - totalFinal) * 100) / 100;

    return NextResponse.json({
      url:       session.url,
      sessionId: session.id,
      ...(percentualDesconto > 0 && {
        descontoAplicado: {
          percentual:     percentualDesconto,
          valorDescontado,
          planoNome:      planoNomeDesconto,
        },
      }),
    });
  } catch (err) {
    console.error('[vitrine/checkout POST]', err);
    return NextResponse.json({ error: 'Erro ao criar sessão de pagamento' }, { status: 500 });
  }
}
