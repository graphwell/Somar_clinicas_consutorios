import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/clinic/[slug]/assinatura?telefone=XX&servicoId=Y
 * Endpoint público para o fluxo de agendamento verificar se o cliente
 * (identificado pelo telefone) possui plano que cobre o serviço escolhido.
 * Não exige autenticação — usa apenas slug + telefone para lookup.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  const { searchParams } = new URL(req.url);
  const telefoneRaw = searchParams.get('telefone') ?? '';
  const servicoId   = searchParams.get('servicoId');

  const telefone = telefoneRaw.replace(/\D/g, '');
  if (telefone.length < 10) return NextResponse.json({ temPlano: false });

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: { tenantId: true },
    });
    if (!clinica) return NextResponse.json({ temPlano: false });

    const { tenantId } = clinica;

    // Busca o paciente pelo sufixo do telefone (últimos 8 dígitos)
    const sufixo = telefone.slice(-8);
    const paciente = await prisma.paciente.findFirst({
      where: { tenantId, telefone: { contains: sufixo } },
      select: { id: true },
    });
    if (!paciente) return NextResponse.json({ temPlano: false });

    const now = new Date();
    const assinatura = await prisma.assinaturaCliente.findFirst({
      where: {
        pacienteId: paciente.id,
        tenantId,
        status: 'ativo',
        periodoInicio: { lte: now },
        OR: [{ periodoFim: null }, { periodoFim: { gte: now } }],
      },
      include: { plano: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!assinatura) return NextResponse.json({ temPlano: false });

    const plano    = assinatura.plano as Record<string, unknown>;
    const servicos = Array.isArray(plano.servicos) ? plano.servicos as Record<string, unknown>[] : [];
    const servico  = servicoId ? servicos.find(s => s['servicoId'] === servicoId) : null;

    const descontoProdutos = typeof plano['descontoProdutos'] === 'number' ? plano['descontoProdutos'] : 0;

    if (!servico) {
      return NextResponse.json({
        temPlano:          true,
        planoNome:         plano['nome'],
        servicoIncluso:    false,
        descontoProdutos,
      });
    }

    const contador      = servicoId ? (assinatura.contadorUso as Record<string, unknown>)[servicoId] as Record<string, unknown> | undefined : undefined;
    const tipo          = servico['tipo'] as 'ilimitado' | 'limitado';
    const usado         = typeof contador?.['usado'] === 'number' ? contador['usado'] : 0;
    const limite        = tipo === 'ilimitado' ? null : (typeof servico['quantidade'] === 'number' ? servico['quantidade'] : null);
    const limiteSuperado = limite !== null && usado >= limite;
    const saldoRestante  = limite !== null ? Math.max(0, limite - usado) : null;

    return NextResponse.json({
      temPlano:          true,
      planoNome:         plano['nome'],
      assinaturaId:      assinatura.id,
      servicoIncluso:    true,
      tipo,
      usado,
      limite,
      saldoRestante,
      cobrarNormal:      limiteSuperado,
      descontoProdutos,
    });
  } catch (err) {
    console.error('[public/assinatura]', err);
    return NextResponse.json({ temPlano: false });
  }
}
