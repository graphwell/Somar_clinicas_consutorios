import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarTokenInterno, UNAUTHORIZED } from '@/app/api/n8n/_middleware';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/n8n/appointments/by-phone
 * Ferramenta: consultar_agendamentos_cliente
 * Query: ?tenantId=xxx&phone=5585999990000
 *
 * Retorna agendamentos futuros (não cancelados) do cliente,
 * formatados para o agente apresentar via WhatsApp.
 */
export async function GET(req: NextRequest) {
  if (!autenticarTokenInterno(req)) return UNAUTHORIZED();

  const tenantId = req.nextUrl.searchParams.get('tenantId');
  const phone    = req.nextUrl.searchParams.get('phone');

  if (!tenantId) return n8nError('tenantId é obrigatório', 'MISSING_PARAM');
  if (!phone)    return n8nError('phone é obrigatório', 'MISSING_PARAM');

  try {
    const phoneClean = phone.replace(/\D/g, '');

    const paciente = await prisma.paciente.findFirst({
      where: {
        tenantId,
        OR: [
          { telefone: phone },
          { telefone: phoneClean },
          { telefone: { endsWith: phoneClean.slice(-8) } },
        ],
      },
      select: { id: true, nome: true, telefone: true },
    });

    if (!paciente) {
      return n8nSuccess({
        encontrado:    false,
        clientName:    null,
        agendamentos:  [],
        listaBot:      'Não encontrei agendamentos para este número.',
        msgBot:        'Não encontrei agendamentos para este número.',
      });
    }

    const agora = new Date();
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        pacienteId: paciente.id,
        status:     { not: 'cancelado' },
        dataHora:   { gte: agora },
      },
      orderBy: { dataHora: 'asc' },
      take: 5,
      include: {
        servico:      { select: { nome: true } },
        profissional: { select: { nome: true } },
      },
    });

    if (agendamentos.length === 0) {
      return n8nSuccess({
        encontrado:   true,
        clientName:   paciente.nome,
        agendamentos: [],
        listaBot:     `Olá, ${paciente.nome.split(' ')[0]}! Você não tem agendamentos futuros.`,
        msgBot:       `Olá, ${paciente.nome.split(' ')[0]}! Você não tem agendamentos futuros.`,
      });
    }

    const formatDate = (d: Date) =>
      d.toLocaleDateString('pt-BR', {
        timeZone: 'America/Fortaleza',
        weekday: 'short', day: '2-digit', month: '2-digit',
      });
    const formatTime = (d: Date) =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(d);

    const lista = agendamentos.map((ag, i) => ({
      index:          i + 1,
      id:             ag.id,
      date:           ag.dataHora.toISOString().split('T')[0],
      time:           formatTime(ag.dataHora),
      dateFormatted:  formatDate(ag.dataHora),
      service:        ag.servico?.nome ?? 'Serviço',
      professional:   ag.profissional?.nome ?? 'Profissional',
      status:         ag.status,
      // Texto para o agente apresentar:
      descricaoBot:   `${i + 1}. ${ag.servico?.nome} — ${formatDate(ag.dataHora)} às ${formatTime(ag.dataHora)} com ${ag.profissional?.nome ?? 'Profissional'}`,
    }));

    const primeiroNome = paciente.nome.split(' ')[0];
    const listaBot =
      `Olá, ${primeiroNome}! Seus agendamentos:\n\n` +
      lista.map(a => a.descricaoBot).join('\n') +
      '\n\nQual deseja remarcar ou cancelar?';

    return n8nSuccess({
      encontrado:   true,
      clientName:   paciente.nome,
      clientId:     paciente.id,
      total:        lista.length,
      agendamentos: lista,
      listaBot,
      msgBot: listaBot,
    });
  } catch (err) {
    console.error('[n8n/appointments/by-phone]', err);
    return n8nError('Erro ao buscar agendamentos', 'INTERNAL_ERROR', 500);
  }
}
