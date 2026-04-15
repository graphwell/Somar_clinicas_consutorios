import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find(p => p.type === 'hour')?.value ?? '0') * 60
    + parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
}

/**
 * GET /api/public/clinic/[slug]/alternativas
 * Query: servicoId, profissionalId, data (YYYY-MM-DD), horario (HH:MM)
 * Retorna sugestões de alternativas quando slot está ocupado.
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  const { searchParams } = new URL(req.url);

  const servicoId     = searchParams.get('servicoId');
  const profissionalId = searchParams.get('profissionalId');
  const data          = searchParams.get('data');
  const horario       = searchParams.get('horario');

  if (!servicoId || !data) {
    return NextResponse.json({ error: 'servicoId e data são obrigatórios' }, { status: 400 });
  }

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: { tenantId: true, openingTime: true, closingTime: true },
    });
    if (!clinica) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const servico = await prisma.servico.findFirst({
      where: { id: servicoId, tenantId: clinica.tenantId, ativo: true },
      select: {
        duracaoMinutos: true,
        bufferTimeMinutes: true,
        profissionais: { where: { ativo: true }, select: { id: true, nome: true } },
      },
    });
    if (!servico) return NextResponse.json({ alternativas: [] });

    const duracao       = servico.duracaoMinutos;
    const buffer        = servico.bufferTimeMinutes ?? 0;
    const clinicaStart  = toMin(clinica.openingTime ?? '08:00');
    const clinicaEnd    = toMin(clinica.closingTime ?? '18:00');
    const diaSemana     = new Date(data + 'T00:00:00-03:00').getDay();
    const dataInicio    = new Date(data + 'T00:00:00-03:00');
    const dataFim       = new Date(data + 'T23:59:59-03:00');

    const profIds = servico.profissionais.map(p => p.id);
    const alternativas: any[] = [];

    // Buscar todos os profissionais do serviço com escalas e agendamentos
    const profissionais = await prisma.profissional.findMany({
      where: { tenantId: clinica.tenantId, ativo: true, id: { in: profIds } },
      include: {
        escalas: { where: { diaSemana, ativo: true } },
        agendamentos: {
          where: {
            tenantId: clinica.tenantId,
            dataHora: { gte: dataInicio, lte: dataFim },
            status: { not: 'cancelado' },
          },
          select: { dataHora: true, fimDataHora: true, servico: { select: { bufferTimeMinutes: true } } },
        },
      },
    });

    for (const prof of profissionais) {
      const escala = prof.escalas[0];
      if (!escala) continue;

      const profStart = Math.max(toMin(escala.horaInicio), clinicaStart);
      const profEnd   = Math.min(toMin(escala.horaFim), clinicaEnd);

      const ocupados = prof.agendamentos.map(a => ({
        start: dateToFortalezaMin(a.dataHora),
        end:   dateToFortalezaMin(a.fimDataHora),
        buf:   a.servico?.bufferTimeMinutes ?? 0,
      }));

      const slotsLivres: string[] = [];
      for (let cur = profStart; cur + duracao <= profEnd; cur += INTERVALO) {
        const fim = cur + duracao + buffer;
        const livre = ocupados.every(o => fim <= o.start || cur >= o.end + o.buf);
        if (livre) slotsLivres.push(fromMin(cur));
      }

      // Mesmo horário, outro profissional
      if (horario && prof.id !== profissionalId && slotsLivres.includes(horario)) {
        alternativas.push({
          tipo: 'outro_profissional',
          profissionalId: prof.id,
          profissional: prof.nome,
          horario,
          data,
        });
      }

      // Mesmo profissional, outros horários (até 3)
      if (prof.id === profissionalId) {
        const outros = slotsLivres.filter(s => s !== horario).slice(0, 3);
        for (const h of outros) {
          alternativas.push({
            tipo: 'outro_horario',
            profissionalId: prof.id,
            profissional: prof.nome,
            horario: h,
            data,
          });
        }
      }
    }

    return NextResponse.json({ alternativas: alternativas.slice(0, 4) });
  } catch (err) {
    console.error('[alternativas]', err);
    return NextResponse.json({ alternativas: [] });
  }
}
