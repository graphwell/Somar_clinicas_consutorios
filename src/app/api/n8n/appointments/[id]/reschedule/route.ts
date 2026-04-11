import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarTokenInterno, UNAUTHORIZED } from '@/app/api/n8n/_middleware';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/n8n/appointments/[id]/reschedule
 * Ferramenta: remarcar_agendamento
 * Body: { tenantId, date: "YYYY-MM-DD", time: "HH:MM" }
 *
 * Remarca agendamento existente para nova data e hora.
 * Verifica disponibilidade antes de confirmar.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!autenticarTokenInterno(req)) return UNAUTHORIZED();

  const agendamentoId = params.id;

  let body: { tenantId?: string; date?: string; time?: string };
  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { tenantId, date, time } = body;
  if (!tenantId)      return n8nError('tenantId é obrigatório', 'MISSING_PARAM');
  if (!agendamentoId) return n8nError('id do agendamento é obrigatório', 'MISSING_PARAM');
  if (!date || !time) return n8nError('date (YYYY-MM-DD) e time (HH:MM) são obrigatórios', 'MISSING_PARAM');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return n8nError('date deve estar no formato YYYY-MM-DD', 'INVALID_PARAM');
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return n8nError('time deve estar no formato HH:MM', 'INVALID_PARAM');
  }

  try {
    const agendamento = await prisma.agendamento.findFirst({
      where: { id: agendamentoId, tenantId },
      include: {
        servico:      { select: { nome: true, duracaoMinutos: true, bufferTimeMinutes: true } },
        profissional: { select: { id: true, nome: true } },
      },
    });

    if (!agendamento) return n8nError('Agendamento não encontrado', 'NOT_FOUND', 404);
    if (agendamento.status === 'cancelado') {
      return n8nError('Não é possível remarcar um agendamento cancelado', 'ALREADY_CANCELLED', 409);
    }

    const duracao = agendamento.servico?.duracaoMinutos ?? agendamento.durationMinutes;
    const buffer  = agendamento.servico?.bufferTimeMinutes ?? 0;

    const novaDataHora    = new Date(`${date}T${time}:00-03:00`);
    const novaFimDataHora = new Date(novaDataHora.getTime() + (duracao + buffer) * 60_000);

    // Verificar conflito (excluindo o próprio agendamento)
    const conflito = await prisma.agendamento.findFirst({
      where: {
        tenantId,
        profissionalId: agendamento.profissionalId ?? undefined,
        status:         { not: 'cancelado' },
        id:             { not: agendamentoId }, // excluir a si mesmo
        dataHora:       { lt: novaFimDataHora },
        fimDataHora:    { gt: novaDataHora },
      },
    });
    if (conflito) {
      return n8nError(
        'Horário não disponível — já existe outro agendamento neste slot',
        'SLOT_CONFLICT',
        409
      );
    }

    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data:  {
        dataHora:    novaDataHora,
        fimDataHora: novaFimDataHora,
        observacoes: `Remarcado via WhatsApp Bot para ${date} ${time}`,
      },
    });

    const dataFormatada = novaDataHora.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza',
      weekday: 'long', day: '2-digit', month: '2-digit',
    });

    const msgBot =
      `✅ Agendamento remarcado!\n\n` +
      `📅 ${dataFormatada} às ${time}\n` +
      (agendamento.servico     ? `💇 ${agendamento.servico.nome}\n`              : '') +
      (agendamento.profissional ? `👤 ${agendamento.profissional.nome}\n` : '') +
      `\nAté lá! 😊`;

    return n8nSuccess({
      remarcado:     true,
      id:            agendamentoId,
      date,
      time,
      dateFormatted: dataFormatada,
      service:       agendamento.servico?.nome ?? null,
      professional:  agendamento.profissional?.nome ?? null,
      msgBot,
    });
  } catch (err) {
    console.error('[n8n/appointments PATCH reschedule]', err);
    return n8nError('Erro ao remarcar agendamento', 'INTERNAL_ERROR', 500);
  }
}
