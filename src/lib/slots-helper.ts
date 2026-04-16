import prisma from '@/lib/prisma';

const INTERVALO = 30; // minutos entre slots

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMin(n: number): string {
  return `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;
}

/** Converte uma Date UTC para minutos no fuso America/Fortaleza (UTC-3) */
export function dateToFortalezaMin(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0');
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

/** Minutos atuais em Fortaleza */
export function nowFortalezaMin(): number {
  return dateToFortalezaMin(new Date());
}

export interface CalculateSlotsParams {
  tenantId: string;
  dataParam: string; // YYYY-MM-DD
  servicoId: string;
  profissionalId?: string | null; // pode ser omitido
  clinicaStart: number;
  clinicaEnd: number;
}

export async function calcularSlotsDisponiveis({
  tenantId,
  dataParam,
  servicoId,
  profissionalId,
  clinicaStart,
  clinicaEnd
}: CalculateSlotsParams): Promise<{ slots: string[], profissionalEscolhidoId: string | null }> {
  
  // 1. Buscar serviço
  const servico = await prisma.servico.findFirst({
    where: { id: servicoId, tenantId, ativo: true },
    select: {
      duracaoMinutos: true,
      bufferTimeMinutes: true,
      profissionais: { where: { ativo: true }, select: { id: true } },
    },
  });

  if (!servico) {
    throw new Error('SERVICO_NAO_ENCONTRADO');
  }

  const duracao = servico.duracaoMinutos;
  const buffer = servico.bufferTimeMinutes ?? 0;

  // IDs de profissionais que atendem este serviço
  const profIds = servico.profissionais.map(p => p.id);
  if (profIds.length === 0) {
    return { slots: [], profissionalEscolhidoId: null };
  }

  // 2. Normalizar profissionalId
  let profIdFiltro = profissionalId;
  if (profIdFiltro === 'qualquer' || !profIdFiltro) {
    profIdFiltro = null;
  } else {
    // Verificar se o profissional atende este serviço
    if (!profIds.includes(profIdFiltro)) {
      throw new Error('PROFISSIONAL_NAO_ATENDE_SERVICO');
    }
  }

  // 3. Montar filtro de profissionais
  const whereProf: { tenantId: string; ativo: boolean; id?: string | { in: string[] } } = {
    tenantId,
    ativo: true,
  };
  if (profIdFiltro) {
    whereProf.id = profIdFiltro;
  } else {
    whereProf.id = { in: profIds };
  }

  // 4. Datas de início e fim do dia no fuso de Fortaleza
  const data = new Date(dataParam + 'T00:00:00-03:00');
  const fimDia = new Date(dataParam + 'T23:59:59-03:00');
  const diaSemana = data.getDay();

  // 5. Buscar profissionais com escalas e agendamentos do dia
  const profissionais = await prisma.profissional.findMany({
    where: whereProf,
    include: {
      escalas: { where: { diaSemana, ativo: true } },
      agendamentos: {
        where: {
          tenantId,
          dataHora: { gte: data, lte: fimDia },
          status: { not: 'cancelado' },
        },
        select: {
          dataHora: true,
          fimDataHora: true,
          servico: { select: { bufferTimeMinutes: true } },
        },
      },
    },
  });

  const isHoje = new Date().toISOString().split('T')[0] === dataParam;
  const nowMin = isHoje ? nowFortalezaMin() : 0;

  // 6. Calcular slots por profissional
  const profSlotsMap: Record<string, string[]> = {};

  for (const prof of profissionais) {
    const escala = prof.escalas[0];
    if (!escala) continue; // não trabalha nesse dia

    const profStart = Math.max(toMin(escala.horaInicio), clinicaStart);
    const profEnd = Math.min(toMin(escala.horaFim), clinicaEnd);
    const lunchStart = escala.lunchStart ? toMin(escala.lunchStart) : null;
    const lunchEnd = escala.lunchEnd ? toMin(escala.lunchEnd) : null;

    const ocupados = prof.agendamentos.map(a => ({
      start: dateToFortalezaMin(a.dataHora),
      end: dateToFortalezaMin(a.fimDataHora),
      buffer: a.servico?.bufferTimeMinutes ?? 0,
    }));

    const slots: string[] = [];

    for (let cur = profStart; cur + duracao <= profEnd; cur += INTERVALO) {
      // Ignorar horários passados
      if (isHoje && cur <= nowMin) continue;

      const slotEnd = cur + duracao + buffer;

      // Verificar sobreposição com almoço
      if (lunchStart !== null && lunchEnd !== null) {
        if (cur < lunchEnd && slotEnd > lunchStart) continue;
      }

      // Verificar conflitos com agendamentos existentes
      const conflito = ocupados.some(o => {
        const bloqueioFim = o.end + o.buffer;
        return cur < bloqueioFim && slotEnd > o.start;
      });
      if (conflito) continue;

      slots.push(fromMin(cur));
    }

    profSlotsMap[prof.id] = slots;
  }

  // 7. Se profissional específico foi escolhido, retornar os slots dele
  if (profIdFiltro && profSlotsMap[profIdFiltro] !== undefined) {
    return {
      slots: profSlotsMap[profIdFiltro],
      profissionalEscolhidoId: profIdFiltro,
    };
  }

  // 8. Sem preferência: escolher profissional com mais slots disponíveis
  let bestId = '';
  let bestCount = -1;
  for (const [id, slots] of Object.entries(profSlotsMap)) {
    if (slots.length > bestCount) {
      bestCount = slots.length;
      bestId = id;
    }
  }

  return {
    slots: profSlotsMap[bestId] ?? [],
    profissionalEscolhidoId: bestId || null,
  };
}
