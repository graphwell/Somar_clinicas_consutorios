import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });

  try {
    const convenios = await prisma.convenioEmpresa.findMany({
      where: { tenantId },
      orderBy: { nomeConvenio: 'asc' }
    });
    return NextResponse.json(convenios);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar convenios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { tenantId, nomeConvenio, ativo } = body;

  if (!tenantId || !nomeConvenio) return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });

  try {
    const convenio = await prisma.convenioEmpresa.create({
      data: {
        tenantId,
        nomeConvenio,
        ativo: ativo ?? true
      }
    });
    return NextResponse.json(convenio);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar convênio' }, { status: 500 });
  }
}
