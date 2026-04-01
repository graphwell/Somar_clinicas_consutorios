import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

// GET /api/reports/convenios
// Retorna atendimentos e faturamento agrupados por convênio
export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();

    // Convênios cadastrados
    const convenios = await prisma.convenioEmpresa.findMany({
      where: { tenantId, ativo: true },
      select: { id: true, nomeConvenio: true },
    });

    // Agendamentos por convenio (campo string no agendamento)
    const grupos = await prisma.agendamento.groupBy({
      by: ['convenio'],
      where: { tenantId, convenio: { not: null } },
      _count: { id: true },
    });

    // Faturamento por convenio (via TransacaoFinanceira → agendamento.convenio)
    const transacoes = await prisma.transacaoFinanceira.findMany({
      where: { tenantId, tipo: 'receita' },
      include: { agendamento: { select: { convenio: true } } },
    });

    // Montar mapa: nomeConvenio → { atendimentos, faturamento }
    const faturMap: Record<string, number> = {};
    for (const t of transacoes) {
      const nome = t.agendamento?.convenio;
      if (nome) {
        faturMap[nome] = (faturMap[nome] || 0) + (t.valor || 0);
      }
    }

    const result = convenios.map((c) => {
      const grupo = grupos.find((g) => g.convenio === c.nomeConvenio);
      return {
        id: c.id,
        nome: c.nomeConvenio,
        atendimentos: grupo?._count?.id ?? 0,
        faturamento: faturMap[c.nomeConvenio] ?? 0,
      };
    });

    // Adicionar convênios com atendimentos mas sem cadastro (dados históricos)
    for (const g of grupos) {
      if (!g.convenio) continue;
      const jaIncluso = result.some((r) => r.nome === g.convenio);
      if (!jaIncluso) {
        result.push({
          id: '',
          nome: g.convenio,
          atendimentos: g._count.id,
          faturamento: faturMap[g.convenio] ?? 0,
        });
      }
    }

    // Particular
    const particular = await prisma.agendamento.count({
      where: { tenantId, tipoAtendimento: 'particular' },
    });
    const fatParticular = transacoes
      .filter((t) => !t.agendamento?.convenio)
      .reduce((acc, t) => acc + (t.valor || 0), 0);

    result.push({ id: '__particular__', nome: 'Particular', atendimentos: particular, faturamento: fatParticular });

    result.sort((a, b) => b.atendimentos - a.atendimentos);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[GET /api/reports/convenios]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
