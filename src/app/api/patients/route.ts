import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);

    const pacientes = await prisma.paciente.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { agendamentos: true }
        },
        agendamentos: {
          orderBy: { dataHora: 'desc' },
          take: 1,
          include: { servico: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(pacientes);
  } catch (error: any) {
    console.error('[PATIENTS_GET_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);
    const { nome, telefone } = await request.json();

    if (!nome || !telefone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
    }

    const paciente = await prisma.paciente.create({
      data: {
        nome,
        telefone,
        tenantId,
      },
    });

    return NextResponse.json(paciente);
  } catch (error: any) {
    console.error('[PATIENTS_POST_ERROR]', error);
    return NextResponse.json({ error: 'Erro ao criar paciente' }, { status: 500 });
  }
}
