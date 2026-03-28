import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const SECRET = '13201320';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const clinicas = await prisma.clinica.findMany({
      include: {
        _count: { select: { agendamentos: true, profissionais: true, pacientes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Buscar assinaturas separadamente
    const assinaturas = await prisma.assinatura.findMany({
      select: { tenantId: true, plano: true, status: true, updatedAt: true },
    });
    const assinaturaMap = Object.fromEntries(assinaturas.map(a => [a.tenantId, a]));

    const result = clinicas.map(c => ({
      ...c,
      assinatura: assinaturaMap[c.tenantId] ?? null,
    }));

    return NextResponse.json({ success: true, clinicas: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
