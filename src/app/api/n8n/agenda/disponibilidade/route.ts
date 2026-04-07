import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
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
    timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find(p => p.type === 'hour')?.value ?? '0') * 60
    + parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
}

/**
 * GET /api/n8n/agenda/disponibilidade
 * Query: ?slug=xxx&servicoId=xxx&data=YYYY-MM-DD  [&profissionalId=xxx]
 * Retorna slots disponíveis por profissional.
 */
export async function GET(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  const { searchParams } = req.nextUrl;
  const slug = searchParams.get('slug');
  const servicoId = searchParams.get('servicoId');
  const dataParam = searchParams.get('data');
  const profissionalIdParam = searchParams.get('profissionalId');

  if (!slug || !servicoId || !dataParam) {
    return n8nError('slug, servicoId e data são obrigatórios', 'MISSING_PARAM');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataParam)) {
    return n8nError('data deve estar no formato YYYY-MM-DD', 'INVALID_PARAM');
  }

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: { tenantId: true, openingTime: true, closingTime: true },
    });
    if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);

    const servico = await prisma.servico.findFirst({
      where: { id: servicoId, tenantId: clinica.tenantId, ativo: true },
      select: {
        duracaoMinutos: true,
        bufferTimeMinutes: true,
        profissionais: { where: { ativo: true }, select: { id: true } },
      },
    });
    if (!servico) return n8nError('Serviço não encontrado', 'NOT_FOUND', 404);

    const duracao = servico.duracaoMinutos;
    const buffer = servico.bufferTimeMinutes ?? 0;
    const clinicaStart = toMin(clinica.openingTime ?? '08:00');
    const clinicaEnd = toMin(clinica.closingTime ?? '18:00');

    let profIds = servico.profissionais.map(p => p.id);
    if (profIds.length === 0) return n8nSuccess({ data: dataParam, profissionais: [] });

    if (profissionalIdParam && profissionalIdParam !== 'qualquer') {
      if (!profIds.includes(profissionalIdParam)) {
        return n8nError('Profissional não atende este serviço', 'INVALID_PARAM');
      }
      profIds = [profissionalIdParam];
    }

    const data = new Date(dataParam + 'T00:00:00-03:00');
    const fimDia = new Date(dataParam + 'T23:59:59-03:00');
    const diaSemana = data.getDay();

    const profissionais = await prisma.profissional.findMany({
      where: { tenantId: clinica.tenantId, ativo: true, id: { in: profIds } },
      select: {
        id: true,
        nome: true,
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

    const isHoje = new Date().toISOString().split('T')[0] === dataParam;
    const nowMin = isHoje ? dateToFortalezaMin(new Date()) : 0;

    const resultado = profissionais.flatMap(prof => {
      const escala = prof.escalas[0];
      if (!escala) return [];

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
        if (isHoje && cur <= nowMin) continue;
        const slotEnd = cur + duracao + buffer;
        if (lunchStart !== null && lunchEnd !== null && cur < lunchEnd && slotEnd > lunchStart) continue;
        const conflito = ocupados.some(o => cur < o.end + o.buffer && slotEnd > o.start);
        if (conflito) continue;
        slots.push(fromMin(cur));
      }

      return [{ id: prof.id, nome: prof.nome, slots }];
    });

    return n8nSuccess({ data: dataParam, profissionais: resultado });
  } catch (err) {
    console.error('[n8n/agenda/disponibilidade]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
