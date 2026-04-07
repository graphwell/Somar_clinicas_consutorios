import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  try {
    const { tenantId } = await getSessionInfo();
    const body = await req.json();
    const existing = await prisma.comboProduto.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });

    const combo = await prisma.comboProduto.update({ where: { id }, data: body });
    return NextResponse.json(combo);
  } catch (err) {
    console.error('[vitrine/combos/:id PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar combo' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  try {
    const { tenantId } = await getSessionInfo();
    const existing = await prisma.comboProduto.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });

    await prisma.comboProduto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[vitrine/combos/:id DELETE]', err);
    return NextResponse.json({ error: 'Erro ao excluir combo' }, { status: 500 });
  }
}
