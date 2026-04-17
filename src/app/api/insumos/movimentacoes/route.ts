import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantFromRequest } from '@/lib/auth-utils';

// GET /api/insumos/movimentacoes?produtoId=xxx&limit=50
export async function GET(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const produtoId = searchParams.get('produtoId') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');

  const movs = await prisma.movimentacaoEstoque.findMany({
    where: {
      tenantId: tenant.tenantId,
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
}
