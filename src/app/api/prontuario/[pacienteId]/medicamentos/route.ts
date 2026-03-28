import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ pacienteId: string }> }) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = await params;
    const { nome, dosagem, frequencia, uso = 'CONTINUO', inicio, fim } = await req.json();

    if (!nome) return NextResponse.json({ error: 'nome obrigatório' }, { status: 400 });

    const med = await prisma.pacienteMedicamento.create({
      data: {
        pacienteId, tenantId, nome, dosagem, frequencia, uso,
        inicio: inicio ? new Date(inicio) : null,
        fim: fim ? new Date(fim) : null,
      },
    });

    return NextResponse.json({ success: true, medicamento: med });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
