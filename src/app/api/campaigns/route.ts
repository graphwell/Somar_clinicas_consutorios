import { NextResponse } from 'next/server';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';
import { getTenantPrisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);
    const campanhas = await prisma.campanhaAviso.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(campanhas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar campanhas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);
    const body = await request.json();
    const { titulo, mensagem, segmentoFiltrosJson } = body;

    // Basic logic to save the campaign
    const nova = await prisma.campanhaAviso.create({
      data: {
        tenantId,
        titulo,
        mensagem,
        segmentoFiltrosJson: typeof segmentoFiltrosJson === 'string' ? segmentoFiltrosJson : JSON.stringify(segmentoFiltrosJson)
      }
    });

    return NextResponse.json(nova);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao criar campanha' }, { status: 500 });
  }
}
