import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarTokenInterno, UNAUTHORIZED } from '@/app/api/n8n/_middleware';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function diasAtendimento(escalas: { diaSemana: number }[]): string {
  const nomes = Array.from(new Set(escalas.map(e => e.diaSemana)))
    .sort()
    .map(d => DIAS[d]);
  if (nomes.length === 0) return 'Horário a definir';
  if (nomes.length <= 2) return nomes.join(' e ');
  return nomes.slice(0, -1).join(', ') + ' e ' + nomes.at(-1);
}

/**
 * GET /api/n8n/professionals
 * Ferramenta: listar_profissionais
 * Query: ?tenantId=xxx  [&serviceId=yyy]
 * Retorna profissionais ativos, opcionalmente filtrados por serviço.
 */
export async function GET(req: NextRequest) {
  if (!autenticarTokenInterno(req)) return UNAUTHORIZED();

  const tenantId  = req.nextUrl.searchParams.get('tenantId');
  const serviceId = req.nextUrl.searchParams.get('serviceId');

  if (!tenantId) return n8nError('tenantId é obrigatório', 'MISSING_PARAM');

  try {
    let profissionais: Array<{
      id: string; nome: string; especialidade: string | null;
      escalas: { diaSemana: number }[];
    }>;

    if (serviceId) {
      const servico = await prisma.servico.findFirst({
        where: { id: serviceId, tenantId, ativo: true },
        include: {
          profissionais: {
            where: { ativo: true },
            include: { escalas: { where: { ativo: true }, select: { diaSemana: true } } },
          },
        },
      });
      if (!servico) return n8nError('Serviço não encontrado', 'NOT_FOUND', 404);
      profissionais = servico.profissionais;
    } else {
      profissionais = await prisma.profissional.findMany({
        where: { tenantId, ativo: true },
        include: { escalas: { where: { ativo: true }, select: { diaSemana: true } } },
        orderBy: { nome: 'asc' },
      });
    }

    if (profissionais.length === 0) {
      return n8nSuccess({
        total: 0,
        profissionais: [],
        listaBot: 'Nenhum profissional disponível no momento.',
      });
    }

    return n8nSuccess({
      total: profissionais.length,
      profissionais: profissionais.map(p => ({
        id: p.id,
        nome: p.nome,
        especialidade: p.especialidade ?? null,
        diasAtendimento: diasAtendimento(p.escalas),
        // Texto pronto para o agente apresentar:
        descricaoBot: `👤 ${p.nome}${p.especialidade ? ` — ${p.especialidade}` : ''}`,
      })),
      listaBot: profissionais
        .map((p, i) => `${i + 1}. ${p.nome}${p.especialidade ? ` (${p.especialidade})` : ''}`)
        .join('\n'),
    });
  } catch (err) {
    console.error('[n8n/professionals]', err);
    return n8nError('Erro ao buscar profissionais', 'INTERNAL_ERROR', 500);
  }
}
