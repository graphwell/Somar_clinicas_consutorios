import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function DELETE(_req: Request, { params }: { params: Promise<{ pacienteId: string; id: string }> }) {
  try {
    const { tenantId } = await getSessionInfo();
    const { pacienteId, id } = await params;

    await prisma.pacienteAlergia.deleteMany({
      where: { id, pacienteId, tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
