import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/** PATCH /api/vitrine/order-items/[id] — atualizar status de um item */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  try {
    const { tenantId } = await getSessionInfo();
    const body = await req.json();
    const { status } = body as { status?: string };

    const validStatuses = ['reserved', 'paid_online', 'paid_presential', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const existing = await prisma.pedidoItem.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });

    const item = await prisma.pedidoItem.update({
      where: { id },
      data: { ...(status ? { status } : {}), ...body },
      include: { produto: { select: { id: true, nome: true } } },
    });
    return NextResponse.json(item);
  } catch (err) {
    console.error('[vitrine/order-items/:id PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  try {
    const { tenantId } = await getSessionInfo();
    const existing = await prisma.pedidoItem.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });

    await prisma.pedidoItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[vitrine/order-items/:id DELETE]', err);
    return NextResponse.json({ error: 'Erro ao excluir item' }, { status: 500 });
  }
}
