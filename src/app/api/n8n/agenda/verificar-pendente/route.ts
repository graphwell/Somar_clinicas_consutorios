import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/n8n/agenda/verificar-pendente
 * Query: { telefone, tenantId }
 *
 * Verifica se o cliente tem agendamento pendente de confirmação
 * (ou seja, lembrete já enviado mas status ainda 'pendente').
 *
 * Usado pelo nó "É SIM?" do workflow para decidir se o SIM é:
 *   - Resposta a um lembrete (temPendente=true) → confirmar agendamento
 *   - Resposta ao agente dentro do fluxo de agendamento (temPendente=false) → passar ao agente
 */
export async function GET(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  const { searchParams } = new URL(req.url);
  const telefoneRaw = searchParams.get('telefone') ?? '';
  const tenantId    = searchParams.get('tenantId') ?? '';

  if (!telefoneRaw) return n8nError('telefone é obrigatório', 'MISSING_PARAM', 400);

  try {
    const tel      = telefoneRaw.replace(/\D/g, '');
    const telSem55 = tel.startsWith('55') && tel.length > 11 ? tel.slice(2) : tel;
    const last8    = telSem55.slice(-8);

    const wherePhone = {
      OR: [
        { telefone: telefoneRaw },
        { telefone: tel },
        { telefone: telSem55 },
        { telefone: `55${telSem55}` },
        { telefone: `+55${telSem55}` },
        { telefone: { contains: last8 } },
      ],
    };

    let paciente = await prisma.paciente.findFirst({
      where: tenantId ? { tenantId, ...wherePhone } : wherePhone,
      select: { id: true, tenantId: true },
    }) ?? await prisma.paciente.findFirst({
      where: wherePhone,
      select: { id: true, tenantId: true },
    });

    // Fallback SQL para telefones com formatação
    if (!paciente) {
      type Row = { id: string; tenantId: string };
      const rows = tenantId
        ? await prisma.$queryRaw<Row[]>(
            Prisma.sql`SELECT id, "tenantId" FROM paciente
                       WHERE regexp_replace(telefone, '[^0-9]', '', 'g') LIKE ${'%' + last8}
                         AND "tenantId" = ${tenantId} LIMIT 1`
          )
        : await prisma.$queryRaw<Row[]>(
            Prisma.sql`SELECT id, "tenantId" FROM paciente
                       WHERE regexp_replace(telefone, '[^0-9]', '', 'g') LIKE ${'%' + last8}
                       LIMIT 1`
          );
      paciente = rows[0] ?? null;
    }

    if (!paciente) {
      return n8nSuccess({ temPendente: false, tipo: null });
    }

    const tenantReal = tenantId || paciente.tenantId;

    // Agendamento pendente que já recebeu lembrete → cliente está respondendo ao lembrete
    const agLembrete = await prisma.agendamento.findFirst({
      where: {
        tenantId:        tenantReal,
        pacienteId:      paciente.id,
        status:          'pendente',
        dataHora:        { gte: new Date() },
        lembreteEnviado: true,
      },
      orderBy: { dataHora: 'asc' },
      select: { id: true },
    });

    if (agLembrete) {
      return n8nSuccess({ temPendente: true, tipo: 'lembrete', agendamentoId: agLembrete.id });
    }

    // Fila de espera notificada aguardando resposta
    const filaNotificada = await prisma.filaEspera.findFirst({
      where: {
        tenantId:       tenantReal,
        pacienteId:     paciente.id,
        status:         'notificado',
        expirarNotifEm: { gte: new Date() },
      },
      select: { id: true },
    });

    if (filaNotificada) {
      return n8nSuccess({ temPendente: true, tipo: 'fila', filaId: filaNotificada.id });
    }

    return n8nSuccess({ temPendente: false, tipo: null });
  } catch (err) {
    console.error('[n8n/agenda/verificar-pendente]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
