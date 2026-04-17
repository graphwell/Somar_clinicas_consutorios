import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

// GET /api/insumos/movimentacoes?produtoId=xxx&limit=50
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const produtoId = searchParams.get('produtoId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const movs = await prisma.movimentacaoEstoque.findMany({
      where: {
        tenantId,
        ...(produtoId ? { produtoId } : {}),
      },
      include: {
        produto: { select: { nome: true, unidade: true } },
        profissional: { select: { nome: true } },
        agendamento: { select: { id: true, dataHora: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(movs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
