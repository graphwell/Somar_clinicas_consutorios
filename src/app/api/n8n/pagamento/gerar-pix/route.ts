import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';
import { gerarPixBRCode } from '@/lib/pix-brcode';

export const dynamic = 'force-dynamic';

/**
 * POST /api/n8n/pagamento/gerar-pix
 * Body: { tenantId | slug, servicoId?, valor? }
 * Gera o BR Code PIX (copia e cola) para o cliente.
 * NUNCA retorna a chave crua — apenas o BR Code completo.
 */
export async function POST(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: { tenantId?: string; slug?: string; servicoId?: string; valor?: number };
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

    if (!pixConfig?.ativo || !pixConfig?.chave) {
      return n8nError('PIX não configurado para esta clínica', 'PIX_NOT_CONFIGURED', 404);
    }

    let valor = typeof body.valor === 'number' ? body.valor : 0;
    if (!valor && servicoId) {
      const servico = await prisma.servico.findFirst({
        where: { id: servicoId, tenantId: clinica.tenantId, ativo: true },
        select: { preco: true },
      });
      if (servico?.preco) valor = Number(servico.preco);
    }

    if (!valor || valor <= 0) {
      return n8nError(
        'Valor não informado ou inválido. Informe o valor do serviço.',
        'MISSING_VALUE',
        400,
      );
    }

    const nomePix = pixConfig.nomeFavorecido?.trim();
    const favorecido = (nomePix && nomePix.toLowerCase() !== 'synka') ? nomePix : clinica.nome;
    const brCode = gerarPixBRCode(pixConfig.chave, favorecido, valor);

    const msg =
      `Pagamento via PIX:\n\n` +
      `Copia e cola:\n${brCode}\n\n` +
      (pixConfig.banco ? `Banco: ${pixConfig.banco}\n` : '') +
      `Favorecido: ${favorecido}\n` +
      `Valor: R$ ${valor.toFixed(2)}\n\n` +
      `Apos realizar o pagamento, envie o comprovante para confirmar seu agendamento.`;

    return n8nSuccess({ msg, brCode, valor, favorecido });
  } catch (err) {
    console.error('[n8n/pagamento/gerar-pix]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
