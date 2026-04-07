import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/n8n/servicos
 * Query: ?slug=barbearia-demo-synka
 * Lista serviços ativos com texto pronto para WhatsApp.
 */
export async function GET(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return n8nError('Parâmetro slug obrigatório', 'MISSING_PARAM');

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: { tenantId: true, nome: true },
    });
    if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);

    const servicos = await prisma.servico.findMany({
      where: { tenantId: clinica.tenantId, ativo: true },
      select: { id: true, nome: true, duracaoMinutos: true, preco: true },
      orderBy: { nome: 'asc' },
    });

    return n8nSuccess({
      clinica: clinica.nome,
      servicos: servicos.map(s => ({
        id: s.id,
        nome: s.nome,
        duracao: `${s.duracaoMinutos} min`,
        preco: s.preco != null
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.preco)
          : null,
        descricaoBot: `${s.nome} — ${s.duracaoMinutos}min${s.preco != null ? ` — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.preco)}` : ''}`,
      })),
    });
  } catch (err) {
    console.error('[n8n/servicos]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
