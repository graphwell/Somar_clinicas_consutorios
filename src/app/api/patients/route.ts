import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const { tenantId, role, profissionalId } = await getSessionInfo();
    const prisma = getTenantPrisma();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    const where: any = { tenantId };
    if (query) {
      where.OR = [
        { nome: { contains: query, mode: 'insensitive' } },
        { telefone: { contains: query } }
      ];
    }

    // Profissional vê apenas seus próprios pacientes
    if (role === 'profissional' && profissionalId) {
      where.agendamentos = { some: { profissionalId } };
    }

    const pacientes = await prisma.paciente.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      take: query ? 5 : undefined
    });

    return NextResponse.json(pacientes);
  } catch (error: any) {
    console.error('[PATIENTS_GET_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const prisma = getTenantPrisma(tenantId);
    const { nome, telefone, dataNascimento } = await request.json();

    if (!nome || !telefone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
    }

    const paciente = await prisma.paciente.create({
      data: {
        nome,
        telefone,
        // @ts-ignore
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        tenantId,
      },
    });

    return NextResponse.json(paciente);
  } catch (error: any) {
    console.error('[PATIENTS_POST_ERROR]', error);
    return NextResponse.json({ error: 'Erro ao criar paciente' }, { status: 500 });
  }
}
