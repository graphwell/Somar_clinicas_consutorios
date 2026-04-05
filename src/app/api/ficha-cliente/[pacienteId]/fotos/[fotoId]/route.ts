import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// DELETE — marcar foto como deletada (LGPD)
export async function DELETE(
  _req: Request,
  { params }: { params: { pacienteId: string; fotoId: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { fotoId, pacienteId } = params;

    const foto = await prisma.fotoCliente.findFirst({
      where: { id: fotoId, tenantId, pacienteId },
    });
    if (!foto) return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 });

    await prisma.fotoCliente.update({
      where: { id: fotoId },
      data: { deletado: true, urlArquivo: '' },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
