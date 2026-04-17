import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

/**
 * GET /api/insumos/analytics?dias=30
 */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const dias = parseInt(new URL(req.url).searchParams.get('dias') || '30');
    const desde = new Date(Date.now() - dias * 86400000);
    const agora = new Date();

    // 1. Todos os insumos ativos
    const produtos = await prisma.produto.findMany({
      where: { tenantId, tipo: { in: ['insumo', 'ambos'] }, status: 'active' },
      select: {
        id: true, nome: true, unidade: true, estoque: true, estoqueMinimo: true,
        custoUnitario: true, dataValidade: true,
      },
    });

    // 2. Movimentações de baixa no período
    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: {
        tenantId,
        createdAt: { gte: desde },
        tipo: { in: ['baixa_auto', 'baixa_manual'] },
      },
      select: { produtoId: true, quantidade: true },
    });

    // 3. Fichas técnicas + custo por serviço
    const fichas = await prisma.insumoFichaTecnica.findMany({
      where: { tenantId },
      include: {
        produto: { select: { nome: true, custoUnitario: true, unidade: true } },
        servico: { select: { id: true, nome: true, preco: true } },
      },
    });

    const agendamentosConcluidos = await prisma.agendamento.count({
      where: { tenantId, status: 'done', dataHora: { gte: desde } },
    });

    // 4. Consumo por produto
    const consumoPorProduto: Record<string, number> = {};
    for (const mov of movimentacoes) {
      consumoPorProduto[mov.produtoId] = (consumoPorProduto[mov.produtoId] || 0) + Math.abs(mov.quantidade);
    }

    // 5. Alertas e previsões
    const alertas: Array<{
      tipo: string; severidade: 'critico' | 'atencao' | 'info';
      produtoId: string; produtoNome: string; mensagem: string; diasRestantes?: number;
    }> = [];

    const previsoes = produtos.map(p => {
      const consumoTotal = consumoPorProduto[p.id] || 0;
      const consumoDiario = dias > 0 ? consumoTotal / dias : 0;
      const diasRestantes = consumoDiario > 0 ? Math.floor(p.estoque / consumoDiario) : null;
      const dataRuptura = diasRestantes !== null
        ? new Date(Date.now() + diasRestantes * 86400000).toISOString().split('T')[0]
        : null;

      const alertasProduto: string[] = [];

      if (diasRestantes !== null && diasRestantes <= 7) {
        alertas.push({
          tipo: 'ruptura_iminente',
          severidade: diasRestantes <= 2 ? 'critico' : 'atencao',
          produtoId: p.id, produtoNome: p.nome,
          mensagem: `${p.nome} deve acabar em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}.`,
          diasRestantes,
        });
        alertasProduto.push('ruptura_iminente');
      }

      if (p.estoqueMinimo > 0 && p.estoque <= p.estoqueMinimo) {
        alertas.push({
          tipo: 'ruptura_iminente', severidade: 'atencao',
          produtoId: p.id, produtoNome: p.nome,
          mensagem: `${p.nome} está abaixo do mínimo (${p.estoque} ${p.unidade} / mín ${p.estoqueMinimo} ${p.unidade}).`,
        });
      }

      if (p.dataValidade) {
        const diasParaVencer = Math.ceil((p.dataValidade.getTime() - agora.getTime()) / 86400000);
        if (diasParaVencer < 0) {
          alertas.push({ tipo: 'vencido', severidade: 'critico', produtoId: p.id, produtoNome: p.nome, mensagem: `${p.nome} está vencido há ${Math.abs(diasParaVencer)} dias.` });
          alertasProduto.push('vencido');
        } else if (diasParaVencer <= 30) {
          alertas.push({ tipo: 'vencendo', severidade: diasParaVencer <= 7 ? 'critico' : 'atencao', produtoId: p.id, produtoNome: p.nome, mensagem: `${p.nome} vence em ${diasParaVencer} dias.`, diasRestantes: diasParaVencer });
          alertasProduto.push('vencendo');
        }
      }

      if (consumoTotal === 0 && p.estoque > 0) {
        alertas.push({ tipo: 'parado', severidade: 'info', produtoId: p.id, produtoNome: p.nome, mensagem: `${p.nome} não teve consumo nos últimos ${dias} dias.` });
        alertasProduto.push('parado');
      }

      return {
        produtoId: p.id, nome: p.nome, unidade: p.unidade,
        estoque: p.estoque, estoqueMinimo: p.estoqueMinimo,
        consumoNosPeriodo: consumoTotal,
        consumoDiario: Math.round(consumoDiario * 1000) / 1000,
        diasRestantes, dataRupturaPrevista: dataRuptura,
        alertas: alertasProduto,
      };
    });

    // 6. Custo por serviço
    const custoMap: Record<string, { servicoId: string; servicoNome: string; precoServico: number; custoInsumos: number; itens: number }> = {};
    for (const f of fichas) {
      if (!custoMap[f.servicoId]) {
        custoMap[f.servicoId] = { servicoId: f.servicoId, servicoNome: f.servico.nome, precoServico: f.servico.preco, custoInsumos: 0, itens: 0 };
      }
      custoMap[f.servicoId].custoInsumos += f.quantidadeEst * f.produto.custoUnitario;
      custoMap[f.servicoId].itens++;
    }
    const custosServico = Object.values(custoMap).map(s => ({
      ...s,
      margemPct: s.precoServico > 0 ? Math.round(((s.precoServico - s.custoInsumos) / s.precoServico) * 100) : null,
    }));

    return NextResponse.json({
      periodo: { dias, desde: desde.toISOString() },
      agendamentosConcluidos,
      alertas: alertas.sort((a, b) => { const o = { critico: 0, atencao: 1, info: 2 }; return o[a.severidade] - o[b.severidade]; }),
      previsoes: previsoes.sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999)),
      custosServico,
    });
  } catch (error: any) {
    console.error('[insumos/analytics]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
