import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/n8n/agenda/cancelar-por-telefone
 * Body: { telefone, tenantId, motivo? }
 *
 * Cancela o próximo agendamento pendente do cliente pelo telefone.
 * Chamado quando cliente responde NÃO ao lembrete.
 */
export async function PATCH(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: { telefone?: string; tenantId?: string; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { telefone, tenantId, motivo } = body;
  if (!telefone || !tenantId)
    return n8nError('telefone e tenantId são obrigatórios', 'MISSING_PARAM', 400);

  try {
    const telefoneClean = telefone.replace(/\D/g, '');

    const paciente = await prisma.paciente.findFirst({
      where: {
        tenantId,
        OR: [
          { telefone },
          { telefone: telefoneClean },
          { telefone: { endsWith: telefoneClean.slice(-8) } },
        ],
      },
      select: { id: true, nome: true },
    });

    if (!paciente) {
      return n8nSuccess({
        cancelado: false,
        msgBot: 'Não encontrei agendamento para cancelar.',
      });
    }

    const ag = await prisma.agendamento.findFirst({
      where: {
        pacienteId: paciente.id,
        tenantId,
        status:   'pendente',
        dataHora: { gte: new Date() },
      },
      orderBy: { dataHora: 'asc' },
      include: {
        servico:      { select: { nome: true } },
        profissional: { select: { nome: true } },
      },
    });

    if (!ag) {
      return n8nSuccess({
        cancelado: false,
        msgBot: 'Nenhum agendamento pendente encontrado.',
      });
    }

    await prisma.agendamento.update({
      where: { id: ag.id },
      data: {
        status:      'cancelado',
        observacoes: motivo ?? 'Cancelado pelo cliente via WhatsApp',
      },
    });

    return n8nSuccess({
      cancelado:     true,
      agendamentoId: ag.id,
      msgBot:
        `❌ Agendamento cancelado.\n\n` +
        (ag.servico ? `${ag.servico.nome} ` : '') +
        (ag.profissional ? `com ${ag.profissional.nome} ` : '') +
        `foi cancelado.\n\nPara reagendar é só me avisar! 😊`,
    });
  } catch (err) {
    console.error('[n8n/agenda/cancelar-por-telefone]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
