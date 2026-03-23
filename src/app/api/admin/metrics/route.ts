import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  // Simples Auth via Header ou Parâmetro (em produção usar NextAuth role=ADMIN)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== 'synka-master-2026') return NextResponse.json({ error: 'Unauthorized '}, { status: 401 });

  try {
    const totalClinicas = await prisma.clinica.count();
    const clinicasAtivas = await prisma.clinica.count({ where: { statusBot: 'ativo' } });
    
    // Total de agendamentos no mês atual (simplificado)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const totalAgendamentosMes = await prisma.agendamento.count({
      where: { dataHora: { gte: startOfMonth } }
    });

    const totalPacientes = await prisma.paciente.count();

    const agendamentosPorStatus = await prisma.agendamento.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { dataHora: { gte: startOfMonth } }
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalClinicas,
        clinicasAtivas,
        totalAgendamentosMes,
        totalPacientes,
        agendamentosPorStatus
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
