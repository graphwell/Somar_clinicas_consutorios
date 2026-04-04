import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/lib/prisma';
import { PLANOS, UPSELLS } from '@/lib/planos-synka';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID não fornecido na sessão.' }, { status: 401 });
    }

    const prisma = getTenantPrisma();
    const assinatura = await prisma.assinatura.findUnique({ where: { tenantId } });

    return NextResponse.json({ planos: PLANOS, upsells: UPSELLS, assinatura });
  } catch (error: any) {
    console.error('[BILLING_PLANOS_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar planos.' }, { status: 500 });
  }
}
