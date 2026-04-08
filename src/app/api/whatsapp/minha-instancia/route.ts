import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant, INSTANCE_SELECT } from '@/lib/wasender';

export async function GET(request: Request) {
  const tenant = await requireTenant(request);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const tenantId = tenant.tenantId;

  const [instancia, clinica] = await Promise.all([
    prisma.whatsappInstance.findFirst({
      where: { empresaId: tenantId },
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.clinica.findUnique({
      where: { tenantId },
      select: { whatsappMigrationStatus: true },
    })
  ]);

  return NextResponse.json({ 
    success: true, 
    instancia: instancia ?? null,
    migrationStatus: clinica?.whatsappMigrationStatus || 'TRIAL'
  });
}
