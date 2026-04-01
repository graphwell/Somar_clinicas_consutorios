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

    const existente = await prisma.transacaoFinanceira.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existente) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    const body = await req.json();
    const { status, dataPagamento, observacao, formaPagamento, valor, descricao, categoria } = body;

    const updated = await prisma.transacaoFinanceira.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(dataPagamento !== undefined && { dataPagamento: dataPagamento ? new Date(dataPagamento) : null }),
        ...(observacao !== undefined && { observacao }),
        ...(formaPagamento !== undefined && { formaPagamento }),
        ...(valor !== undefined && { valor: parseFloat(valor) }),
        ...(descricao !== undefined && { descricao }),
        ...(categoria !== undefined && { categoria }),
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

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId, role } = await getSessionInfo();
    if (role !== 'admin' && role !== 'synka_admin') {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
    }
    await prisma.transacaoFinanceira.updateMany({
      where: { id: params.id, tenantId },
      data: { status: 'canceled' },
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
