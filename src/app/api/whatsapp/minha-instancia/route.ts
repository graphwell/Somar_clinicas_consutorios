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

  // Se não tem instância própria, verificar instância central Synka (env vars)
  const temCentral = !!(
    process.env.ULTRAMSG_INSTANCE_ID &&
    process.env.ULTRAMSG_TOKEN
  );

  return NextResponse.json({
    success: true,
    instancia: instancia ?? null,
    central: !instancia && temCentral
      ? {
          tipo: 'ULTRAMSG_CENTRAL',
          instanceId: process.env.ULTRAMSG_INSTANCE_ID,
          status: 'EM_USO',
          label: 'WhatsApp via Synka',
          info: 'Instancia compartilhada Synka — inclusa no seu plano',
        }
      : null,
    migrationStatus: clinica?.whatsappMigrationStatus || 'TRIAL',
  });
}
