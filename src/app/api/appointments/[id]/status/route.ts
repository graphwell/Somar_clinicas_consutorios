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
      select: { id: true, status: true, servicoId: true, profissionalId: true, tenantId: true, dataHora: true },
    });

    if (!agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const updated = await prisma.agendamento.update({
      where: { id: params.id },
      data: { status },
    });

    // Baixa automática de insumos ao concluir
    let insumosBaixados = 0;
    if (status === 'done' && agendamento.status !== 'done' && agendamento.servicoId) {
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
