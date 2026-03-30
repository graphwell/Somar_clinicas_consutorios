import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();
    const campanhas = await prisma.campanhaAviso.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(campanhas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { titulo, mensagem, tipo, filtroServico, filtroInativoDias, segmentoFiltrosJson } = await req.json();

    if (!titulo || !mensagem) {
      return NextResponse.json({ error: 'titulo e mensagem são obrigatórios' }, { status: 400 });
    }

    const campanha = await prisma.campanhaAviso.create({
      data: {
        tenantId,
        titulo,
        mensagem,
        tipo: tipo ?? 'todos',
        filtroServico: filtroServico ?? null,
        filtroInativoDias: filtroInativoDias ? Number(filtroInativoDias) : null,
        segmentoFiltrosJson: segmentoFiltrosJson ? JSON.stringify(segmentoFiltrosJson) : null,
        status: 'rascunho',
      },
    });

    return NextResponse.json(campanha, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    await prisma.campanhaAviso.deleteMany({ where: { id, tenantId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
