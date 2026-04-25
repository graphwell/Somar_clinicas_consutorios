import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTenantPrisma } from '@/lib/prisma';
import { PLANOS_TEMPLATES, type ServicoTemplate } from '@/lib/planos-templates';

export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  try {
    const body = await request.json();
    const { templateTipo, nicho } = body as { templateTipo?: string; nicho?: string };

    // Modo bulk: ativar todos templates compatíveis com o nicho
    if (!templateTipo && nicho) {
      const templates = Object.values(PLANOS_TEMPLATES).filter(
        t => t.nichoAlvo === nicho || t.nichoAlvo === null,
      );
      const criados = await Promise.all(
        templates.map(t => criarPlanoFromTemplate(t.templateTipo, tenantId))
      );
      return NextResponse.json(criados, { status: 201 });
    }

    // Modo individual: ativar template específico
    if (!templateTipo) {
      return NextResponse.json({ error: 'templateTipo ou nicho obrigatório.' }, { status: 400 });
    }
    const template = PLANOS_TEMPLATES[templateTipo];
    if (!template) {
      return NextResponse.json({ error: 'Template inválido.' }, { status: 400 });
    }

    const plano = await criarPlanoFromTemplate(templateTipo, tenantId);
    return NextResponse.json(plano, { status: 201 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[ATIVAR_TEMPLATE_ERROR]', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function criarPlanoFromTemplate(templateTipo: string, tenantId: string) {
  const template = PLANOS_TEMPLATES[templateTipo];
  if (!template) throw new Error(`Template "${templateTipo}" não encontrado.`);

  const prisma = getTenantPrisma();

  // Buscar serviços ativos da clínica
  const servicosClinuca = await prisma.servico.findMany({
    where: { tenantId, ativo: true },
    select: { id: true, nome: true },
  });

  let servicosPlano: ServicoTemplate[];

  if (template.nichoAlvo !== null && template.servicos.length > 0) {
    // Template de nicho específico: match por nome (case-insensitive)
    servicosPlano = template.servicos.flatMap(ref => {
      const refNome = (ref.nome ?? '').toLowerCase();
      const encontrados = servicosClinuca.filter(s =>
        s.nome.toLowerCase().includes(refNome) || refNome.includes(s.nome.toLowerCase())
      );
      return encontrados.map(s => ({
        servicoId:   s.id,
        nomeServico: s.nome,
        tipo:        ref.tipo,
        quantidade:  ref.tipo === 'ilimitado' ? null : ref.quantidade,
      }));
    });
  } else {
    // Template genérico: todos os serviços ativos da clínica
    const qtdPorTemplate: Record<string, number | null> = {
      basico: 2, premium: 4, vip: null,
    };
    const qtd = qtdPorTemplate[templateTipo] ?? 2;
    servicosPlano = servicosClinuca.map(s => ({
      servicoId:   s.id,
      nomeServico: s.nome,
      tipo:        qtd === null ? 'ilimitado' : 'limitado',
      quantidade:  qtd,
    }));
  }

  let stripePriceId: string | null = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && template.valor > 0) {
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
    } catch { /* sem Stripe configurado */ }
  }

  const plano = await prisma.planoAssinatura.create({
    data: {
      tenantId,
      empresaId:              tenantId,
      nome:                   template.nome,
      descricao:              template.descricao,
      valor:                  template.valor,
      periodicidade:          template.periodicidade,
      servicos:               servicosPlano,
      ativo:                  true,
      isTemplate:             true,
      templateTipo:           template.templateTipo,
      agendamentoPrioritario: template.agendamentoPrioritario,
      descontoProdutos:       template.descontoProdutos,
      descontoServicosExtras: template.descontoServicosExtras,
      diasPermitidos:         template.diasPermitidos,
      stripePriceId,
    },
  });

  return plano;
}
