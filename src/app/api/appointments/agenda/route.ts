import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

const INTERVALO = 30; // minutos por slot

export type TipoSlot = 'livre' | 'ocupado' | 'almoco' | 'folga' | 'fechado' | 'buffer';

export interface SlotOutput {
  horario: string;
  horarioFim: string;
  tipo: TipoSlot;
  agendamento: AgendamentoData | null;
  clicavel: boolean;
}

interface AgendamentoData {
  id: string;
  pacienteNome: string;
  pacienteTelefone: string | null;
  dataHora: string;
  fimDataHora: string;
  durationMinutes: number;
  status: string;
  servico: { nome: string; color: string | null; bufferTimeMinutes: number } | null;
  convenio: string | null;
  observacoes: string | null;
}

/* ── Helpers de tempo ─────────────────────────────────────── */
function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function fromMin(total: number): string {
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}

/** Extrai HH:MM no fuso America/Fortaleza de um objeto Date UTC */
function dateToSPMin(date: Date): number {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

/* ── Gerador de slots ─────────────────────────────────────── */
function gerarSlots(opts: {
  clinicaStart: number;
  clinicaEnd: number;
  trabalhaNoDia: boolean;
  profStart: number;
  profEnd: number;
  lunchStart: number | null;
  lunchEnd: number | null;
  agendamentos: Array<{
    raw: { dataHora: Date; fimDataHora: Date; servico: { bufferTimeMinutes: number } | null };
    formatted: AgendamentoData;
  }>;
}): SlotOutput[] {
  const { clinicaStart, clinicaEnd, trabalhaNoDia, profStart, profEnd, lunchStart, lunchEnd, agendamentos } = opts;
  const slots: SlotOutput[] = [];

  const agInfos = agendamentos.map(({ raw, formatted }) => ({
    formatted,
    start: dateToSPMin(raw.dataHora),
    end: dateToSPMin(raw.fimDataHora),
    buffer: raw.servico?.bufferTimeMinutes ?? 0,
  }));

  for (let cur = clinicaStart; cur < clinicaEnd; cur += INTERVALO) {
    const horario = fromMin(cur);
    const horarioFim = fromMin(cur + INTERVALO);

    // REGRA 1: prof não trabalha hoje
    if (!trabalhaNoDia) {
      slots.push({ horario, horarioFim, tipo: 'folga', agendamento: null, clicavel: false });
      continue;
    }

    // REGRA 2: fora do horário do profissional
    if (cur < profStart || cur >= profEnd) {
      slots.push({ horario, horarioFim, tipo: 'fechado', agendamento: null, clicavel: false });
      continue;
    }

    // REGRA 3: almoço
    if (lunchStart !== null && lunchEnd !== null && cur >= lunchStart && cur < lunchEnd) {
      slots.push({ horario, horarioFim, tipo: 'almoco', agendamento: null, clicavel: false });
      continue;
    }

    // REGRA 4: slot ocupado por agendamento
    const ocupadoInfo = agInfos.find((info) => cur >= info.start && cur < info.end);
    if (ocupadoInfo) {
      const isFirst = cur === ocupadoInfo.start;
      slots.push({
        horario,
        horarioFim,
        tipo: 'ocupado',
        agendamento: isFirst ? ocupadoInfo.formatted : null,
        clicavel: false,
      });
      continue;
    }

    // REGRA 5: buffer após agendamento (arredonda p/ múltiplo do intervalo)
    const bufferInfo = agInfos.find((info) => {
      if (info.buffer <= 0) return false;
      const bufEnd = info.end + Math.floor(info.buffer / INTERVALO) * INTERVALO;
      return cur >= info.end && cur < bufEnd;
    });
    if (bufferInfo) {
      slots.push({ horario, horarioFim, tipo: 'buffer', agendamento: null, clicavel: false });
      continue;
    }

    slots.push({ horario, horarioFim, tipo: 'livre', agendamento: null, clicavel: true });
  }

  return slots;
}

/* ── Route handler ────────────────────────────────────────── */
export async function GET(req: Request) {
  try {
    const { tenantId, role, profissionalId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);

    const dataParam = searchParams.get('data') || new Date().toISOString().split('T')[0];
    // Usar -03:00 para garantir intervalo correto no horário de Brasília/Fortaleza
    const data = new Date(dataParam + 'T00:00:00-03:00');
    const fimDia = new Date(dataParam + 'T23:59:59-03:00');

    const diaSemana = data.getDay(); // 0=Dom … 6=Sáb

    // Clínica — horário de funcionamento
    const clinica = await prisma.clinica.findUnique({
      where: { tenantId },
      select: { openingTime: true, closingTime: true },
    });
    const clinicaStart = toMin(clinica?.openingTime ?? '08:00');
    const clinicaEnd = toMin(clinica?.closingTime ?? '18:00');

    // Profissionais
    const whereProf: any = { tenantId, ativo: true };
    if (role === 'profissional' && profissionalId) {
      whereProf.id = profissionalId;
    }

    const profissionais = await prisma.profissional.findMany({
      where: whereProf,
      include: {
        // Busca TODAS as escalas ativas para detectar se o prof tem alguma configurada
        escalas: { where: { ativo: true } },
        agendamentos: {
          where: {
            tenantId,
            dataHora: { gte: data, lte: fimDia },
            status: { not: 'cancelado' },
          },
          include: {
            paciente: { select: { nome: true, telefone: true } },
            servico: { select: { nome: true, color: true, bufferTimeMinutes: true } },
          },
          orderBy: { dataHora: 'asc' },
        },
      },
      orderBy: { nome: 'asc' },
    });

    console.log(`[agenda] data=${dataParam} diaSemana=${diaSemana} profs=${profissionais.length}:`, profissionais.map(p => `${p.nome}(escalas=${p.escalas.length})`));

    const result = profissionais.map((prof) => {
      // Escala do dia específico
      const escala = prof.escalas.find((e) => e.diaSemana === diaSemana) || null;
      // Se prof NÃO tem NENHUMA escala cadastrada → trata como trabalhando (usa horário da clínica)
      const temEscalasCadastradas = prof.escalas.length > 0;
      const trabalhaNoDia = temEscalasCadastradas ? !!escala : true;

      const horarioInicio = escala?.horaInicio ?? clinica?.openingTime ?? '08:00';
      const horarioFim = escala?.horaFim ?? clinica?.closingTime ?? '18:00';
      const lunchStart = escala?.lunchStart ? toMin(escala.lunchStart) : null;
      const lunchEnd = escala?.lunchEnd ? toMin(escala.lunchEnd) : null;

      const agendamentosInput = prof.agendamentos.map((ag) => ({
        raw: {
          dataHora: ag.dataHora,
          fimDataHora: ag.fimDataHora,
          servico: ag.servico,
        },
        formatted: {
          id: ag.id,
          pacienteNome: ag.paciente.nome,
          pacienteTelefone: ag.paciente.telefone,
          dataHora: ag.dataHora.toISOString(),
          fimDataHora: ag.fimDataHora.toISOString(),
          durationMinutes: ag.durationMinutes,
          status: ag.status,
          servico: ag.servico
            ? { nome: ag.servico.nome, color: ag.servico.color, bufferTimeMinutes: ag.servico.bufferTimeMinutes }
            : null,
          convenio: ag.convenio,
          observacoes: ag.observacoes,
        } as AgendamentoData,
      }));

      const slots = gerarSlots({
        clinicaStart,
        clinicaEnd,
        trabalhaNoDia,
        profStart: toMin(horarioInicio),
        profEnd: toMin(horarioFim),
        lunchStart,
        lunchEnd,
        agendamentos: agendamentosInput,
      });

      const slotsOcupados = slots.filter((s) => s.tipo === 'ocupado' && s.agendamento !== null).length;
      const slotsLivres = slots.filter((s) => s.tipo === 'livre').length;

      return {
        id: prof.id,
        nome: prof.nome,
        especialidade: prof.especialidade,
        color: prof.color || '#4a4ae2',
        fotoUrl: prof.fotoUrl,
        horarioInicio,
        horarioFim,
        lunchStart: escala?.lunchStart ?? null,
        lunchEnd: escala?.lunchEnd ?? null,
        trabalhaNoDia,
        agendamentos: agendamentosInput.map((a) => a.formatted),
        slots,
        slotsOcupados,
        slotsLivres,
      };
    });

    return NextResponse.json({
      data: dataParam,
      clinicaOpeningTime: clinica?.openingTime ?? '08:00',
      clinicaClosingTime: clinica?.closingTime ?? '18:00',
      profissionais: result,
    });
  } catch (error: any) {
    console.error('Erro na agenda:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
