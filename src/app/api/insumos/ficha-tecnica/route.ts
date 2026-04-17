import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantFromRequest } from '@/lib/auth-utils';

// GET /api/insumos/ficha-tecnica?servicoId=xxx
export async function GET(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const servicoId = new URL(req.url).searchParams.get('servicoId');

  const where: any = { tenantId: tenant.tenantId };
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
}

// POST /api/insumos/ficha-tecnica — adicionar/atualizar item
export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { servicoId, produtoId, quantidadeEst, unidade } = await req.json();

  if (!servicoId || !produtoId || !quantidadeEst) {
    return NextResponse.json({ error: 'servicoId, produtoId e quantidadeEst são obrigatórios' }, { status: 400 });
  }

  // Upsert: cria ou atualiza a ficha técnica
  const ficha = await prisma.insumoFichaTecnica.upsert({
    where: { servicoId_produtoId: { servicoId, produtoId } },
    update: { quantidadeEst, unidade: unidade || 'un' },
    create: {
      tenantId: tenant.tenantId,
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
}

// DELETE /api/insumos/ficha-tecnica?id=xxx
export async function DELETE(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  await prisma.insumoFichaTecnica.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
