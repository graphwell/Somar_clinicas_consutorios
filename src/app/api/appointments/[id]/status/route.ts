import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';
import { baixarInsumosDoAtendimento } from '@/lib/insumos-baixa';
import { aplicarBlacklist, removerBlacklist } from '@/lib/blacklist';

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

    const concluindoAgora   = status === 'done'   && agendamento.status !== 'done';
    const faltouAgora       = status === 'faltou' && agendamento.status !== 'faltou';

    // Atualização de status + incremento de uso + blacklist — transação atômica
    const updated = await prisma.$transaction(async (tx) => {
      const ag = await tx.agendamento.update({
        where: { id: params.id },
        data: { status },
      });

      if (agendamento.pacienteId) {
        // Ao concluir: incrementar uso do plano e limpar blacklist
        if (concluindoAgora && agendamento.servicoId) {
          await incrementarUsoSeAssinante(
            { pacienteId: agendamento.pacienteId, servicoId: agendamento.servicoId, tenantId },
            tx,
          );
          await removerBlacklist(agendamento.pacienteId, tx);
        }

        // Ao marcar faltou: aplicar blacklist se for assinante
        if (faltouAgora) {
          await aplicarBlacklistSeAssinante(agendamento.pacienteId, tenantId, tx);
        }
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
 * Incrementa o contadorUso do plano quando o atendimento é concluído.
 * Usa contadorUso como fonte de verdade (keyed by servicoId).
 * Silencia erros — não deve impedir a conclusão do atendimento.
 */
async function incrementarUsoSeAssinante(
  { pacienteId, servicoId, tenantId }: { pacienteId: string; servicoId: string; tenantId: string },
  tx: TxClient,
): Promise<void> {
  try {
    const now = new Date();
    const assinatura = await tx.assinaturaCliente.findFirst({
      where: {
        pacienteId, tenantId, status: 'ativo',
        periodoInicio: { lte: now },
        OR: [{ periodoFim: null }, { periodoFim: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!assinatura) return;

    const contador = (assinatura.contadorUso as Record<string, unknown>)[servicoId] as Record<string, unknown> | undefined;
    if (!contador) return; // Serviço não incluso no plano

    const usado  = typeof contador['usado']  === 'number' ? contador['usado']  : 0;
    const limite = typeof contador['limite'] === 'number' ? contador['limite'] : null;
    if (limite !== null && usado >= limite) return; // Limite esgotado — cobrar normalmente

    const novoContador = { ...(assinatura.contadorUso as Record<string, unknown>) };
    novoContador[servicoId] = { ...contador, usado: usado + 1 };
    await tx.assinaturaCliente.update({
      where: { id: assinatura.id },
      data:  { contadorUso: novoContador },
    });
  } catch (err) {
    console.error('[incrementarUsoSeAssinante]', err);
  }
}

/**
 * Quando o paciente é marcado como "faltou", aplica blacklist se ele for assinante ativo.
 * A duração é definida pelo campo horasBlacklist do plano (default: 24h).
 */
async function aplicarBlacklistSeAssinante(
  pacienteId: string,
  tenantId: string,
  tx: TxClient,
): Promise<void> {
  try {
    const now = new Date();
    const assinatura = await tx.assinaturaCliente.findFirst({
      where: {
        pacienteId, tenantId, status: 'ativo',
        periodoInicio: { lte: now },
        OR: [{ periodoFim: null }, { periodoFim: { gte: now } }],
      },
      include: { plano: { select: { horasBlacklist: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!assinatura) return;

    const horas = (assinatura.plano as { horasBlacklist?: number }).horasBlacklist ?? 24;
    await aplicarBlacklist(pacienteId, horas, tx);
  } catch (err) {
    console.error('[aplicarBlacklistSeAssinante]', err);
  }
}
