import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarTokenInterno, UNAUTHORIZED } from '@/app/api/n8n/_middleware';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

const INTERVALO = 30;

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function fromMin(n: number): string {
  return `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;
}
function dateToFortalezaMin(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find(p => p.type === 'hour')?.value ?? '0') * 60
    + parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
}

/**
 * GET /api/n8n/availability
 * Ferramenta: ver_horarios_disponiveis
 * Query: ?tenantId=xxx&professionalId=yyy&serviceId=zzz&date=YYYY-MM-DD
 *
 * serviceId é usado para calcular a duração do serviço.
 * professionalId filtra para um único profissional.
 * Retorna até 10 slots livres + listaBot (máx 3 para o agente usar por padrão).
 */
export async function GET(req: NextRequest) {
  if (!autenticarTokenInterno(req)) return UNAUTHORIZED();

  const { searchParams } = req.nextUrl;
  const tenantId       = searchParams.get('tenantId');
  const professionalId = searchParams.get('professionalId');
  const serviceId      = searchParams.get('serviceId');
  const dateParam      = searchParams.get('date');

  if (!tenantId)       return n8nError('tenantId é obrigatório', 'MISSING_PARAM');
  if (!professionalId) return n8nError('professionalId é obrigatório', 'MISSING_PARAM');
  if (!serviceId)      return n8nError('serviceId é obrigatório', 'MISSING_PARAM');
  if (!dateParam)      return n8nError('date é obrigatório (formato YYYY-MM-DD)', 'MISSING_PARAM');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return n8nError('date deve estar no formato YYYY-MM-DD', 'INVALID_PARAM');
  }

  try {
    const clinica = await prisma.clinica.findFirst({
      where: { tenantId },
      select: { openingTime: true, closingTime: true },
    });
    if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);

    const servico = await prisma.servico.findFirst({
      where: { id: serviceId, tenantId, ativo: true },
      select: { duracaoMinutos: true, bufferTimeMinutes: true },
    });
    if (!servico) return n8nError('Serviço não encontrado', 'NOT_FOUND', 404);

    const prof = await prisma.profissional.findFirst({
      where: { id: professionalId, tenantId, ativo: true },
      select: { nome: true, id: true },
    });
    if (!prof) return n8nError('Profissional não encontrado', 'NOT_FOUND', 404);

    const data    = new Date(dateParam + 'T00:00:00-03:00');
    const fimDia  = new Date(dateParam + 'T23:59:59-03:00');
    const diaSemana = data.getDay();

    const escala = await prisma.professionalSchedule.findFirst({
      where: { profissionalId: professionalId, diaSemana, ativo: true },
    });

    if (!escala) {
      return n8nSuccess({
        date: dateParam,
        professionalId,
        professionalName: prof.nome,
        slots: [],
        listaBot: `${prof.nome} não atende neste dia. Tente outro dia da semana.`,
      });
    }

    // Agendamentos do dia para este profissional
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        profissionalId: professionalId,
        dataHora: { gte: data, lte: fimDia },
        status: { not: 'cancelado' },
      },
      select: { dataHora: true, fimDataHora: true, servico: { select: { bufferTimeMinutes: true } } },
    });

    const clinicaStart = toMin(clinica.openingTime ?? '08:00');
    const clinicaEnd   = toMin(clinica.closingTime ?? '18:00');
    const profStart    = Math.max(toMin(escala.horaInicio), clinicaStart);
    const profEnd      = Math.min(toMin(escala.horaFim), clinicaEnd);
    const lunchStart   = escala.lunchStart ? toMin(escala.lunchStart) : null;
    const lunchEnd     = escala.lunchEnd   ? toMin(escala.lunchEnd)   : null;

    const duracao = servico.duracaoMinutos;
    const buffer  = servico.bufferTimeMinutes ?? 0;

    const ocupados = agendamentos.map(ag => ({
      start:  dateToFortalezaMin(ag.dataHora),
      end:    dateToFortalezaMin(ag.fimDataHora),
      buffer: ag.servico?.bufferTimeMinutes ?? 0,
    }));

    // Data atual em Fortaleza — evitar slots passados
    const isHoje = new Date().toISOString().split('T')[0] === dateParam;
    const nowMin = isHoje ? dateToFortalezaMin(new Date()) : 0;

    const slots: string[] = [];
    for (let cur = profStart; cur + duracao <= profEnd; cur += INTERVALO) {
      if (isHoje && cur <= nowMin) continue;
      // Almoço
      if (lunchStart !== null && lunchEnd !== null && cur < lunchEnd && cur + duracao > lunchStart) continue;
      // Conflito com agendamentos existentes
      const slotEnd = cur + duracao + buffer;
      const conflito = ocupados.some(o => cur < o.end + Math.ceil(o.buffer / INTERVALO) * INTERVALO && slotEnd > o.start);
      if (conflito) continue;
      slots.push(fromMin(cur));
    }

    // Data formatada para exibição
    const dataFormatada = data.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza',
      weekday: 'long', day: '2-digit', month: '2-digit',
    });

    return n8nSuccess({
      date: dateParam,
      dateFormatted: dataFormatada,
      professionalId,
      professionalName: prof.nome,
      serviceId,
      total: slots.length,
      slots,
      // Máximo 3 opções para o agente não sobrecarregar o cliente:
      listaBot: slots.length === 0
        ? `Não há horários disponíveis em ${dataFormatada}. Tente outra data.`
        : `Horários disponíveis em ${dataFormatada}:\n`
          + slots.slice(0, 3).map((h, i) => `${i + 1}. ${h}`).join('\n')
          + (slots.length > 3 ? `\n_(e mais ${slots.length - 3} horários)_` : ''),
    });
  } catch (err) {
    console.error('[n8n/availability]', err);
    return n8nError('Erro ao buscar horários', 'INTERNAL_ERROR', 500);
  }
}
