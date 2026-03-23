import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/appointments?tenantId=xxx  — dashboard listing (no phone required)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId é obrigatório.' }, { status: 400 });

    // @ts-ignore
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
}
