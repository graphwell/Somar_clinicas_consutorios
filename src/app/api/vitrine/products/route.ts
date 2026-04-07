import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const categoriaId = searchParams.get('categoriaId');
    const status = searchParams.get('status');

    const produtos = await prisma.produto.findMany({
      where: {
        tenantId,
        ...(categoriaId ? { categoriaId } : {}),
        ...(status ? { status } : {}),
      },
      include: { categoria: { select: { id: true, nome: true } } },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json(produtos);
  } catch (err) {
    console.error('[vitrine/products GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }

    const { id, nome, descricao, dicaDeUso, preco, imageUrl, estoque, status, tags, categoriaId } = body as {
      id?: string; nome?: string; descricao?: string; dicaDeUso?: string;
      preco?: number; imageUrl?: string; estoque?: number;
      status?: string; tags?: string[]; categoriaId?: string;
    };

    if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    if (id) {
      // Verificar ownership
      const existing = await prisma.produto.findFirst({ where: { id, tenantId }, select: { id: true } });
      if (!existing) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

      const produto = await prisma.produto.update({
        where: { id },
        data: {
          nome, descricao: descricao ?? null, dicaDeUso: dicaDeUso ?? null,
          preco: preco ?? 0, imageUrl: imageUrl ?? null,
          estoque: estoque ?? 0, status: status ?? 'active',
          tags: tags ?? [], categoriaId: categoriaId ?? null,
        },
        include: { categoria: { select: { id: true, nome: true } } },
      });
      return NextResponse.json(produto);
    }

    const produto = await prisma.produto.create({
      data: {
        tenantId, nome, descricao: descricao ?? null, dicaDeUso: dicaDeUso ?? null,
        preco: preco ?? 0, imageUrl: imageUrl ?? null,
        estoque: estoque ?? 0, status: status ?? 'active',
        tags: tags ?? [], categoriaId: categoriaId ?? null,
      },
      include: { categoria: { select: { id: true, nome: true } } },
    });
    return NextResponse.json(produto, { status: 201 });
  } catch (err) {
    console.error('[vitrine/products POST]', err);
    return NextResponse.json({ error: 'Erro ao salvar produto' }, { status: 500 });
  }
}
