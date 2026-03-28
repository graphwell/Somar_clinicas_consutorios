import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ pacienteId: string; id: string }> }) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId, id } = await params;
    const body = await req.json();

    const updated = await prisma.pacienteMedicamento.updateMany({
      where: { id, pacienteId, tenantId },
      data: {
        nome: body.nome,
        dosagem: body.dosagem,
        frequencia: body.frequencia,
        uso: body.uso,
        ativo: body.ativo !== undefined ? body.ativo : undefined,
        fim: body.fim ? new Date(body.fim) : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
