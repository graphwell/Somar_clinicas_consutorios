import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma();

    const appointments = await prisma.agendamento.findMany({
      where: { tenantId },
      include: { 
        paciente: { select: { nome: true, telefone: true } },
        servico: true,
        profissional: { select: { id: true, nome: true } }
      },
      orderBy: { dataHora: 'desc' },
      take: 100,
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}
