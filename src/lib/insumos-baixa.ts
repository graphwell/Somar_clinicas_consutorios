/**
 * Utilitário de baixa automática de insumos.
 * Chamado ao concluir um agendamento.
 */
import prisma from '@/lib/prisma';

export async function baixarInsumosDoAtendimento(params: {
  agendamentoId: string;
  servicoId: string;
  profissionalId: string | null;
  tenantId: string;
}): Promise<{ baixadas: number; erros: string[] }> {
  const { agendamentoId, servicoId, profissionalId, tenantId } = params;

  const fichas = await prisma.insumoFichaTecnica.findMany({
    where: { servicoId, tenantId },
    include: { produto: true },
  });

  if (fichas.length === 0) return { baixadas: 0, erros: [] };

  const erros: string[] = [];
  let baixadas = 0;

  for (const ficha of fichas) {
    try {
      const produto = await prisma.produto.findFirst({
        where: { id: ficha.produtoId, tenantId, status: 'active' },
      });

      if (!produto) {
        erros.push(`Produto ${ficha.produto.nome} não encontrado ou inativo`);
        continue;
      }

      const qtdBaixa = ficha.quantidadeEst;
      const novoSaldo = Math.max(0, produto.estoque - qtdBaixa);

      await prisma.produto.update({
        where: { id: produto.id },
        data: { estoque: novoSaldo },
      });

      await prisma.movimentacaoEstoque.create({
        data: {
          tenantId,
          produtoId: produto.id,
          tipo: 'baixa_auto',
          quantidade: -qtdBaixa,
          saldoAntes: produto.estoque,
          saldoDepois: novoSaldo,
          agendamentoId,
          profissionalId: profissionalId || null,
          observacao: 'Baixa automática — atendimento concluído',
        },
      });

      baixadas++;
    } catch (err: any) {
      erros.push(`Erro ao baixar ${ficha.produto.nome}: ${err.message}`);
    }
  }

  return { baixadas, erros };
}
