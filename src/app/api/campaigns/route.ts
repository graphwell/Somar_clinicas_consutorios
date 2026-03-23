import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') || 'clinica_id_default';

  try {
    const campanhas = await prisma.campanhaAviso.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(campanhas);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar campanhas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { tenantId, titulo, mensagem, segmentoFiltrosJson } = body;

  try {
    // Basic logic to save the campaign
    const nova = await prisma.campanhaAviso.create({
      data: {
        tenantId: tenantId || 'clinica_id_default',
        titulo,
        mensagem,
        segmentoFiltrosJson: JSON.stringify(segmentoFiltrosJson)
      }
    });

    // Em um ambiente real, aqui faríamos trigger na API do N8N ou UltraMsg
    // Ex: axios.post('webhook-n8n/trigger-campaign', { campaignId: nova.id })

    return NextResponse.json(nova);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar campanha' }, { status: 500 });
  }
}
