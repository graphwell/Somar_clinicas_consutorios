import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const convenios = await prisma.convenioEmpresa.findMany({
      where: { tenantId, ativo: true }
    });
    return NextResponse.json(convenios);
  } catch (error: any) {
    console.error('Convenios API Error:', error);
    return NextResponse.json({ error: 'Erro ao carregar convênios' }, { status: 500 });
  }
}
