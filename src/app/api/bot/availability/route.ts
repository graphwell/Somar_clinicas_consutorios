import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');
  const tenantId = searchParams.get('tenantId');
  const profissionalId = searchParams.get('profissionalId') || null;

  if (!dateStr || !tenantId) {
    return NextResponse.json({ error: 'Faltam parâmetros: date ou tenantId' }, { status: 400 });
  }

  // Horários de funcionamento padrão: 08:00 às 18:00, intervalos de 1 hora
  const startHour = 8;
  const endHour = 18;
  const allSlots = [];
  
  for (let i = startHour; i <= endHour; i++) {
    const d = new Date(dateStr);
    d.setUTCHours(i, 0, 0, 0);
    allSlots.push(d);
  }

  try {
    // Busca agendamentos do dia para este tenant
    const startOfDay = new Date(dateStr);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const whereAgendamentos: any = {
      tenantId,
      dataHora: { gte: startOfDay, lte: endOfDay },
      status: { not: 'cancelado' }
    };
    if (profissionalId) whereAgendamentos.profissionalId = profissionalId;

    const agendamentosExistentes = await prisma.agendamento.findMany({
      where: whereAgendamentos,
    });

    const ocupados = agendamentosExistentes.map(a => a.dataHora.toISOString());

    const availableSlots = allSlots.filter(
      slot => !ocupados.includes(slot.toISOString())
    ).map(slot => slot.toISOString());

    return NextResponse.json({
      date: dateStr,
      availableSlots
    });
  } catch (error) {
    console.error("Erro na busca de disponibilidade:", error);
    return NextResponse.json({ error: 'Erro interno ao buscar disponibilidade' }, { status: 500 });
  }
}
