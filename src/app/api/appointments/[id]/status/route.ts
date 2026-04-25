import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';
import { baixarInsumosDoAtendimento } from '@/lib/insumos-baixa';

/**
 * PATCH /api/appointments/[id]/status
 * Body: { status: 'done' | 'cancelado' | 'confirmado' | 'pendente' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { status } = await req.json();

    if (!status) {
      return NextResponse.json({ error: 'status é obrigatório' }, { status: 400 });
    }

    const agendamento = await prisma.agendamento.findFirst({
      where: { id: params.id, tenantId },
      select: {
        id: true, status: true, servicoId: true,
        profissionalId: true, tenantId: true, dataHora: true,
        pacienteId: true,
      },
    });

    if (!agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const concluindoAgora = status === 'done' && agendamento.status !== 'done';

    // Atualização de status + incremento de uso do plano em transação atômica
    const updated = await prisma.$transaction(async (tx) => {
      const ag = await tx.agendamento.update({
        where: { id: params.id },
        data: { status },
      });

      if (concluindoAgora && agendamento.pacienteId && agendamento.servicoId) {
        await incrementarUsoSeAssinante(
          {
            pacienteId: agendamento.pacienteId,
            servicoId:  agendamento.servicoId,
            tenantId,
          },
          tx,
        );
      }

      return ag;
    });

    // Baixa automática de insumos ao concluir (fora da transação — efeito colateral separado)
    let insumosBaixados = 0;
    if (concluindoAgora && agendamento.servicoId) {
      const resultado = await baixarInsumosDoAtendimento({
        agendamentoId: params.id,
        servicoId: agendamento.servicoId,
        profissionalId: agendamento.profissionalId,
        tenantId,
      });
      insumosBaixados = resultado.baixadas;
      if (resultado.erros.length > 0) {
        console.warn('[insumos-baixa] Erros:', resultado.erros);
      }
    }

    // Ao cancelar, notificar próximo da fila de espera em background
    if (status === 'cancelado' && agendamento.status !== 'cancelado' && agendamento.servicoId) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      fetch(`${baseUrl}/api/fila-espera/verificar-e-notificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          profissionalId: agendamento.profissionalId ?? null,
          servicoId: agendamento.servicoId,
          dataHora: agendamento.dataHora.toISOString(),
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ...updated, insumosBaixados });
  } catch (error: any) {
    console.error('[appointments/status] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TxClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Dentro da transação de conclusão do atendimento, verifica se o paciente
 * tem plano ativo que cobre o serviço e incrementa o contadorUso atomicamente.
 * Silencia erros para não impedir a conclusão do agendamento.
 */
async function incrementarUsoSeAssinante(
  {
    pacienteId,
    servicoId,
    tenantId,
  }: { pacienteId: string; servicoId: string; tenantId: string },
  tx: TxClient,
): Promise<void> {
  try {
    const now = new Date();
    const assinatura = await tx.assinaturaCliente.findFirst({
      where: {
        pacienteId,
        tenantId,
        status: 'ativo',
        periodoInicio: { lte: now },
        OR: [{ periodoFim: null }, { periodoFim: { gte: now } }],
      },
      include: { plano: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!assinatura) return;

    const plano    = assinatura.plano as Record<string, unknown>;
    const servicos = Array.isArray(plano['servicos']) ? plano['servicos'] as Record<string, unknown>[] : [];
    const incluso  = servicos.some(s => s['servicoId'] === servicoId);
    if (!incluso) return;

    const contador = (assinatura.contadorUso as Record<string, unknown>)[servicoId] as Record<string, unknown> | undefined;
    if (!contador) return;

    const usado  = typeof contador['usado'] === 'number' ? contador['usado'] : 0;
    const limite = typeof contador['limite'] === 'number' ? contador['limite'] : null;

    // Se limitado e já esgotado, não incrementa (cobrar normalmente — sem bloquear)
    if (limite !== null && usado >= limite) return;

    const novoContador = { ...(assinatura.contadorUso as Record<string, unknown>) };
    novoContador[servicoId] = { ...contador, usado: usado + 1 };

    await tx.assinaturaCliente.update({
      where: { id: assinatura.id },
      data:  { contadorUso: novoContador },
    });
  } catch (err) {
    // Logar mas não relançar: não impede a conclusão do atendimento
    console.error('[incrementarUsoSeAssinante]', err);
  }
}
