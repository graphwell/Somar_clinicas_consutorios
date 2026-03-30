import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const servico = searchParams.get('servico');

    if (!servico) return NextResponse.json({ combos: [] });

    const combos = await prisma.marketingCombo.findMany({
      where: {
        tenantId,
        ativo: true,
        gatilhoServico: { equals: servico, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'asc' },
      take: 3,
    });

    return NextResponse.json({ combos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
