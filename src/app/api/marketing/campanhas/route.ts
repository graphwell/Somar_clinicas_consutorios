import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();
    const campanhas = await prisma.marketingCampanha.findMany({
      where: { tenantId },
      orderBy: { criadoEm: 'desc' },
    });
    return NextResponse.json(campanhas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { nome, tipo, filtroServico, filtroInativoDias, template } = await req.json();

    if (!nome || !template) {
      return NextResponse.json({ error: 'nome e template são obrigatórios' }, { status: 400 });
    }

    const campanha = await prisma.marketingCampanha.create({
      data: {
        tenantId,
        nome,
        tipo: tipo ?? 'todos',
        filtroServico: filtroServico ?? null,
        filtroInativoDias: filtroInativoDias ? Number(filtroInativoDias) : null,
        template,
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
    await prisma.marketingCampanha.deleteMany({ where: { id, tenantId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
