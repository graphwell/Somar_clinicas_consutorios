import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/** GET /api/vitrine/order-items?agendamentoId=xxx */
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const agendamentoId = searchParams.get('agendamentoId');

    const itens = await prisma.pedidoItem.findMany({
      where: { tenantId, ...(agendamentoId ? { agendamentoId } : {}) },
      include: {
        produto: { select: { id: true, nome: true, imageUrl: true } },
        combo: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(itens);
  } catch (err) {
    console.error('[vitrine/order-items GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 });
  }
}

/**
 * POST /api/vitrine/order-items
 * Usado pelo backoffice e pelo fluxo de agendamento público (sem auth — ver rota pública).
 * Body: [{ produtoId?, comboId?, quantidade, precoUnitario, agendamentoId?, pacienteId? }]
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    let body: { items: Array<{ produtoId?: string; comboId?: string; quantidade?: number; precoUnitario: number; agendamentoId?: string; pacienteId?: string }> };
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 }); }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'items[] obrigatório' }, { status: 400 });
    }

    const criados = await prisma.pedidoItem.createMany({
      data: body.items.map(i => ({
        tenantId,
        produtoId: i.produtoId ?? null,
        comboId: i.comboId ?? null,
        quantidade: i.quantidade ?? 1,
        precoUnitario: i.precoUnitario,
        agendamentoId: i.agendamentoId ?? null,
        pacienteId: i.pacienteId ?? null,
        status: 'reserved',
      })),
    });

    return NextResponse.json({ count: criados.count }, { status: 201 });
  } catch (err) {
    console.error('[vitrine/order-items POST]', err);
    return NextResponse.json({ error: 'Erro ao criar itens' }, { status: 500 });
  }
}
