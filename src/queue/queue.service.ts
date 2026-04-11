/**
 * Queue service — publica mensagens para processamento assíncrono.
 *
 * Implementação atual: in-process com setImmediate (zero dependências externas).
 * Limitação: em ambientes serverless (Vercel Lambda), o processo pode ser congelado
 * antes do processamento completar. Para produção com garantia de entrega:
 *
 *   TODO: Migrar para BullMQ + Redis:
 *     npm install bullmq ioredis
 *     REDIS_URL=redis://... no .env
 *     Substituir setImmediate por queue.add(job) do BullMQ
 */

import type { IncomingMessage } from '../providers/provider.interface';
import { queueProcessor, type WebhookJob } from './queue.processor';

export interface QueueService {
  publish(tenantId: string, message: IncomingMessage): Promise<void>;
  startWorker(tenantId: string): void;
}

export const queueService: QueueService = {
  async publish(tenantId: string, message: IncomingMessage): Promise<void> {
    const job: WebhookJob = { tenantId, message };

    // setImmediate: executa após retornar a resposta HTTP, no mesmo event loop
    setImmediate(() => {
      queueProcessor.process(job).catch((err: unknown) => {
        console.error('[queue.service] Falha crítica não capturada:', {
          tenantId,
          messageId: message.messageId,
          error:     (err as Error)?.message ?? String(err),
        });
      });
    });
  },

  startWorker(_tenantId: string): void {
    // No modelo in-process, o worker é o próprio setImmediate acima.
    // Com BullMQ: new Worker(`whatsapp:${_tenantId}`, processor, { connection })
  },
};
