import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();
    const cats = await prisma.categoriaProduto.findMany({
      where: { tenantId },
      include: { _count: { select: { produtos: true } } },
      orderBy: { nome: 'asc' },
    });
    return NextResponse.json(cats);
  } catch (err) {
    console.error('[vitrine/categories GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    let body: { id?: string; nome?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }

    if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    if (body.id) {
      const existing = await prisma.categoriaProduto.findFirst({ where: { id: body.id, tenantId }, select: { id: true } });
      if (!existing) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
      const cat = await prisma.categoriaProduto.update({ where: { id: body.id }, data: { nome: body.nome } });
      return NextResponse.json(cat);
    }

    const cat = await prisma.categoriaProduto.create({
      data: { tenantId, nome: body.nome },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (err) {
    console.error('[vitrine/categories POST]', err);
    return NextResponse.json({ error: 'Erro ao salvar categoria' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const existing = await prisma.categoriaProduto.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });

    await prisma.categoriaProduto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[vitrine/categories DELETE]', err);
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 });
  }
}
