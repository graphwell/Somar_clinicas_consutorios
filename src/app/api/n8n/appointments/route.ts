import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarTokenInterno, UNAUTHORIZED } from '@/app/api/n8n/_middleware';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

function gerarProtocolo(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * POST /api/n8n/appointments
 * Ferramenta: criar_agendamento
 * Body: { tenantId, clientPhone, clientName, professionalId, serviceId, date, time }
 *
 * Cria agendamento via bot e retorna mensagem de confirmação pronta.
 * Chamar SOMENTE com todos os dados confirmados pelo cliente.
 */
export async function POST(req: NextRequest) {
  if (!autenticarTokenInterno(req)) return UNAUTHORIZED();

  let body: {
    tenantId?:       string;
    clientPhone?:    string;
    clientName?:     string;
    professionalId?: string;
    serviceId?:      string;
    date?:           string; // YYYY-MM-DD
    time?:           string; // HH:MM
    origem?:         string;
  };

  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { tenantId, clientPhone, clientName, professionalId, serviceId, date, time } = body;

  if (!tenantId)       return n8nError('tenantId é obrigatório', 'MISSING_PARAM');
  if (!clientPhone)    return n8nError('clientPhone é obrigatório', 'MISSING_PARAM');
  if (!clientName)     return n8nError('clientName é obrigatório', 'MISSING_PARAM');
  if (!serviceId)      return n8nError('serviceId é obrigatório', 'MISSING_PARAM');
  if (!date || !time)  return n8nError('date (YYYY-MM-DD) e time (HH:MM) são obrigatórios', 'MISSING_PARAM');

  try {
    const clinica = await prisma.clinica.findFirst({
      where: { tenantId },
      select: { nome: true, tenantId: true },
    });
    if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);

    const servico = await prisma.servico.findFirst({
      where: { id: serviceId, tenantId, ativo: true },
      include: { profissionais: { where: { ativo: true }, select: { id: true } } },
    });
    if (!servico) return n8nError('Serviço não encontrado', 'NOT_FOUND', 404);

    // Resolver profissional
    const profIds = servico.profissionais.map(p => p.id);
    let profId = professionalId;

    if (!profId || profId === 'qualquer') {
      const qualquer = await prisma.profissional.findFirst({
        where: { id: { in: profIds }, tenantId, ativo: true },
        select: { id: true },
      });
      if (!qualquer) return n8nError('Nenhum profissional disponível para este serviço', 'NO_PROFESSIONAL', 400);
      profId = qualquer.id;
    } else if (!profIds.includes(profId)) {
      return n8nError('Este profissional não atende o serviço selecionado', 'INVALID_PROFESSIONAL', 400);
    }

    // Calcular horários no fuso Fortaleza (UTC-3): somar 3h para obter UTC
    const [_ano, _mes, _dia] = date.split('-').map(Number);
    const [_hora, _min] = time.split(':').map(Number);
    const dataHora    = new Date(Date.UTC(_ano, _mes - 1, _dia, _hora + 3, _min, 0, 0));
    const fimDataHora = new Date(
      dataHora.getTime() + (servico.duracaoMinutos + (servico.bufferTimeMinutes ?? 0)) * 60_000
    );

    // Verificar conflito
    const conflito = await prisma.agendamento.findFirst({
      where: {
        tenantId,
        profissionalId: profId,
        status: { not: 'cancelado' },
        dataHora:    { lt: fimDataHora },
        fimDataHora: { gt: dataHora },
      },
    });
    if (conflito) return n8nError('Horário não disponível — já existe agendamento neste slot', 'SLOT_CONFLICT', 409);

    // Buscar ou criar paciente
    const phoneClean = clientPhone.replace(/\D/g, '');
    let paciente = await prisma.paciente.findFirst({
      where: {
        tenantId,
        OR: [
          { telefone: clientPhone },
          { telefone: phoneClean },
          { telefone: { endsWith: phoneClean.slice(-8) } },
        ],
      },
    });
    if (!paciente) {
      paciente = await prisma.paciente.create({
        data: {
          nome:            clientName.trim(),
          telefone:        clientPhone.trim(),
          tipoAtendimento: 'particular',
          tenantId,
        },
      });
    }

    const protocolo  = gerarProtocolo();
    const agendamento = await prisma.agendamento.create({
      data: {
        eventoId:        `bot-${protocolo}-${Date.now()}`,
        pacienteId:      paciente.id,
        profissionalId:  profId,
        servicoId:       servico.id,
        dataHora,
        fimDataHora,
        durationMinutes: servico.duracaoMinutos,
        status:          'confirmado',
        tipoAtendimento: 'particular',
        tenantId,
        origemAgendamento: 'bot',
        observacoes:     `WhatsApp Bot — Protocolo #${protocolo}`,
      },
      include: {
        profissional: { select: { nome: true } },
      },
    });

    const dataFormatada = dataHora.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza',
      weekday: 'long', day: '2-digit', month: '2-digit',
    });

    const msgConfirmacao =
      `Agendamento confirmado!\n\n` +
      `Protocolo: #${protocolo}\n` +
      `Data: ${dataFormatada} as ${time}\n` +
      `Servico: ${servico.nome}\n` +
      `Profissional: ${agendamento.profissional?.nome ?? 'Profissional'}\n\n` +
      `Ate la!`;

    return n8nSuccess({
      agendamentoId:   agendamento.id,
      protocolo,
      clientName:      paciente.nome,
      service:         servico.nome,
      professional:    agendamento.profissional?.nome ?? null,
      date,
      time,
      dateFormatted:   dataFormatada,
      msgConfirmacao,
      msgBot:          msgConfirmacao,
    });
  } catch (err) {
    console.error('[n8n/appointments POST]', err);
    return n8nError('Erro ao criar agendamento', 'INTERNAL_ERROR', 500);
  }
}
