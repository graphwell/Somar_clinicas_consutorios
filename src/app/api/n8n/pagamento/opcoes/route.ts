import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/n8n/pagamento/opcoes
 * Body: { tenantId | slug, servicoId? }
 * Retorna as opções de pagamento disponíveis para o agendamento.
 * Chamado ANTES da confirmação — o bot apresenta as opções ao cliente.
 */
export async function POST(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: { tenantId?: string; slug?: string; servicoId?: string };
  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { tenantId: rawTenantId, slug, servicoId } = body;

  try {
    let clinica = null;
    if (slug) {
      clinica = await prisma.clinica.findUnique({
        where: { slug },
        select: { tenantId: true, nome: true },
      });
    } else if (rawTenantId) {
      clinica = await prisma.clinica.findUnique({
        where: { tenantId: rawTenantId },
        select: { tenantId: true, nome: true },
      });
    }
    if (!clinica) return n8nError('Clínica não encontrada', 'NOT_FOUND', 404);

    const pixConfig = await prisma.pixConfig.findUnique({
      where: { tenantId: clinica.tenantId },
    });

    let valorServico: number | null = null;
    if (servicoId) {
      const servico = await prisma.servico.findFirst({
        where: { id: servicoId, tenantId: clinica.tenantId, ativo: true },
        select: { preco: true, nome: true },
      });
      if (servico?.preco) valorServico = Number(servico.preco);
    }

    const temPix = !!(pixConfig?.ativo && pixConfig?.chave);
    const valorStr = valorServico ? `R$ ${valorServico.toFixed(2)}` : null;

    if (!temPix) {
      return n8nSuccess({
        temOpcoes: false,
        msg: valorStr
          ? `O valor do serviço é ${valorStr}. O pagamento pode ser realizado presencialmente no dia do atendimento.`
          : 'O pagamento pode ser realizado presencialmente no dia do atendimento.',
      });
    }

    const linhaValor = valorStr ? ` (${valorStr})` : '';
    const msg =
      `Como deseja realizar o pagamento${linhaValor}?\n\n` +
      `1 - PIX\n` +
      `2 - Cartao de credito/debito (presencial)\n` +
      `3 - Pagamento no dia\n\n` +
      `Responda com o numero da opcao desejada.`;

    return n8nSuccess({ temOpcoes: true, msg, temPix, valorServico });
  } catch (err) {
    console.error('[n8n/pagamento/opcoes]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
