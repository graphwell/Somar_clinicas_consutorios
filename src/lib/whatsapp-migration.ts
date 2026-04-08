import prisma from './prisma';
import { WhatsAppPool } from './whatsapp-pool';
import { WhatsappPlataforma, WhatsappMigrationStatus } from '@prisma/client';

/**
 * Serviço de Migração de WhatsApp (Módulo 3)
 * Automatiza o swap seguro de instâncias conforme o plano de assinatura.
 */
export const WhatsAppMigration = {
  /**
   * Prepara o terreno para a migração após a confirmação de pagamento.
   * Reserva uma nova instância mas mantém a antiga ativa por enquanto.
   */
  async prepareMigration(tenantId: string) {
    // 1. Buscar dados da clínica / tenant
    const clinica = await prisma.clinica.findUnique({
      where: { tenantId },
      select: { id: true, nome: true, whatsappMigrationStatus: true },
    });

    if (!clinica) {
      console.warn(`[Migration] Clínica não encontrada para tenantId: ${tenantId}`);
      return { success: false, error: 'Clínica não encontrada' };
    }

    // 2. Regra de Idempotência: Só migra se estiver em modo TRIAL
    if (clinica.whatsappMigrationStatus !== 'TRIAL') {
      console.log(`[Migration] Tenant ${tenantId} já está em ${clinica.whatsappMigrationStatus}. Ignorando.`);
      return { success: true, message: 'Já migrado ou em andamento' };
    }

    try {
      // 3. Iniciar Transação Atômica
      return await prisma.$transaction(async (tx) => {
        // 4. Verificar se já existe uma instância WaSender vinculada (Double check)
        const existingWasender = await tx.whatsappInstance.findFirst({
          where: {
            empresaId: tenantId,
            plataforma: 'WASENDERAPI',
          },
        });

        if (existingWasender) {
          console.log(`[Migration] Tenant ${tenantId} já tem uma instância WaSender. Avançando status.`);
          await tx.clinica.update({
            where: { tenantId },
            data: { whatsappMigrationStatus: 'MIGRATING' },
          });
          return { success: true, status: 'MIGRATING' };
        }

        // 5. Buscar instância disponível no pool WaSender
        const available = await WhatsAppPool.getAvailableInstance('WASENDERAPI', tx);
        if (!available) {
          throw new Error('Não há instâncias WaSender (Produção) disponíveis no pool. Contate o administrador.');
        }

        // 6. Claim da nova instância
        await WhatsAppPool.claimInstance(available.id, tenantId, tx);

        // 7. Atualizar status da Clínica para MIGRATING
        await tx.clinica.update({
          where: { tenantId },
          data: { whatsappMigrationStatus: 'MIGRATING' },
        });

        // 8. Buscar instância UltraMsg antiga (para o log)
        const oldInstance = await tx.whatsappInstance.findFirst({
          where: {
            empresaId: tenantId,
            plataforma: 'ULTRAMSG',
          },
          orderBy: { criadoEm: 'desc' },
        });

        // 9. Registrar Log da Migração (Módulo 5)
        await tx.whatsappMigrationLog.create({
          data: {
            tenantId,
            fromPlatform: oldInstance?.plataforma || 'ULTRAMSG',
            fromSessionId: oldInstance?.sessionId || null,
            toPlatform: 'WASENDERAPI',
            toSessionId: available.sessionId,
            status: 'STARTING_MIGRATION',
          },
        });

        console.log(`[Migration] Sucesso: ${tenantId} agora em modo MIGRATING.`);
        return { success: true, newSessionId: available.sessionId };
      });
    } catch (err: any) {
      console.error(`[Migration] Erro crítico no tenant ${tenantId}:`, err.message);
      throw err;
    }
  },

  /**
   * Finaliza o processo de migração após a conexão bem-sucedida da nova instância.
   * Realiza o descarte da instância antiga e estabiliza o status.
   */
  async finalizeMigration(tenantId: string, connectedSessionId: string) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Atualizar status da Clínica para PRODUCTION
        await tx.clinica.update({
          where: { tenantId },
          data: { whatsappMigrationStatus: 'PRODUCTION' },
        });

        // 2. Liberar qualquer instância que NÃO seja a nova conectada
        // especificamente as do provedor antigo (UltraMsg)
        await WhatsAppPool.releaseInstance(tenantId, 'ULTRAMSG', tx);

        // 3. Atualizar o log de migração para COMPLETED
        await tx.whatsappMigrationLog.updateMany({
          where: {
            tenantId,
            toSessionId: connectedSessionId,
            status: 'STARTING_MIGRATION',
          },
          data: {
            status: 'COMPLETED',
          },
        });

        console.log(`[Migration] Sucesso: Migração do tenant ${tenantId} FINALIZADA.`);
        return { success: true };
      });
    } catch (err: any) {
      console.error(`[Migration] Erro ao finalizar para ${tenantId}:`, err.message);
      return { success: false, error: err.message };
    }
  },
};
