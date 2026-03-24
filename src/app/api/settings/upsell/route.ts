import { NextResponse } from 'next/server';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';
import { getTenantPrisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);
    const combos = await prisma.comboUpsell.findMany({
      where: { tenantId },
      include: {
        gatilho: { select: { nome: true } },
        oferta: { select: { nome: true } }
      }
    });
    return NextResponse.json(combos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar combos de Upsell' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);
    const body = await request.json();
    const { servicoGatilhoId, servicoOferecidoId, descricaoOferta, desconto, ativo } = body;

    const combo = await prisma.comboUpsell.create({
      data: {
        tenantId,
        servicoGatilhoId,
        servicoOferecidoId,
        descricaoOferta,
        desconto: Number(desconto) || 0,
        ativo: ativo ?? true
      }
    });
    return NextResponse.json(combo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao criar combo de Upsell' }, { status: 500 });
  }
}
