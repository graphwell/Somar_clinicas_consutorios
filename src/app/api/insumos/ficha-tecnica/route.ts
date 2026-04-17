import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

// GET /api/insumos/ficha-tecnica?servicoId=xxx
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const servicoId = new URL(req.url).searchParams.get('servicoId');

    const where: any = { tenantId };
    if (servicoId) where.servicoId = servicoId;

    const fichas = await prisma.insumoFichaTecnica.findMany({
      where,
      include: {
        produto: { select: { id: true, nome: true, unidade: true, estoque: true, custoUnitario: true, imageUrl: true } },
        servico: { select: { id: true, nome: true } },
      },
      orderBy: { produto: { nome: 'asc' } },
    });

    return NextResponse.json(fichas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/insumos/ficha-tecnica
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { servicoId, produtoId, quantidadeEst, unidade } = await req.json();

    if (!servicoId || !produtoId || !quantidadeEst) {
      return NextResponse.json({ error: 'servicoId, produtoId e quantidadeEst são obrigatórios' }, { status: 400 });
    }

    const ficha = await prisma.insumoFichaTecnica.upsert({
      where: { servicoId_produtoId: { servicoId, produtoId } },
      update: { quantidadeEst, unidade: unidade || 'un' },
      create: {
        tenantId,
        servicoId,
        produtoId,
        quantidadeEst,
        unidade: unidade || 'un',
      },
      include: {
        produto: { select: { id: true, nome: true, unidade: true, estoque: true, custoUnitario: true, imageUrl: true } },
      },
    });

    return NextResponse.json(ficha);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/insumos/ficha-tecnica?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    await getSessionInfo();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    await prisma.insumoFichaTecnica.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
