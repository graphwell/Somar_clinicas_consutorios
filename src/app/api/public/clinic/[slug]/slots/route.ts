import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const INTERVALO = 30; // minutos entre slots

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fromMin(n: number): string {
  return `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;
}

/** Converte uma Date UTC para minutos no fuso America/Fortaleza (UTC-3) */
function dateToFortalezaMin(date: Date): number {
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
function nowFortalezaMin(): number {
  return dateToFortalezaMin(new Date());
}

/**
 * GET /api/public/clinic/[slug]/slots
 * Query params: data (YYYY-MM-DD), servicoId, profissionalId (opcional, pode ser 'qualquer')
 * Retorna: { slots: string[], profissionalEscolhidoId: string | null }
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  const { searchParams } = new URL(req.url);

  const dataParam = searchParams.get('data');
  const servicoId = searchParams.get('servicoId');
  let profissionalId = searchParams.get('profissionalId'); // pode ser 'qualquer' ou uuid

  if (!dataParam || !servicoId) {
    return NextResponse.json(
      { error: 'data e servicoId são obrigatórios' },
      { status: 400 }
    );
  }

  try {
    // 1. Buscar clínica pelo slug
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: {
        tenantId: true,
        openingTime: true,
        closingTime: true,
      },
    });

    if (!clinica) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // 2. Buscar serviço
    const servico = await prisma.servico.findFirst({
      where: { id: servicoId, tenantId: clinica.tenantId, ativo: true },
      select: {
        duracaoMinutos: true,
        bufferTimeMinutes: true,
        profissionais: { where: { ativo: true }, select: { id: true } },
      },
    });

    if (!servico) {
      return NextResponse.json({ error: 'serviço não encontrado' }, { status: 404 });
    }

    const duracao = servico.duracaoMinutos;
    const buffer = servico.bufferTimeMinutes ?? 0;
    const clinicaStart = toMin(clinica.openingTime ?? '08:00');
    const clinicaEnd = toMin(clinica.closingTime ?? '18:00');

    // IDs de profissionais que atendem este serviço
    const profIds = servico.profissionais.map(p => p.id);
    if (profIds.length === 0) {
      return NextResponse.json({ slots: [], profissionalEscolhidoId: null });
    }

    // 3. Normalizar profissionalId
    if (profissionalId === 'qualquer' || !profissionalId) {
      profissionalId = null; // null = buscar melhor entre todos
    } else {
      // Verificar se o profissional atende este serviço
      if (!profIds.includes(profissionalId)) {
        return NextResponse.json(
          { error: 'profissional não atende este serviço' },
          { status: 400 }
        );
      }
    }

    // 4. Montar filtro de profissionais
    const whereProf: { tenantId: string; ativo: boolean; id?: string | { in: string[] } } = {
      tenantId: clinica.tenantId,
      ativo: true,
    };
    if (profissionalId) {
      whereProf.id = profissionalId;
    } else {
      whereProf.id = { in: profIds };
    }

    // 5. Datas de início e fim do dia no fuso de Fortaleza
    const data = new Date(dataParam + 'T00:00:00-03:00');
    const fimDia = new Date(dataParam + 'T23:59:59-03:00');
    const diaSemana = data.getDay();

    // 6. Buscar profissionais com escalas e agendamentos do dia
    const profissionais = await prisma.profissional.findMany({
      where: whereProf,
      include: {
        escalas: { where: { diaSemana, ativo: true } },
        agendamentos: {
          where: {
            tenantId: clinica.tenantId,
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

    const isHoje =
      new Date().toISOString().split('T')[0] === dataParam;
    const nowMin = isHoje ? nowFortalezaMin() : 0;

    // 7. Calcular slots por profissional
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

    // 8. Se profissional específico foi escolhido, retornar os slots dele
    if (profissionalId && profSlotsMap[profissionalId] !== undefined) {
      return NextResponse.json({
        slots: profSlotsMap[profissionalId],
        profissionalEscolhidoId: profissionalId,
      });
    }

    // 9. Sem preferência: escolher profissional com mais slots disponíveis
    let bestId = '';
    let bestCount = -1;
    for (const [id, slots] of Object.entries(profSlotsMap)) {
      if (slots.length > bestCount) {
        bestCount = slots.length;
        bestId = id;
      }
    }

    return NextResponse.json({
      slots: profSlotsMap[bestId] ?? [],
      profissionalEscolhidoId: bestId || null,
    });
  } catch (err) {
    console.error('[public/slots]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
