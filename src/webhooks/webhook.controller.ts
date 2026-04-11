import { webhookService } from './webhook.service';

interface WebhookContext {
  tenantId:   string;
  provider:   string;
  instanceId: string;
}

/**
 * Processa o webhook.
 * Retorna { received: true } IMEDIATAMENTE sem aguardar o processamento.
 * O processamento ocorre em background via fire-and-forget.
 */
export async function handleWebhook(
  body:    unknown,
  context: WebhookContext,
): Promise<{ status: number; data: { received: boolean } }> {
  // Fire-and-forget: erros internos são capturados e logados
  webhookService.handle(body, context).catch((err: unknown) => {
    console.error('[webhook.controller] Erro ao processar mensagem:', {
      tenantId:  context.tenantId,
      provider:  context.provider,
      error:     (err as Error)?.message ?? String(err),
    });
  });

  return { status: 200, data: { received: true } };
}
