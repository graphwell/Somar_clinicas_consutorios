import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    let tenantId = searchParams.get('empresa_id') || searchParams.get('tenantId');

    // Segurança Crítica: Se não veio tenantId explicitamente, tenta pegar da sessão.
    // Se ainda assim não tiver, bloqueia.
    if (!tenantId) {
      try {
        tenantId = await getAuthorizedTenantId();
      } catch (e) {
        return NextResponse.json({ error: 'TenantId obrigatório para segurança das métricas' }, { status: 403 });
      }
    }

    const targetDateStart = new Date(dateStr);
    targetDateStart.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(dateStr);
    targetDateEnd.setHours(23, 59, 59, 999);

    // 1. Faturamento Previsto vs Realizado
    const transactions = await prisma.transacaoFinanceira.findMany({
      where: {
        tenantId: tenantId as string,
        createdAt: { gte: targetDateStart, lte: targetDateEnd },
        tipo: 'income'
      }
    });

    let faturamentoPrevisto = transactions
      .filter(t => t.status === 'pending' || t.status === 'previsto' || t.status === 'realizado')
      .reduce((acc, t) => acc + (t.valor || 0), 0);

    let faturamentoRealizado = transactions
      .filter(t => t.status === 'realizado')
      .reduce((acc, t) => acc + (t.valor || 0), 0);

    // 2. Número de Atendimentos
    const appointments = await prisma.agendamento.findMany({
      where: {
        tenantId: tenantId as string,
        dataHora: { gte: targetDateStart, lte: targetDateEnd },
        status: { not: 'cancelado' }
      },
      include: { servico: true }
    });

    // FALLBACK: Se faturamento previsto for 0 (comum em agendamentos manuais sem transação),
    // calculamos pela soma dos preços dos serviços agendados.
    if (faturamentoPrevisto === 0 && appointments.length > 0) {
      faturamentoPrevisto = appointments.reduce((acc, appt) => acc + (appt.servico?.preco || 0), 0);
      
      // Se houver algum 'confirmado' ou 'done', consideramos como realizado na estimativa se não houver transações
      const realizados = appointments.filter(a => a.status === 'confirmado' || a.status === 'done');
      if (faturamentoRealizado === 0 && realizados.length > 0) {
        faturamentoRealizado = realizados.reduce((acc, appt) => acc + (appt.servico?.preco || 0), 0);
      }
    }

    const totalAtendimentos = appointments.length;

    // 3. Taxa de Ocupação e Horários Livres (Estimativa Base)
    // Buscamos a clínica para ver horários de funcionamento
    const clinica = await prisma.clinica.findUnique({
      where: { tenantId: tenantId as string }
    });

    const open = (clinica as any)?.openingTime || "08:00";
    const close = (clinica as any)?.closingTime || "18:00";
    
    const [hOpen, mOpen] = open.split(':').map(Number);
    const [hClose, mClose] = close.split(':').map(Number);
    
    const totalMinutes = (hClose * 60 + mClose) - (hOpen * 60 + mOpen);
    const defaultSlotDur = 30; // 30 min slot padrão para cálculo de capacidade
    const capacitySlots = Math.max(1, Math.floor(totalMinutes / defaultSlotDur));
    
    const ocupacao = Math.min(100, Math.round((totalAtendimentos / capacitySlots) * 100));
    const horariosLivres = Math.max(0, capacitySlots - totalAtendimentos);

    // 4. Nicho Specific (Assinantes vs Avulsos)
    let extraStats = {};
    if (clinica?.nicho === 'SALAO_BELEZA' || clinica?.nicho === 'BARBEARIA') {
      const subscribersAgendados = await prisma.agendamento.count({
        where: {
          tenantId: tenantId as string,
          dataHora: { gte: targetDateStart, lte: targetDateEnd },
          paciente: { isSubscriber: true } as any
        }
      });
      extraStats = {
        assinantesAgendados: subscribersAgendados,
        avulsosAgendados: totalAtendimentos - subscribersAgendados
      };
    } else if (clinica?.nicho === 'CLINICA_MEDICA' || clinica?.nicho === 'FISIOTERAPIA') {
      const conveniosCount = await prisma.agendamento.count({
        where: {
          tenantId: tenantId as string,
          dataHora: { gte: targetDateStart, lte: targetDateEnd },
          tipoAtendimento: 'convenio'
        }
      });
      extraStats = {
        conveniosCount,
        particularesCount: totalAtendimentos - conveniosCount
      };
    }

    // 5. Evolução dos últimos 7 dias (sparkline)
    const sevenDaysAgo = new Date(targetDateStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const last7Appointments = await prisma.agendamento.findMany({
      where: {
        tenantId: tenantId as string,
        dataHora: { gte: sevenDaysAgo, lte: targetDateEnd },
        status: { not: 'cancelado' },
      },
      select: { dataHora: true },
    });

    const last7Transactions = await prisma.transacaoFinanceira.findMany({
      where: {
        tenantId: tenantId as string,
        createdAt: { gte: sevenDaysAgo, lte: targetDateEnd },
        tipo: 'income',
        status: { in: ['pending', 'previsto', 'realizado'] },
      },
      select: { createdAt: true, valor: true },
    });

    const base = sevenDaysAgo.getTime();
    const evolucaoAtendimentos = Array(7).fill(0);
    const evolucaoFaturamento = Array(7).fill(0);

    for (const appt of last7Appointments) {
      const idx = Math.floor((new Date(appt.dataHora).setHours(0,0,0,0) - base) / 86400000);
      if (idx >= 0 && idx < 7) evolucaoAtendimentos[idx]++;
    }
    for (const tx of last7Transactions) {
      const idx = Math.floor((new Date(tx.createdAt).setHours(0,0,0,0) - base) / 86400000);
      if (idx >= 0 && idx < 7) evolucaoFaturamento[idx] += tx.valor || 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        faturamentoPrevisto,
        faturamentoRealizado,
        totalAtendimentos,
        taxaOcupacao: ocupacao,
        horariosLivres,
        evolucaoAtendimentos,
        evolucaoFaturamento,
        ...extraStats
      }
    });

  } catch (error: any) {
    console.error('KPI Error:', error);
    return NextResponse.json({ error: 'Erro ao gerar KPIs', details: error.message }, { status: 500 });
  }
}
