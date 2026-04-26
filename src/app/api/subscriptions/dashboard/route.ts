import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Sem autenticação.' }, { status: 401 });

  const prisma = getTenantPrisma();
  const agora  = new Date();
  const em7Dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

  try {
    const [
      assinantesAtivos,
      novosNoMes,
      canceladosNoMes,
      inadimplentes,
      totalMesAnterior,
      proximosVencimentos,
    ] = await Promise.all([
      // Assinantes ativos com dados completos
      prisma.assinaturaCliente.findMany({
        where: { tenantId, status: 'ativo' },
        include: {
          paciente: { select: { id: true, nome: true, ultimaVisita: true } },
          plano:    { select: { id: true, nome: true, servicos: true } },
        },
      }),
      // Novos no mês corrente
      prisma.assinaturaCliente.count({
        where: { tenantId, status: 'ativo', dataInicio: { gte: inicioMes } },
      }),
      // Cancelados no mês corrente
      prisma.assinaturaCliente.count({
        where: { tenantId, status: 'cancelado', updatedAt: { gte: inicioMes } },
      }),
      // Inadimplentes
      prisma.assinaturaCliente.count({
        where: { tenantId, status: 'inadimplente' },
      }),
      // Total de assinantes que existiam no início do mês corrente (churn base)
      prisma.assinaturaCliente.count({
        where: {
          tenantId,
          dataInicio: { lte: inicioMes },
          OR: [{ dataFim: null }, { dataFim: { gte: inicioMesAnterior } }],
        },
      }),
      // Vencendo nos próximos 7 dias
      prisma.assinaturaCliente.findMany({
        where: {
          tenantId,
          status: 'ativo',
          proximaCobranca: { gte: agora, lte: em7Dias },
        },
        include: {
          paciente: { select: { id: true, nome: true } },
          plano:    { select: { nome: true } },
        },
        orderBy: { proximaCobranca: 'asc' },
      }),
    ]);

    // ── MRR ──────────────────────────────────────────────────────────────────
    const mrrTotal = assinantesAtivos.reduce((s, a) => s + a.valorPago, 0);

    const porPlanoMap = new Map<string, { planoNome: string; totalAssinantes: number; receitaMensal: number }>();
    for (const a of assinantesAtivos) {
      const planoId = a.planoId;
      const entry = porPlanoMap.get(planoId) ?? { planoNome: a.plano.nome, totalAssinantes: 0, receitaMensal: 0 };
      entry.totalAssinantes += 1;
      entry.receitaMensal   += a.valorPago;
      porPlanoMap.set(planoId, entry);
    }
    const porPlano = Array.from(porPlanoMap.entries()).map(([planoId, v]) => ({ planoId, ...v }));

    // ── Churn ─────────────────────────────────────────────────────────────────
    const taxaChurn = totalMesAnterior > 0
      ? Math.round((canceladosNoMes / totalMesAnterior) * 100 * 10) / 10
      : 0;

    // ── Frequência (top 20, sumindo e perdido primeiro) ───────────────────────
    const frequencia = assinantesAtivos
      .map(a => {
        const contador = a.contadorUso as Record<string, { usado?: number; limite?: number | null }>;
        const usosNoMes   = Object.values(contador).reduce((s, c) => s + (c.usado  ?? 0), 0);
        const limiteNoMes = Object.values(contador).reduce((s, c) => s + (c.limite ?? 0), 0);
        const percentualUso = limiteNoMes > 0 ? Math.round((usosNoMes / limiteNoMes) * 100) : null;

        const ultimaVisita   = a.paciente.ultimaVisita ?? null;
        const diasSemVisita  = ultimaVisita
          ? Math.floor((agora.getTime() - new Date(ultimaVisita).getTime()) / 86_400_000)
          : 999;

        const engStatus: 'ativo' | 'sumindo' | 'perdido' =
          diasSemVisita <= 20 ? 'ativo' :
          diasSemVisita <= 35 ? 'sumindo' : 'perdido';

        return {
          pacienteId:    a.pacienteId,
          pacienteNome:  a.paciente.nome,
          planoNome:     a.plano.nome,
          usosNoMes,
          limiteNoMes,
          percentualUso,
          ultimaVisita,
          diasSemVisita,
          status: engStatus,
        };
      })
      .sort((x, y) => y.diasSemVisita - x.diasSemVisita)
      .slice(0, 20);

    // ── Próximos vencimentos ─────────────────────────────────────────────────
    const proximosVencimentosOut = proximosVencimentos.map(a => ({
      assinaturaClienteId: a.id,
      pacienteId:    a.pacienteId,
      pacienteNome:  a.paciente.nome,
      planoNome:     a.plano.nome,
      vencimento:    a.proximaCobranca,
      valorPago:     a.valorPago,
    }));

    return NextResponse.json({
      mrr: { total: mrrTotal, porPlano },
      assinantes: {
        total:             assinantesAtivos.length,
        novosNoMes,
        canceladosNoMes,
        inadimplentes,
      },
      churn: { taxa: taxaChurn, mesAnterior: totalMesAnterior },
      frequencia,
      proximosVencimentos: proximosVencimentosOut,
    });
  } catch (err) {
    console.error('[subscriptions/dashboard]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
