import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTenantPrisma } from '@/lib/prisma';
import { syncIsSubscriber } from '@/lib/sync-subscriber';

export async function GET(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  const url = new URL(request.url);
  const planoId  = url.searchParams.get('planoId') ?? undefined;
  const status   = url.searchParams.get('status') ?? undefined;

  const prisma = getTenantPrisma();
  const assinaturas = await prisma.assinaturaCliente.findMany({
    where: {
      tenantId,
      ...(planoId && { planoId }),
      ...(status  && { status }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      paciente: { select: { id: true, nome: true, telefone: true } },
      plano:    { select: { id: true, nome: true, valor: true, periodicidade: true, servicos: true, descontoServicosExtras: true } },
    },
  });

  return NextResponse.json(assinaturas);
}

export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  try {
    const { pacienteId, planoId, dataInicio } = await request.json();
    if (!pacienteId || !planoId) {
      return NextResponse.json({ error: 'pacienteId e planoId obrigatórios.' }, { status: 400 });
    }

    const prisma = getTenantPrisma();
    const plano = await prisma.planoAssinatura.findUnique({ where: { id: planoId } });
    if (!plano || plano.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    const inicio   = dataInicio ? new Date(dataInicio) : new Date();
    const periodoFim = new Date(inicio);
    if (plano.periodicidade === 'anual') {
      periodoFim.setFullYear(periodoFim.getFullYear() + 1);
    } else if (plano.periodicidade === 'trimestral') {
      periodoFim.setMonth(periodoFim.getMonth() + 3);
    } else {
      periodoFim.setMonth(periodoFim.getMonth() + 1);
    }

    // Inicializar contadores de uso
    const servicosPlano = Array.isArray(plano.servicos) ? plano.servicos as any[] : [];
    const contadorUso: Record<string, { usado: number; limite: number | null }> = {};
    for (const s of servicosPlano) {
      contadorUso[s.servicoId] = {
        usado:  0,
        limite: s.tipo === 'ilimitado' ? null : (s.quantidade ?? null),
      };
    }

    let stripeSubId: string | null = null;
    let stripeCustomerId: string | null = null;

    if (process.env.STRIPE_SECRET_KEY && plano.stripePriceId) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any });
        const paciente = await prisma.paciente.findUnique({
          where: { id: pacienteId },
          select: { nome: true, telefone: true },
        });

        const customer = await stripe.customers.create({
          name:     paciente?.nome ?? 'Cliente',
          phone:    paciente?.telefone ?? undefined,
          metadata: { tenantId, pacienteId },
        });
        stripeCustomerId = customer.id;

        const sub = await stripe.subscriptions.create({
          customer: customer.id,
          items:    [{ price: plano.stripePriceId }],
          metadata: { tenantId, pacienteId, planoId },
        });
        stripeSubId = sub.id;
      } catch (e) {
        console.warn('[SUBSCRIPTIONS_CLIENTES] Stripe skip:', e);
      }
    }

    const assinatura = await prisma.assinaturaCliente.create({
      data: {
        tenantId,
        pacienteId,
        planoId,
        dataInicio:      inicio,
        status:          'ativo',
        valorPago:       plano.valor,
        stripeSubId,
        stripeCustomerId,
        periodoInicio:   inicio,
        periodoFim,
        proximaCobranca: periodoFim,
        contadorUso,
      },
    });

    // Sincroniza isSubscriber via helper centralizado
    await syncIsSubscriber(pacienteId, prisma);

    return NextResponse.json(assinatura, { status: 201 });
  } catch (error: any) {
    console.error('[SUBSCRIPTIONS_CLIENTES_POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
