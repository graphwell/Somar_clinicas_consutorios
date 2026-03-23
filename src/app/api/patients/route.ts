import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Helper: Extrair Tenant da Header (Auth Token) ou Query (MVP fallbak)
async function getTenant(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryTenant = searchParams.get('tenantId');
  if (queryTenant) return queryTenant;

  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.tenantId || null;
}

export async function GET(request: Request) {
  const tenantId = await getTenant(request);
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const pacientes = await prisma.paciente.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { agendamentos: true }
        },
        agendamentos: {
          orderBy: { dataHora: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(pacientes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const tenantId = await getTenant(request);
  if (!tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { nome, telefone } = await request.json();

    const paciente = await prisma.paciente.create({
      data: {
        nome,
        telefone,
        tenantId,
      },
    });

    return NextResponse.json(paciente);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar paciente' }, { status: 500 });
  }
}
