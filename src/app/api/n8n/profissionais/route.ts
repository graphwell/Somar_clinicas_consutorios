import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDias(escalas: { diaSemana: number }[]): string {
  const nomes = Array.from(new Set(escalas.map(e => e.diaSemana)))
    .sort()
    .map(d => DIAS[d]);
  if (nomes.length === 0) return 'Não definido';
  if (nomes.length === 1) return nomes[0];
  return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
}

/**
 * GET /api/n8n/profissionais
 * Query: ?slug=xxx  e opcionalmente &servicoId=xxx
 * Lista profissionais com texto pronto para WhatsApp.
 */
export async function GET(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  const slug = req.nextUrl.searchParams.get('slug');
  const tenantIdParam = req.nextUrl.searchParams.get('tenantId');
  const servicoId = req.nextUrl.searchParams.get('servicoId');
  if (!slug && !tenantIdParam) return n8nError('Parâmetro slug ou tenantId obrigatório', 'MISSING_PARAM');

  try {
    const clinica = slug
      ? await prisma.clinica.findUnique({ where: { slug }, select: { tenantId: true } })
      : await prisma.clinica.findUnique({ where: { tenantId: tenantIdParam! }, select: { tenantId: true } });
    if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);

    let profissionais;
    if (servicoId) {
      const servico = await prisma.servico.findFirst({
        where: { id: servicoId, tenantId: clinica.tenantId, ativo: true },
        include: {
          profissionais: {
            where: { ativo: true },
            include: { escalas: { where: { ativo: true } } },
          },
        },
      });
      // Se não encontrou vínculo serviço→profissional, retorna todos (fallback)
      if (!servico || servico.profissionais.length === 0) {
        console.warn(`[profissionais] sem vínculos para servicoId=${servicoId} — retornando todos`);
        profissionais = await prisma.profissional.findMany({
          where: { tenantId: clinica.tenantId, ativo: true },
          include: { escalas: { where: { ativo: true } } },
          orderBy: { nome: 'asc' },
        });
      } else {
        profissionais = servico.profissionais;
      }
    } else {
      profissionais = await prisma.profissional.findMany({
        where: { tenantId: clinica.tenantId, ativo: true },
        include: { escalas: { where: { ativo: true } } },
        orderBy: { nome: 'asc' },
      });
    }

    return n8nSuccess({
      profissionais: profissionais.map(p => ({
        id: p.id,
        nome: p.nome,
        especialidade: p.especialidade ?? null,
        diasAtendimento: formatDias(p.escalas),
        descricaoBot: `${p.nome}${p.especialidade ? ` - ${p.especialidade}` : ''}`,
      })),
    });
  } catch (err) {
    console.error('[n8n/profissionais]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
