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

  let body: { telefone?: string; sender_number?: string; from?: string; tenantId?: string; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  // Aceitar telefone de qualquer campo que o n8n envie
  const telefoneRaw =
    (body as any).telefone ??
    (body as any).sender_number ??
    (body as any).from ?? '';
  const { tenantId, motivo } = body;

  if (!telefoneRaw)
    return n8nError('telefone é obrigatório', 'MISSING_PARAM', 400);

  try {
    const tel = telefoneRaw.replace(/\D/g, '');
    // Remove prefixo 55 do Brasil para ter o número local
    const telSem55 = tel.startsWith('55') && tel.length > 11 ? tel.slice(2) : tel;
    const last8 = telSem55.slice(-8);

    console.log('[cancelar] buscando por:', { telefoneRaw, tel, telSem55, last8, tenantId });

    const wherePhone = {
      OR: [
        { telefone: telefoneRaw },
        { telefone: tel },
        { telefone: telSem55 },
        { telefone: `55${telSem55}` },
        { telefone: `+55${telSem55}` },
        { telefone: { contains: last8 } },
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

    // Fallback SQL: normaliza o telefone armazenado (cobre formatações como "(11) 98765-4321")
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

    console.log('[cancelar] paciente:', paciente?.nome ?? 'NÃO ENCONTRADO');

    if (!paciente) {
      return n8nSuccess({
        cancelado: false,
        msgBot:
          `Nao encontrei agendamento para seu numero.\n\n` +
          `Verifique se o agendamento foi feito com este WhatsApp ou acesse o link para reagendar.`,
      });
    }

    const tenantReal = paciente.tenantId;

    const ag = await prisma.agendamento.findFirst({
      where: {
        pacienteId: paciente.id,
        tenantId:   tenantReal,
        status:     { in: ['pendente', 'confirmado'] },
        dataHora:   { gte: new Date() },
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
        msgBot:
          `Nao encontrei agendamento pendente para cancelar.\n\n` +
          `Gostaria de fazer um novo agendamento?`,
      });
    }

    await prisma.agendamento.update({
      where: { id: ag.id },
      data: {
        status:      'cancelado',
        observacoes: motivo ?? 'Cancelado pelo cliente via WhatsApp',
      },
    });

    const hora = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(ag.dataHora);
    const data = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza', weekday: 'long', day: '2-digit', month: '2-digit',
    }).format(ag.dataHora);

    // Notificação WA em background
    import('@/lib/whatsapp-service')
      .then(({ notificarCancelamento }) => notificarCancelamento(ag.id))
      .catch(e => console.error('[WA]', e));

    // Fila de espera em background
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/fila-espera/verificar-e-notificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantReal },
      body: JSON.stringify({
        profissionalId: ag.profissionalId,
        servicoId: ag.servicoId,
        dataHora: ag.dataHora.toISOString(),
      }),
    }).catch(() => {});

    return n8nSuccess({
      cancelado:     true,
      agendamentoId: ag.id,
      msgBot:
        `Agendamento cancelado!\n\n` +
        (ag.servico ? `${ag.servico.nome}\n` : '') +
        `${data} as ${hora}\n` +
        (ag.profissional ? `${ag.profissional.nome}\n` : '') +
        `\nPara reagendar e so me avisar!`,
    });
  } catch (err) {
    console.error('[n8n/agenda/cancelar-por-telefone]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
