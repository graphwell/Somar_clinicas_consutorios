/**
 * Processa jobs de webhook: chama o N8n com retry exponencial.
 *
 * Retry: 3 tentativas com delays 5s → 30s → 120s.
 * Após 3 falhas: dead-letter (log de alerta).
 *
 * Para produção com alto volume: substituir por BullMQ + Redis:
 *   npm install bullmq ioredis
 */

import type { IncomingMessage } from '../providers/provider.interface';

export interface WebhookJob {
  tenantId: string;
  message:  IncomingMessage;
}

const N8N_WEBHOOK_URL  = process.env.N8N_WEBHOOK_URL ?? '';
const TIMEOUT_MS       = 10_000;
const RETRY_DELAYS_MS  = [5_000, 30_000, 120_000] as const;

async function callN8n(job: WebhookJob): Promise<void> {
  if (!N8N_WEBHOOK_URL) {
    console.warn('[queue.processor] N8N_WEBHOOK_URL não configurada — job ignorado silenciosamente');
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId:      job.tenantId,
        instanceId:    job.message.instanceId,
        messageId:     job.message.messageId,
        from:          job.message.from,
        // Aliases retrocompatíveis com workflows existentes:
        message:       job.message.body,
        mensagem:      job.message.body,
        text:          job.message.body,
        telefone:      job.message.from,
        sender_number: job.message.from,
        sessionId:     job.message.from,
        timestamp:     job.message.timestamp,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`N8n respondeu ${res.status}: ${await res.text()}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

export const queueProcessor = {
  async process(job: WebhookJob): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        await callN8n(job);
        return; // sucesso
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[attempt];
          console.warn('[queue.processor] Tentativa falhou, retentando:', {
            attempt: attempt + 1,
            delayMs: delay,
            tenantId:  job.tenantId,
            messageId: job.message.messageId,
            error:     lastError.message,
          });
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Dead-letter: log crítico após 3 falhas
    console.error('[queue.processor] DEAD LETTER — job descartado após 3 tentativas:', {
      tenantId:  job.tenantId,
      messageId: job.message.messageId,
      from:      job.message.from,
      error:     lastError?.message,
    });
  },
};
