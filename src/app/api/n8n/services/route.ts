import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarTokenInterno, UNAUTHORIZED } from '@/app/api/n8n/_middleware';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/n8n/services
 * Ferramenta: listar_servicos
 * Query: ?tenantId=xxx
 * Retorna serviços ativos com texto pronto para o agente enviar ao cliente.
 */
export async function GET(req: NextRequest) {
  if (!autenticarTokenInterno(req)) return UNAUTHORIZED();

  const tenantId = req.nextUrl.searchParams.get('tenantId');
  if (!tenantId) return n8nError('tenantId é obrigatório', 'MISSING_PARAM');

  try {
    const clinica = await prisma.clinica.findFirst({
      where: { tenantId },
      select: { nome: true, nicho: true },
    });
    if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);

    const servicos = await prisma.servico.findMany({
      where: { tenantId, ativo: true },
      select: { id: true, nome: true, duracaoMinutos: true, preco: true },
      orderBy: { nome: 'asc' },
    });

    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    return n8nSuccess({
      clinica: clinica.nome,
      total: servicos.length,
      servicos: servicos.map(s => ({
        id: s.id,
        nome: s.nome,
        duracaoMinutos: s.duracaoMinutos,
        duracao: `${s.duracaoMinutos} min`,
        preco: s.preco != null ? s.preco : null,
        precoFormatado: s.preco != null ? fmt.format(s.preco) : 'Consultar',
        // Texto pronto para o agente apresentar ao cliente:
        descricaoBot: `${s.nome} — ${s.duracaoMinutos}min${s.preco != null ? ` — ${fmt.format(s.preco)}` : ''}`,
      })),
      // Lista formatada para mensagem direta:
      listaBot: servicos
        .map((s, i) => `${i + 1}. ${s.nome} (${s.duracaoMinutos}min)${s.preco != null ? ` — ${fmt.format(s.preco)}` : ''}`)
        .join('\n'),
    });
  } catch (err) {
    console.error('[n8n/services]', err);
    return n8nError('Erro ao buscar serviços', 'INTERNAL_ERROR', 500);
  }
}
