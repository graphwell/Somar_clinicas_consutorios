import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  _req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;

  try {
    const clinica = await prisma.clinica.findUnique({
      where: { slug },
      select: { tenantId: true, nome: true },
    });

    if (!clinica) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const servicos = await prisma.servico.findMany({
      where: { tenantId: clinica.tenantId, ativo: true },
      select: {
        id: true,
        nome: true,
        duracaoMinutos: true,
        bufferTimeMinutes: true,
        preco: true,
        descricao: true,
        color: true,
        profissionais: {
          where: { ativo: true },
          select: {
            id: true,
            nome: true,
            especialidade: true,
            fotoUrl: true,
            color: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json(servicos);
  } catch (err) {
    console.error('[public/services]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
