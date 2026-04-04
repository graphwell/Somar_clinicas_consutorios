import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTenantPrisma } from '@/lib/prisma';
import { PLANOS_TEMPLATES } from '@/lib/planos-templates';

export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  try {
    const { templateTipo } = await request.json();
    const template = PLANOS_TEMPLATES[templateTipo];
    if (!template) {
      return NextResponse.json({ error: 'Template inválido.' }, { status: 400 });
    }

    const prisma = getTenantPrisma();

    // Buscar serviços ativos da clínica
    const servicos = await prisma.servico.findMany({
      where: { tenantId, ativo: true },
      select: { id: true, nome: true },
    });

    // Montar servicos[] com os serviços reais
    const qtdPorTemplate: Record<string, number | null> = {
      basico: 2, premium: 4, vip: null,
    };
    const qtd = qtdPorTemplate[templateTipo];
    const servicosPlano = servicos.map(s => ({
      servicoId:    s.id,
      nomeServico:  s.nome,
      tipo:         qtd === null ? 'ilimitado' : 'limitado',
      quantidade:   qtd,
    }));

    let stripePriceId: string | null = null;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' as any });
        const interval = template.periodicidade === 'anual' ? 'year' : 'month';
        const price = await stripe.prices.create({
          unit_amount: Math.round(template.valor * 100),
          currency: 'brl',
          recurring: { interval },
          product_data: { name: `${template.nome} — Assinatura Cliente` },
        });
        stripePriceId = price.id;
      } catch { /* sem Stripe */ }
    }

    const plano = await prisma.planoAssinatura.create({
      data: {
        tenantId,
        empresaId:             tenantId,
        nome:                  template.nome,
        descricao:             template.descricao,
        valor:                 template.valor,
        periodicidade:         template.periodicidade,
        servicos:              servicosPlano,
        ativo:                 true,
        isTemplate:            true,
        templateTipo:          template.templateTipo,
        agendamentoPrioritario: template.agendamentoPrioritario,
        descontoProdutos:      template.descontoProdutos,
        descontoServicosExtras: template.descontoServicosExtras,
        stripePriceId,
      },
    });

    return NextResponse.json(plano, { status: 201 });
  } catch (error: any) {
    console.error('[ATIVAR_TEMPLATE_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
