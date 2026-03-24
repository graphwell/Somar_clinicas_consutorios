import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });

  try {
    const agora = new Date();
    const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    // 1. Total faturado este mês (Confirmados com serviço)
    const agendamentosConfirmados = await prisma.agendamento.findMany({
      where: {
        tenantId,
        status: 'confirmado',
        dataHora: { gte: primeiroDiaMes },
        servicoId: { not: null }
      },
      include: { servico: true }
    });

    const totalFaturado = agendamentosConfirmados.reduce((acc, a) => acc + (a.servico?.preco || 0), 0);

    // 2. Taxa de confirmação
    const totalMes = await prisma.agendamento.count({
      where: {
        tenantId,
        dataHora: { gte: primeiroDiaMes },
        status: { not: 'cancelado' }
      }
    });
    
    const confirmadosCount = await prisma.agendamento.count({
      where: {
        tenantId,
        dataHora: { gte: primeiroDiaMes },
        status: 'confirmado'
      }
    });

    const taxaConfirmacao = totalMes > 0 ? (confirmadosCount / totalMes) * 100 : 0;

    // 3. Top Serviços
    const servicosCount: Record<string, { nome: string; count: number; faturamento: number }> = {};
    
    agendamentosConfirmados.forEach(a => {
      const s = a.servico!;
      if (!servicosCount[s.id]) {
        servicosCount[s.id] = { nome: s.nome, count: 0, faturamento: 0 };
      }
      servicosCount[s.id].count++;
      servicosCount[s.id].faturamento += s.preco;
    });

    const topServicos = Object.values(servicosCount).sort((a, b) => b.faturamento - a.faturamento).slice(0, 5);

    // 4. Base de pacientes total
    const totalPacientes = await prisma.paciente.count({ where: { tenantId } });

    return NextResponse.json({
      totalFaturado,
      totalAgendamentos: totalMes,
      confirmadosCount,
      taxaConfirmacao,
      totalPacientes,
      topServicos
    });

  } catch (error) {
    console.error("Erro ao gerar estatísticas:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
