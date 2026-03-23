import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  try {
    // Mark as read
    const update = await prisma.notificacao.update({
      where: { id },
      data: { lida: true }
    });
    return NextResponse.json(update);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar notificação' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  // Mark all as read or delete all logic
  const { searchParams } = new URL(request.url);
  let tenantId = searchParams.get('tenantId') || 'clinica_id_default';

  try {
    const res = await prisma.notificacao.deleteMany({
      where: { tenantId }
    });
    return NextResponse.json({ success: true, count: res.count });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao limpar notificações' }, { status: 500 });
  }
}
