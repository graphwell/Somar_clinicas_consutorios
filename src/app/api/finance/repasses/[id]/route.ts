import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId, role } = await getSessionInfo();
    if (role === 'profissional') {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
    }

    const existente = await prisma.repasseProfissional.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existente) {
      return NextResponse.json({ error: 'Repasse não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { status, observacao, pago_em } = body;

    const updated = await prisma.repasseProfissional.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(observacao !== undefined && { observacao }),
        ...(pago_em !== undefined && { pago_em: pago_em ? new Date(pago_em) : null }),
        ...(status === 'pago' && !pago_em && { pago_em: new Date() }),
      },
      include: {
        profissional: { select: { id: true, nome: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
