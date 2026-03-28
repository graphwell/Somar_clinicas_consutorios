import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';
import { getTenantPrisma } from '@/lib/prisma';

export async function GET() {
  try {
    const headerList = await headers();
    const role = headerList.get('x-user-role') || '';
    if (role === 'recepcao' || role === 'profissional') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);
    
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
      if (a.servico) {
        const s = a.servico;
        if (!servicosCount[s.id]) {
          servicosCount[s.id] = { nome: s.nome, count: 0, faturamento: 0 };
        }
        servicosCount[s.id].count++;
        servicosCount[s.id].faturamento += s.preco;
      }
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

  } catch (error: any) {
    console.error("Erro ao gerar estatísticas:", error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
