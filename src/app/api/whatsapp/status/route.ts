import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/wasender';
import { WhatsAppProvider } from '@/lib/whatsapp-provider';
import { WhatsAppMigration } from '@/lib/whatsapp-migration';

export async function GET(request: Request) {
  const tenant = await requireTenant(request);
  if (!tenant) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const tenantId = tenant.tenantId;

  // 1. Buscar instância associada (se em migração, terá 2, priorizamos a mais nova/WASENDER)
  const instancia = await prisma.whatsappInstance.findFirst({
    where: { empresaId: tenantId },
    orderBy: { criadoEm: 'desc' }, // A de produção/migração costuma ser a mais nova
  });

  if (!instancia) {
    return NextResponse.json({ success: true, conectado: false, instancia: null });
  }

  try {
    const live = await WhatsAppProvider.getStatus(
      instancia.plataforma, 
      instancia.sessionId, 
      instancia.bearerToken
    );

    // 2. Se conectou e está em migração, finalizamos o swap
    if (live.conectado) {
      const clinica = await prisma.clinica.findUnique({
        where: { tenantId },
        select: { whatsappMigrationStatus: true },
      });

      if (clinica?.whatsappMigrationStatus === 'MIGRATING') {
        // O Swap libera a instância antiga e promove para PRODUCTION
        await WhatsAppMigration.finalizeMigration(tenantId, instancia.sessionId);
      }

      // Atualizar número no banco se ainda não tiver e marcar como conectado
      if (live.numero && !instancia.numeroWa) {
        await prisma.whatsappInstance.update({
          where: { id: instancia.id },
          data: { 
            numeroWa: live.numero, 
            conectadoEm: new Date(),
            status: 'EM_USO' 
          },
        });
      }
    }

    await prisma.whatsappInstance.update({
      where: { id: instancia.id },
      data: { ultimoPing: new Date() },
    });

    return NextResponse.json({ 
      success: true, 
      conectado: live.conectado, 
      numero: live.numero || instancia.numeroWa,
      status: instancia.status 
    });
  } catch (err: any) {
    console.error('[Client Status API] Erro:', err);
    return NextResponse.json({ success: false, error: 'Erro ao consultar status' }, { status: 500 });
  }
}
