import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET) return NextResponse.json({ error: 'ADMIN_SECRET nao configurado' }, { status: 500 });
  
  const { searchParams } = new URL(request.url);
  const secretFromQuery = searchParams.get('secret');
  const secretFromHeader = request.headers.get('x-admin-secret');

  if (secretFromHeader !== ADMIN_SECRET && secretFromQuery !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const totalClinicas = await prisma.clinica.count();
    const clinicasAtivas = await prisma.clinica.count({ where: { botActive: true } });
    
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
