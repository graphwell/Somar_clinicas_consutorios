import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ pacienteId: string }> }) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId } = await params;
    const { descricao, gravidade = 'MODERADA' } = await req.json();

    if (!descricao) return NextResponse.json({ error: 'descricao obrigatória' }, { status: 400 });

    const alergia = await prisma.pacienteAlergia.create({
      data: { pacienteId, tenantId, descricao, gravidade },
    });

    return NextResponse.json({ success: true, alergia });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
