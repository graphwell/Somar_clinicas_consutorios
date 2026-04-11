import prisma from '@/lib/prisma';
import { getProvider } from '../providers/provider.factory';
import { queueService } from '../queue/queue.service';

interface ProcessContext {
  tenantId:   string;
  provider:   string;
  instanceId: string;
}

export const webhookService = {
  /**
   * Orquestra o processamento de um webhook:
   * 1. Parseia o body via provider
   * 2. Deduplica por messageId + tenantId
   * 3. Publica na fila do tenant
   */
  async handle(body: unknown, context: ProcessContext): Promise<void> {
    const prov = getProvider(context.provider);

    // 1. Parsear
    const message = prov.parseWebhook(body);
    if (!message) return; // não é mensagem de entrada — descartar silenciosamente

    // 2. Deduplicar via processed_messages (constraint PRIMARY KEY)
    const isDuplicate = await checkAndMarkProcessed(context.tenantId, message.messageId);
    if (isDuplicate) return;

    // 3. Enfileirar por tenant
    await queueService.publish(context.tenantId, message);
  },
};

/**
 * Tenta inserir em processed_messages.
 * Retorna true se já existia (duplicata), false se foi inserido.
 * Usa a violação de constraint (23505) como sinal de deduplicação — zero query extra.
 */
async function checkAndMarkProcessed(
  tenantId:  string,
  messageId: string,
): Promise<boolean> {
  try {
    await prisma.$executeRaw`
      INSERT INTO processed_messages (message_id, tenant_id)
      VALUES (${messageId}, ${tenantId})
    `;
    return false;
  } catch (err: unknown) {
    // PostgreSQL unique_violation = '23505'
    if ((err as { code?: string }).code === '23505') return true;
    throw err;
  }
}
