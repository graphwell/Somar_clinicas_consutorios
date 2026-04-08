import { PrismaClient, WhatsappPlataforma } from '@prisma/client';
import prisma from './prisma';

/**
 * Lib de Gerenciamento do Pool de Instâncias WhatsApp.
 * Foco em atomicidade e segurança multi-tenant.
 */
export const WhatsAppPool = {
  /**
   * Busca a próxima instância disponível de um provedor específico.
   * Ordena pelas mais antigas para garantir rotação.
   */
  async getAvailableInstance(plataforma: WhatsappPlataforma, tx?: any) {
    const db = tx || prisma;
    return db.whatsappInstance.findFirst({
      where: {
        empresaId: null,
        status: 'LIVRE',
        plataforma,
      },
      orderBy: {
        criadoEm: 'asc',
      },
    });
  },

  /**
   * Vincula uma instância a um tenant de forma ATÔMICA.
   * Garante que duas clínicas não tentem pegar a mesma instância ao mesmo tempo.
   */
  async claimInstance(instanceId: string, tenantId: string, tx?: any) {
    const db = tx || prisma;
    const result = await db.whatsappInstance.updateMany({
      where: {
        id: instanceId,
        empresaId: null, // Garantia de que ainda está disponível
      },
      data: {
        empresaId: tenantId,
        status: 'EM_USO',
        conectadoEm: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error('Instance already claimed or not found');
    }

    return true;
  },

  /**
   * Libera a instância de um tenant de volta para o pool.
   * Pode ser filtrado por plataforma para liberações seletivas (ex: liberar só UltraMsg).
   */
  async releaseInstance(tenantId: string, plataforma?: WhatsappPlataforma, tx?: any) {
    const db = tx || prisma;
    return db.whatsappInstance.updateMany({
      where: {
        empresaId: tenantId,
        ...(plataforma ? { plataforma } : {}),
      },
      data: {
        empresaId: null,
        status: 'LIVRE',
      },
    });
  },
};
