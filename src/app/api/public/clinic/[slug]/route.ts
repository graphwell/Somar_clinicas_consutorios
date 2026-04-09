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
      select: {
        id: true,
        tenantId: true,
        nome: true,
        nicho: true,
        descricao: true,
        configBranding: true,
        aceitaPagamento: true,
        openingTime: true,
        closingTime: true,
        workingDays: true,
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
        servicos: {
          where: { ativo: true },
          select: {
            id: true,
            nome: true,
            duracaoMinutos: true,
            preco: true,
          },
        },
      },
    });

    if (!clinica) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const branding = (clinica.configBranding as Record<string, unknown> | null) ?? {};

    return NextResponse.json({
      id: clinica.id,
      nome: clinica.nome,
      nicho: clinica.nicho,
      tenantId: clinica.tenantId,
      descricao: clinica.descricao,
      branding: {
        logoUrl: (branding.logoUrl as string) ?? null,
        primaryColor: (branding.primaryColor as string) ?? '#40916C',
        // compat com booking page legada
        ...branding,
      },
      aceitaPagamento: clinica.aceitaPagamento,
      openingTime: clinica.openingTime,
      closingTime: clinica.closingTime,
      workingDays: clinica.workingDays,
      profissionais: clinica.profissionais,
      servicos: clinica.servicos,
    });
  } catch (err) {
    console.error('[public/clinic/slug]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
