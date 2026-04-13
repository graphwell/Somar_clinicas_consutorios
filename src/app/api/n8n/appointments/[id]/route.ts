import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarTokenInterno, UNAUTHORIZED } from '@/app/api/n8n/_middleware';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/n8n/appointments/[id]
 * Ferramenta: cancelar_agendamento
 * Body: { tenantId }
 *
 * Cancela agendamento após confirmação explícita do cliente.
 * Requer que o agente já tenha obtido confirmação antes de chamar.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!autenticarTokenInterno(req)) return UNAUTHORIZED();

  const agendamentoId = params.id;

  let body: { tenantId?: string };
  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { tenantId } = body;
  if (!tenantId)       return n8nError('tenantId é obrigatório', 'MISSING_PARAM');
  if (!agendamentoId)  return n8nError('id do agendamento é obrigatório', 'MISSING_PARAM');

  try {
    const agendamento = await prisma.agendamento.findFirst({
      where: { id: agendamentoId, tenantId },
      include: {
        servico:      { select: { nome: true } },
        profissional: { select: { nome: true } },
      },
    });

    if (!agendamento) return n8nError('Agendamento não encontrado', 'NOT_FOUND', 404);
    if (agendamento.status === 'cancelado') {
      return n8nError('Agendamento já está cancelado', 'ALREADY_CANCELLED', 409);
    }

    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data:  { status: 'cancelado', observacoes: 'Cancelado via WhatsApp Bot' },
    });

    const msgBot =
      `Agendamento cancelado com sucesso.\n\n` +
      (agendamento.servico      ? `${agendamento.servico.nome} ` : '') +
      (agendamento.profissional ? `com ${agendamento.profissional.nome} ` : '') +
      `foi cancelado.\n\nPara remarcar, e so me avisar!`;

    return n8nSuccess({
      cancelado:  true,
      id:         agendamentoId,
      service:    agendamento.servico?.nome ?? null,
      msgBot,
    });
  } catch (err) {
    console.error('[n8n/appointments DELETE]', err);
    return n8nError('Erro ao cancelar agendamento', 'INTERNAL_ERROR', 500);
  }
}
