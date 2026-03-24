import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params; // id can be tenantId or slug

  try {
    const clinica = await prisma.clinica.findFirst({
      where: {
        OR: [{ tenantId: id }, { slug: id }]
      },
      include: {
        servicos: { where: { ativo: true } },
        profissionais: { where: { ativo: true } }
      }
    });

    if (!clinica) {
      return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      nome: clinica.nome,
      nicho: clinica.nicho,
      branding: clinica.configBranding,
      tenantId: clinica.tenantId,
      servicos: clinica.servicos,
      profissionais: clinica.profissionais
    });

  } catch (error) {
    console.error('Erro na API pública da clínica:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
