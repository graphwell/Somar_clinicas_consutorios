import { NextResponse } from 'next/server';
import { getAuthorizedTenantId } from '@/lib/auth-helpers';
import { getTenantPrisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);
    
    const clinica = await prisma.clinica.findUnique({
      where: { tenantId }
    });
    return NextResponse.json({ success: true, clinica });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await getAuthorizedTenantId();
    const prisma = getTenantPrisma(tenantId);
    const data = await request.json();
    const { razaoSocial, cnpj, endereco, adminPhone, nicho, botActive } = data;

    const clinica = await prisma.clinica.update({
      where: { tenantId },
      data: {
        razaoSocial,
        cnpj,
        endereco,
        adminPhone,
        nicho,
        botActive
      }
    });

    return NextResponse.json({ success: true, clinica });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
