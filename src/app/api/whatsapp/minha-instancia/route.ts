import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant, INSTANCE_SELECT } from '@/lib/wasender';

export async function GET(request: Request) {
  const tenant = await requireTenant(request);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const instancia = await prisma.whatsappInstance.findFirst({
    where: { empresaId: tenant.tenantId },
    select: INSTANCE_SELECT,
  });

  return NextResponse.json({ success: true, instancia: instancia ?? null });
}
