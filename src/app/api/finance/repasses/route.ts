import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const hoje = new Date();
    const defaultPeriodo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const periodo = searchParams.get('periodo') || defaultPeriodo;

    const repasses = await prisma.repasseProfissional.findMany({
      where: { tenantId, periodo },
      include: {
        profissional: { select: { id: true, nome: true, especialidade: true, percentualRepasse: true, repasseTipo: true } },
      },
      orderBy: { totalRepasse: 'desc' },
    });

    return NextResponse.json(repasses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
