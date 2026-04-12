import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function verificarAdminSecret(request: Request): boolean {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET) return false;
  return request.headers.get('x-admin-secret') === ADMIN_SECRET;
}

export async function GET(request: Request) {
  if (!process.env.ADMIN_SECRET) return NextResponse.json({ error: 'ADMIN_SECRET nao configurado' }, { status: 500 });
  if (!verificarAdminSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
