import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();
    const combos = await prisma.comboProduto.findMany({
      where: { tenantId },
      include: {
        itens: {
          include: { produto: { select: { id: true, nome: true, preco: true, imageUrl: true } } },
        },
      },
      orderBy: { nome: 'asc' },
    });
    return NextResponse.json(combos);
  } catch (err) {
    console.error('[vitrine/combos GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar combos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    let body: { id?: string; nome?: string; preco?: number; desconto?: number; status?: string; produtoIds?: string[] };
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }

    if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
    if (typeof body.preco !== 'number') return NextResponse.json({ error: 'Preço obrigatório' }, { status: 400 });

    const produtoIds = Array.isArray(body.produtoIds) ? body.produtoIds : [];

    if (body.id) {
      const existing = await prisma.comboProduto.findFirst({ where: { id: body.id, tenantId }, select: { id: true } });
      if (!existing) return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });

      await prisma.comboItemVitrine.deleteMany({ where: { comboId: body.id } });
      const combo = await prisma.comboProduto.update({
        where: { id: body.id },
        data: {
          nome: body.nome, preco: body.preco, desconto: body.desconto ?? 0, status: body.status ?? 'active',
          itens: { create: produtoIds.map(pid => ({ produtoId: pid })) },
        },
        include: { itens: { include: { produto: { select: { id: true, nome: true, preco: true, imageUrl: true } } } } },
      });
      return NextResponse.json(combo);
    }

    const combo = await prisma.comboProduto.create({
      data: {
        tenantId, nome: body.nome, preco: body.preco, desconto: body.desconto ?? 0, status: body.status ?? 'active',
        itens: { create: produtoIds.map(pid => ({ produtoId: pid })) },
      },
      include: { itens: { include: { produto: { select: { id: true, nome: true, preco: true, imageUrl: true } } } } },
    });
    return NextResponse.json(combo, { status: 201 });
  } catch (err) {
    console.error('[vitrine/combos POST]', err);
    return NextResponse.json({ error: 'Erro ao salvar combo' }, { status: 500 });
  }
}
