import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantFromRequest } from '@/lib/auth-utils';

/**
 * GET /api/insumos/analytics?dias=30
 * Retorna: alertas, consumo por produto, custo por serviço, previsão de ruptura
 */
export async function GET(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const dias = parseInt(new URL(req.url).searchParams.get('dias') || '30');
  const desde = new Date(Date.now() - dias * 86400000);
  const agora = new Date();

  // 1. Todos os produtos ativos
  const produtos = await prisma.produto.findMany({
    where: { tenantId: tenant.tenantId, tipo: { in: ['insumo', 'ambos'] }, status: 'active' },
    select: {
      id: true, nome: true, unidade: true, estoque: true, estoqueMinimo: true,
      custoUnitario: true, dataValidade: true,
    },
  });

  // 2. Movimentações do período (baixas)
  const movimentacoes = await prisma.movimentacaoEstoque.findMany({
    where: {
      tenantId: tenant.tenantId,
      createdAt: { gte: desde },
      tipo: { in: ['baixa_auto', 'baixa_manual'] },
    },
    select: { produtoId: true, quantidade: true, agendamentoId: true, createdAt: true },
  });

  // 3. Fichas técnicas + número de atendimentos para calcular custo por serviço
  const fichas = await prisma.insumoFichaTecnica.findMany({
    where: { tenantId: tenant.tenantId },
    include: {
      produto: { select: { nome: true, custoUnitario: true, unidade: true } },
      servico: { select: { id: true, nome: true, preco: true } },
    },
  });

  const agendamentosConcluidos = await prisma.agendamento.count({
    where: {
      tenantId: tenant.tenantId,
      status: 'done',
      dataHora: { gte: desde },
    },
  });

  // 4. Calcular consumo por produto
  const consumoPorProduto: Record<string, number> = {};
  for (const mov of movimentacoes) {
    consumoPorProduto[mov.produtoId] = (consumoPorProduto[mov.produtoId] || 0) + Math.abs(mov.quantidade);
  }

  // 5. Alertas inteligentes
  const alertas: Array<{
    tipo: 'ruptura_iminente' | 'vencendo' | 'vencido' | 'parado' | 'acima_padrao',
    severidade: 'critico' | 'atencao' | 'info',
    produtoId: string,
    produtoNome: string,
    mensagem: string,
    diasRestantes?: number,
  }> = [];

  const previsoes: Array<{
    produtoId: string,
    nome: string,
    unidade: string,
    estoque: number,
    estoqueMinimo: number,
    consumoNosPeriodo: number,
    consumoDiario: number,
    diasRestantes: number | null,
    dataRupturaPrevista: string | null,
    alertas: string[],
  }> = [];

  for (const p of produtos) {
    const consumoTotal = consumoPorProduto[p.id] || 0;
    const consumoDiario = dias > 0 ? consumoTotal / dias : 0;
    const diasRestantes = consumoDiario > 0 ? Math.floor(p.estoque / consumoDiario) : null;
    const dataRuptura = diasRestantes !== null
      ? new Date(Date.now() + diasRestantes * 86400000).toISOString().split('T')[0]
      : null;

    const alertasProduto: string[] = [];

    // Ruptura iminente (≤7 dias)
    if (diasRestantes !== null && diasRestantes <= 7) {
      alertas.push({
        tipo: 'ruptura_iminente',
        severidade: diasRestantes <= 2 ? 'critico' : 'atencao',
        produtoId: p.id,
        produtoNome: p.nome,
        mensagem: `${p.nome} deve acabar em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}.`,
        diasRestantes,
      });
      alertasProduto.push('ruptura_iminente');
    }

    // Estoque abaixo do mínimo
    if (p.estoqueMinimo > 0 && p.estoque <= p.estoqueMinimo) {
      alertas.push({
        tipo: 'ruptura_iminente',
        severidade: 'atencao',
        produtoId: p.id,
        produtoNome: p.nome,
        mensagem: `${p.nome} está abaixo do estoque mínimo (${p.estoque} ${p.unidade} / mín ${p.estoqueMinimo} ${p.unidade}).`,
      });
    }

    // Vencimento
    if (p.dataValidade) {
      const diasParaVencer = Math.ceil((p.dataValidade.getTime() - agora.getTime()) / 86400000);
      if (diasParaVencer < 0) {
        alertas.push({
          tipo: 'vencido',
          severidade: 'critico',
          produtoId: p.id,
          produtoNome: p.nome,
          mensagem: `${p.nome} está vencido há ${Math.abs(diasParaVencer)} dias.`,
        });
        alertasProduto.push('vencido');
      } else if (diasParaVencer <= 30) {
        alertas.push({
          tipo: 'vencendo',
          severidade: diasParaVencer <= 7 ? 'critico' : 'atencao',
          produtoId: p.id,
          produtoNome: p.nome,
          mensagem: `${p.nome} vence em ${diasParaVencer} dias.`,
          diasRestantes: diasParaVencer,
        });
        alertasProduto.push('vencendo');
      }
    }

    // Produto parado (sem consumo no período)
    if (consumoTotal === 0 && p.estoque > 0) {
      alertas.push({
        tipo: 'parado',
        severidade: 'info',
        produtoId: p.id,
        produtoNome: p.nome,
        mensagem: `${p.nome} não teve consumo nos últimos ${dias} dias.`,
      });
      alertasProduto.push('parado');
    }

    previsoes.push({
      produtoId: p.id,
      nome: p.nome,
      unidade: p.unidade,
      estoque: p.estoque,
      estoqueMinimo: p.estoqueMinimo,
      consumoNosPeriodo: consumoTotal,
      consumoDiario: Math.round(consumoDiario * 1000) / 1000,
      diasRestantes,
      dataRupturaPrevista: dataRuptura,
      alertas: alertasProduto,
    });
  }

  // 6. Custo por serviço
  const custosPorServico = fichas.reduce((acc: Record<string, {
    servicoId: string, servicoNome: string, precoServico: number, custoInsumos: number, itens: number,
  }>, f) => {
    if (!acc[f.servicoId]) {
      acc[f.servicoId] = {
        servicoId: f.servicoId,
        servicoNome: f.servico.nome,
        precoServico: f.servico.preco,
        custoInsumos: 0,
        itens: 0,
      };
    }
    acc[f.servicoId].custoInsumos += f.quantidadeEst * f.produto.custoUnitario;
    acc[f.servicoId].itens++;
    return acc;
  }, {});

  const custosServico = Object.values(custosPorServico).map(s => ({
    ...s,
    margemPct: s.precoServico > 0
      ? Math.round(((s.precoServico - s.custoInsumos) / s.precoServico) * 100)
      : null,
  }));

  return NextResponse.json({
    periodo: { dias, desde: desde.toISOString() },
    agendamentosConcluidos,
    alertas: alertas.sort((a, b) => {
      const ordem = { critico: 0, atencao: 1, info: 2 };
      return ordem[a.severidade] - ordem[b.severidade];
    }),
    previsoes: previsoes.sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999)),
    custosServico,
  });
}
