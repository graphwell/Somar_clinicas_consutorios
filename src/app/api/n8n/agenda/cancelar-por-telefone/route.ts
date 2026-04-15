import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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
  if (!telefone)
    return n8nError('telefone é obrigatório', 'MISSING_PARAM', 400);

  try {
    const telefoneClean = telefone.replace(/\D/g, '');
    const last8 = telefoneClean.slice(-8);

    const wherePhone = {
      OR: [
        { telefone },
        { telefone: telefoneClean },
        { telefone: { endsWith: last8 } },
      ],
    };

    let paciente = await prisma.paciente.findFirst({
      where: tenantId ? { tenantId, ...wherePhone } : wherePhone,
      select: { id: true, nome: true, tenantId: true },
    }) ?? await prisma.paciente.findFirst({
      where: wherePhone,
      select: { id: true, nome: true, tenantId: true },
    });

    // Fallback: normaliza o telefone armazenado (remove não-dígitos)
    // Cobre pacientes com formatação, ex: "(11) 98765-4321"
    if (!paciente) {
      type PacienteRow = { id: string; nome: string; tenantId: string };
      const rows = tenantId
        ? await prisma.$queryRaw<PacienteRow[]>(
            Prisma.sql`SELECT id, nome, "tenantId" FROM paciente
                       WHERE regexp_replace(telefone, '[^0-9]', '', 'g') LIKE ${'%' + last8}
                         AND "tenantId" = ${tenantId}
                       LIMIT 1`
          )
        : await prisma.$queryRaw<PacienteRow[]>(
            Prisma.sql`SELECT id, nome, "tenantId" FROM paciente
                       WHERE regexp_replace(telefone, '[^0-9]', '', 'g') LIKE ${'%' + last8}
                       LIMIT 1`
          );
      paciente = rows[0] ?? null;
    }

    if (!paciente) {
      return n8nSuccess({
        cancelado: false,
        msgBot: 'Não encontrei agendamento para cancelar.',
      });
    }

    const tenantReal = paciente.tenantId;

    const ag = await prisma.agendamento.findFirst({
      where: {
        pacienteId: paciente.id,
        tenantId: tenantReal,
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

    // Notificação WA em background
    import('@/lib/whatsapp-service')
      .then(({ notificarCancelamento }) => notificarCancelamento(ag.id))
      .catch(e => console.error('[WA]', e));

    return n8nSuccess({
      cancelado:     true,
      agendamentoId: ag.id,
      msgBot:
        `Agendamento cancelado.\n\n` +
        (ag.servico ? `${ag.servico.nome} ` : '') +
        (ag.profissional ? `com ${ag.profissional.nome} ` : '') +
        `foi cancelado.\n\nPara reagendar e so me avisar!`,
    });
  } catch (err) {
    console.error('[n8n/agenda/cancelar-por-telefone]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
