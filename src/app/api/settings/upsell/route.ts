import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') || 'clinica_id_default';

  try {
    const combos = await prisma.comboUpsell.findMany({
      where: { tenantId },
      include: {
        gatilho: { select: { nome: true } },
        oferta: { select: { nome: true } }
      }
    });
    return NextResponse.json(combos);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar combos de Upsell' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { tenantId, servicoGatilhoId, servicoOferecidoId, descricaoOferta, desconto, ativo } = body;

  try {
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
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar combo de Upsell' }, { status: 500 });
  }
}
