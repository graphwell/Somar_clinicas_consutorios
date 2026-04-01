import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

function periodoRange(periodo: string): { inicio: Date; fim: Date } {
  const [ano, mes] = periodo.split('-').map(Number);
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0, 23, 59, 59, 999);
  return { inicio, fim };
}

function periodoAnterior(periodo: string): string {
  const [ano, mes] = periodo.split('-').map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nomeMes(periodo: string): string {
  const [ano, mes] = periodo.split('-').map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export async function GET(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);

    const hoje = new Date();
    const defaultPeriodo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const periodo = searchParams.get('periodo') || defaultPeriodo;
    const periodoAnt = periodoAnterior(periodo);

    const { inicio, fim } = periodoRange(periodo);
    const { inicio: inicioAnt, fim: fimAnt } = periodoRange(periodoAnt);

    // Buscar transações do período
    const txAtual = await prisma.transacaoFinanceira.findMany({
      where: { tenantId, createdAt: { gte: inicio, lte: fim } },
      include: { profissional: { select: { id: true, nome: true, especialidade: true, percentualRepasse: true, repasseFixo: true, repasseTipo: true } } },
    });

    const txAnterior = await prisma.transacaoFinanceira.findMany({
      where: { tenantId, tipo: 'income', createdAt: { gte: inicioAnt, lte: fimAnt } },
    });

    // KPIs
    const receitas = txAtual.filter((t) => t.tipo === 'income');
    const despesas = txAtual.filter((t) => t.tipo === 'expense');

    const receitaBruta = receitas.filter((t) => t.status !== 'canceled').reduce((s, t) => s + t.valor, 0);
    const despesasTotal = despesas.filter((t) => t.status !== 'canceled').reduce((s, t) => s + t.valor, 0);
    const lucroLiquido = receitaBruta - despesasTotal;
    const receitaBrutaAnterior = txAnterior.filter((t) => t.status !== 'canceled').reduce((s, t) => s + t.valor, 0);
    const variacaoReceita = receitaBrutaAnterior > 0 ? ((receitaBruta - receitaBrutaAnterior) / receitaBrutaAnterior) * 100 : 0;

    // Atendimentos do período (para ticket médio)
    const atendimentos = await prisma.agendamento.count({
      where: { tenantId, dataHora: { gte: inicio, lte: fim }, status: { not: 'cancelado' } },
    });
    const ticketMedio = atendimentos > 0 ? receitaBruta / atendimentos : 0;

    // Breakdown receitas por tipo de atendimento
    const receitaParticular = receitas.filter((t) => !t.convenioId && t.status !== 'canceled').reduce((s, t) => s + t.valor, 0);
    const receitaConvenio = receitas.filter((t) => t.convenioId && t.status !== 'canceled').reduce((s, t) => s + t.valor, 0);

    // Por convênio
    const mapConvenio: Record<string, number> = {};
    for (const t of receitas.filter((t) => t.convenioId && t.status !== 'canceled')) {
      const key = t.convenioId!;
      mapConvenio[key] = (mapConvenio[key] || 0) + t.valor;
    }
    // Buscar nomes dos convênios
    const convenioIds = Object.keys(mapConvenio);
    const conveniosDb = convenioIds.length > 0 ? await prisma.convenioEmpresa.findMany({
      where: { id: { in: convenioIds } },
      select: { id: true, nomeConvenio: true },
    }) : [];
    const receitaPorConvenio = conveniosDb.map((c) => ({
      nome: c.nomeConvenio,
      total: mapConvenio[c.id] || 0,
      percentual: receitaBruta > 0 ? ((mapConvenio[c.id] || 0) / receitaBruta) * 100 : 0,
    }));

    // Breakdown despesas por categoria
    const mapCategoria: Record<string, number> = {};
    for (const t of despesas.filter((t) => t.status !== 'canceled')) {
      const cat = t.categoria || 'outros';
      mapCategoria[cat] = (mapCategoria[cat] || 0) + t.valor;
    }
    const despesasPorCategoria = Object.entries(mapCategoria).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);

    const despesasFixas = despesas.filter((t) => t.status !== 'canceled' && ['aluguel', 'salario', 'despesa_fixa'].includes(t.categoria || '')).reduce((s, t) => s + t.valor, 0);
    const despesasVariaveis = despesasTotal - despesasFixas;

    // A receber / A pagar
    const aReceber = receitas.filter((t) => t.status === 'pending').reduce((s, t) => s + t.valor, 0);
    const aPagar = despesas.filter((t) => t.status === 'pending').reduce((s, t) => s + t.valor, 0);

    // Repasses
    const repasses = await prisma.repasseProfissional.findMany({
      where: { tenantId, periodo },
    });
    const repassesPendentes = repasses.filter((r) => r.status === 'pendente').reduce((s, r) => s + r.totalRepasse, 0);
    const repassesPagos = repasses.filter((r) => r.status === 'pago').reduce((s, r) => s + r.totalRepasse, 0);

    // Por profissional
    const profissionais = await prisma.profissional.findMany({
      where: { tenantId, ativo: true },
      select: { id: true, nome: true, especialidade: true, percentualRepasse: true, repasseFixo: true, repasseTipo: true },
    });
    const agendsByProf = await prisma.agendamento.findMany({
      where: { tenantId, dataHora: { gte: inicio, lte: fim }, status: { not: 'cancelado' } },
      include: { servico: { select: { preco: true } } },
    });

    const porProfissional = profissionais.map((prof) => {
      const ags = agendsByProf.filter((a) => a.profissionalId === prof.id);
      const receitaGerada = ags.reduce((s, a) => s + (a.servico?.preco || 0), 0);
      const perc = prof.percentualRepasse || 0;
      const valorRepasse = prof.repasseTipo === 'fixo' ? (prof.repasseFixo || 0) : (receitaGerada * perc) / 100;
      return {
        id: prof.id,
        nome: prof.nome,
        especialidade: prof.especialidade,
        totalAtendimentos: ags.length,
        receitaGerada,
        percentualRepasse: perc,
        valorRepasse,
      };
    }).filter((p) => p.totalAtendimentos > 0);

    // Evolução últimos 6 meses
    const evolucao = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const { inicio: s, fim: e } = periodoRange(p);
      const txMes = await prisma.transacaoFinanceira.findMany({
        where: { tenantId, createdAt: { gte: s, lte: e }, status: { not: 'canceled' } },
      });
      const rec = txMes.filter((t) => t.tipo === 'income').reduce((sum, t) => sum + t.valor, 0);
      const desp = txMes.filter((t) => t.tipo === 'expense').reduce((sum, t) => sum + t.valor, 0);
      evolucao.push({
        mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        periodo: p,
        receita: rec,
        despesa: desp,
        lucro: rec - desp,
      });
    }

    // Formas de pagamento
    const mapForma: Record<string, number> = {};
    for (const t of receitas.filter((t) => t.status !== 'canceled')) {
      const f = t.formaPagamento || 'outros';
      mapForma[f] = (mapForma[f] || 0) + t.valor;
    }
    const porFormaPagamento = Object.entries(mapForma).map(([forma, total]) => ({
      forma,
      total,
      percentual: receitaBruta > 0 ? (total / receitaBruta) * 100 : 0,
    })).sort((a, b) => b.total - a.total);

    return NextResponse.json({
      periodo: nomeMes(periodo),
      periodoKey: periodo,
      receitaBruta,
      despesasTotal,
      lucroLiquido,
      ticketMedio,
      receitaBrutaAnterior,
      variacaoReceita,
      receitaParticular,
      receitaConvenio,
      receitaPorConvenio,
      despesasFixas,
      despesasVariaveis,
      despesasPorCategoria,
      aReceber,
      aPagar,
      repassesPendentes,
      repassesPagos,
      porProfissional,
      evolucao,
      porFormaPagamento,
    });
  } catch (error: any) {
    console.error('[GET /api/finance/resumo]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
