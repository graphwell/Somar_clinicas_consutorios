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
      status:       'ativo',
      periodoInicio: { lte: now },
      OR: [
        { periodoFim: null },
        { periodoFim: { gte: now } },
      ],
    },
    include: { plano: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!assinatura) {
    return NextResponse.json({ temPlano: false });
  }

  const plano      = assinatura.plano as any;
  const contador   = servicoId ? (assinatura.contadorUso as any)[servicoId] : null;
  const servicos   = Array.isArray(plano.servicos) ? plano.servicos as any[] : [];
  const servico    = servicoId ? servicos.find((s: any) => s.servicoId === servicoId) : null;

  if (servicoId && !servico) {
    // Serviço não incluso no plano
    return NextResponse.json({
      temPlano:       true,
      planoNome:      plano.nome,
      assinaturaId:   assinatura.id,
      servicoIncluso: false,
      tipo:           null,
      usado:          null,
      limite:         null,
      saldoRestante:  null,
      descontoExtra:  null,
      cobrarNormal:   true,
    });
  }

  if (!servicoId || !servico) {
    // Só verificar se tem plano, sem serviço específico
    return NextResponse.json({
      temPlano:     true,
      planoNome:    plano.nome,
      assinaturaId: assinatura.id,
    });
  }

  const tipo          = servico.tipo as 'ilimitado' | 'limitado';
  const usado         = contador?.usado ?? 0;
  const limite        = tipo === 'ilimitado' ? null : (servico.quantidade ?? null);
  const limiteSuperado = limite !== null && usado >= limite;
  const saldoRestante  = limite !== null ? Math.max(0, limite - usado) : null;

  return NextResponse.json({
    temPlano:       true,
    planoNome:      plano.nome,
    assinaturaId:   assinatura.id,
    servicoIncluso: true,
    tipo,
    usado,
    limite,
    saldoRestante,
    descontoExtra:  limiteSuperado ? (plano.descontoServicosExtras ?? null) : null,
    cobrarNormal:   limiteSuperado,
  });
}
