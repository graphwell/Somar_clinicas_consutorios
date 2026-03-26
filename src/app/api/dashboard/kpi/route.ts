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

    const faturamentoPrevisto = transactions
      .filter(t => t.status === 'pending' || t.status === 'previsto' || t.status === 'realizado')
      .reduce((acc, t) => acc + (t.valor || 0), 0);

    const faturamentoRealizado = transactions
      .filter(t => t.status === 'realizado')
      .reduce((acc, t) => acc + (t.valor || 0), 0);

    // 2. Número de Atendimentos
    const appointments = await prisma.agendamento.findMany({
      where: {
        tenantId: tenantId as string,
        dataHora: { gte: targetDateStart, lte: targetDateEnd },
        status: { not: 'cancelado' }
      }
    });

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

    return NextResponse.json({
      success: true,
      data: {
        faturamentoPrevisto,
        faturamentoRealizado,
        totalAtendimentos,
        taxaOcupacao: ocupacao,
        horariosLivres,
        ...extraStats
      }
    });

  } catch (error: any) {
    console.error('KPI Error:', error);
    return NextResponse.json({ error: 'Erro ao gerar KPIs', details: error.message }, { status: 500 });
  }
}
