import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/** GET /api/vitrine/suggestions?servicoId=xxx */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const servicoId = searchParams.get('servicoId');

    const sugestoes = await prisma.servicoSugestao.findMany({
      where: { tenantId, ...(servicoId ? { servicoId } : {}) },
      include: {
        produto: { select: { id: true, nome: true, preco: true, imageUrl: true, estoque: true, status: true } },
        servico: { select: { id: true, nome: true } },
      },
    });
    return NextResponse.json(sugestoes);
  } catch (err) {
    console.error('[vitrine/suggestions GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar sugestões' }, { status: 500 });
  }
}

/** POST /api/vitrine/suggestions — body: { servicoId, produtoId } */
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    let body: { servicoId?: string; produtoId?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }

    if (!body.servicoId || !body.produtoId) {
      return NextResponse.json({ error: 'servicoId e produtoId obrigatórios' }, { status: 400 });
    }

    const sugestao = await prisma.servicoSugestao.upsert({
      where: { servicoId_produtoId: { servicoId: body.servicoId, produtoId: body.produtoId } },
      update: {},
      create: { tenantId, servicoId: body.servicoId, produtoId: body.produtoId },
      include: { produto: { select: { id: true, nome: true, preco: true, imageUrl: true } } },
    });
    return NextResponse.json(sugestao, { status: 201 });
  } catch (err) {
    console.error('[vitrine/suggestions POST]', err);
    return NextResponse.json({ error: 'Erro ao criar sugestão' }, { status: 500 });
  }
}

/** DELETE /api/vitrine/suggestions?id=xxx */
export async function DELETE(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const existing = await prisma.servicoSugestao.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Sugestão não encontrada' }, { status: 404 });

    await prisma.servicoSugestao.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[vitrine/suggestions DELETE]', err);
    return NextResponse.json({ error: 'Erro ao remover sugestão' }, { status: 500 });
  }
}
