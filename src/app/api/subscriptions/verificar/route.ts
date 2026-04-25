import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  const url        = new URL(request.url);
  const pacienteId = url.searchParams.get('pacienteId');
  const servicoId  = url.searchParams.get('servicoId');

  if (!pacienteId) return NextResponse.json({ temPlano: false });

  const prisma = getTenantPrisma();
  const now    = new Date();

  const assinatura = await prisma.assinaturaCliente.findFirst({
    where: {
      pacienteId,
      tenantId,
      status:        'ativo',
      periodoInicio: { lte: now },
      OR: [
        { periodoFim: null },
        { periodoFim: { gte: now } },
      ],
    },
    include: { plano: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!assinatura) return NextResponse.json({ temPlano: false });

  const plano    = assinatura.plano as Record<string, unknown>;
  const servicos = Array.isArray(plano['servicos']) ? plano['servicos'] as Record<string, unknown>[] : [];

  // ── Buscar o item do plano correspondente ao serviço ──────────────────────
  let servico: Record<string, unknown> | null = null;

  if (servicoId) {
    // 1. Match exato por servicoId (planos novos)
    servico = servicos.find(s => s['servicoId'] === servicoId) ?? null;

    // 2. Fallback por nome (planos sem servicoId explícito)
    if (!servico) {
      const servicoDb = await prisma.servico.findFirst({
        where: { id: servicoId, tenantId },
        select: { nome: true },
      });
      if (servicoDb) {
        const nomeBuscado = servicoDb.nome.toLowerCase();
        servico = servicos.find(s => {
          const nomeItem = ((s['nomeServico'] ?? s['nome']) as string | undefined ?? '').toLowerCase();
          return nomeItem && (nomeItem.includes(nomeBuscado) || nomeBuscado.includes(nomeItem));
        }) ?? null;
      }
    }
  }

  const contador = servicoId ? (assinatura.contadorUso as Record<string, unknown>)[servicoId] as Record<string, unknown> | undefined : undefined;

  // Serviço não incluso no plano
  if (servicoId && !servico) {
    return NextResponse.json({
      temPlano:       true,
      planoNome:      plano['nome'],
      assinaturaId:   assinatura.id,
      servicoIncluso: false,
      tipo:           null,
      usado:          null,
      limite:         null,
      saldoRestante:  null,
      descontoExtra:  null,
      cobrarNormal:   true,
      servicoId,
    });
  }

  // Sem servicoId — só verificar existência do plano
  if (!servicoId || !servico) {
    return NextResponse.json({
      temPlano:     true,
      planoNome:    plano['nome'],
      assinaturaId: assinatura.id,
    });
  }

  const tipo           = servico['tipo'] as 'ilimitado' | 'limitado';
  const usado          = typeof contador?.['usado']  === 'number' ? contador['usado']  : 0;
  const quantidade     = typeof servico['quantidade'] === 'number' ? servico['quantidade'] : null;
  const limite         = tipo === 'ilimitado' ? null : quantidade;
  const limiteSuperado = limite !== null && usado >= limite;
  const saldoRestante  = limite !== null ? Math.max(0, limite - usado) : null;

  return NextResponse.json({
    temPlano:       true,
    planoNome:      plano['nome'],
    assinaturaId:   assinatura.id,
    servicoIncluso: true,
    tipo,
    usado,
    limite,
    saldoRestante,
    descontoExtra:  limiteSuperado ? (plano['descontoServicosExtras'] ?? null) : null,
    cobrarNormal:   limiteSuperado,
    servicoId,
  });
}
