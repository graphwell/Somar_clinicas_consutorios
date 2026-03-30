import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { wasenderGet } from '@/lib/wasender';

export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();

    const [config, instance] = await Promise.all([
      prisma.marketingConfig.upsert({
        where: { tenantId },
        create: { tenantId },
        update: {},
      }),
      prisma.whatsappInstance.findFirst({
        where: { empresaId: tenantId },
        orderBy: { criadoEm: 'desc' },
        select: { id: true, sessionId: true, numeroWa: true, status: true, plataforma: true },
      }),
    ]);

    return NextResponse.json({ config, instance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const body = await req.json();

    const {
      lembreteAtivo,
      lembreteAntecedencia,
      lembreteTemplate,
      aniversarioAtivo,
      aniversarioDesconto,
      aniversarioTemplate,
      linkConfirmacao,
    } = body;

    const config = await prisma.marketingConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        lembreteAtivo: lembreteAtivo ?? false,
        lembreteAntecedencia: lembreteAntecedencia ?? 24,
        lembreteTemplate: lembreteTemplate ?? null,
        aniversarioAtivo: aniversarioAtivo ?? false,
        aniversarioDesconto: aniversarioDesconto ?? 15,
        aniversarioTemplate: aniversarioTemplate ?? null,
        linkConfirmacao: linkConfirmacao ?? null,
      },
      update: {
        ...(lembreteAtivo !== undefined && { lembreteAtivo }),
        ...(lembreteAntecedencia !== undefined && { lembreteAntecedencia }),
        ...(lembreteTemplate !== undefined && { lembreteTemplate }),
        ...(aniversarioAtivo !== undefined && { aniversarioAtivo }),
        ...(aniversarioDesconto !== undefined && { aniversarioDesconto }),
        ...(aniversarioTemplate !== undefined && { aniversarioTemplate }),
        ...(linkConfirmacao !== undefined && { linkConfirmacao }),
      },
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
