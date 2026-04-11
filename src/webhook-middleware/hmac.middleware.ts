/**
 * Middleware de validação HMAC para webhooks.
 *
 * Em Next.js App Router não há Express middleware — este módulo exporta uma
 * função pura que valida o rawBody ANTES de qualquer parsing de JSON.
 * O raw body deve ser lido UMA ÚNICA VEZ pelo caller e passado aqui.
 */

import { instanceRepository } from '../instances/instance.repository';
import { getProvider } from '../providers/provider.factory';
import { ProviderAuthError, InstanceNotFoundError } from '../webhooks/errors';

export interface ValidatedContext {
  tenantId:   string;
  provider:   string;
  instanceId: string;
}

/**
 * Extrai o instanceId do body cru sem parsear o JSON completo.
 * Tenta os campos mais comuns de cada provedor.
 */
function extractInstanceId(rawBody: Buffer): string | null {
  try {
    const body = JSON.parse(rawBody.toString('utf-8')) as Record<string, unknown>;
    return (
      (body['instanceId']         as string | undefined) ??
      (body['instance_id']        as string | undefined) ??
      ((body['data'] as Record<string, unknown> | undefined)?.['instanceId'] as string | undefined) ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Valida a assinatura HMAC do webhook.
 *
 * @param rawBody   Body cru em Buffer (lido antes de qualquer parse)
 * @param headers   Headers HTTP normalizados (lowercase keys)
 * @returns         Context com tenantId + provider se válido
 * @throws          ProviderAuthError | InstanceNotFoundError
 */
export async function validateWebhookSignature(
  rawBody: Buffer,
  headers: Record<string, string | undefined>,
): Promise<ValidatedContext> {
  const instanceId = extractInstanceId(rawBody);
  if (!instanceId) {
    throw new ProviderAuthError('instanceId não encontrado no payload');
  }

  const record = await instanceRepository.findByInstanceId(instanceId);
  if (!record || record.status !== 'active') {
    throw new InstanceNotFoundError(instanceId);
  }

  const provider = getProvider(record.provider);

  // Detecta header de assinatura por provedor
  const signature =
    headers['x-wasender-signature'] ??
    headers['x-ultramsg-hmac'];

  if (!signature) {
    throw new ProviderAuthError(`Header de assinatura ausente para provedor "${record.provider}"`);
  }

  const valid = provider.validateSignature(rawBody, signature, record.webhookSecret);
  if (!valid) {
    throw new ProviderAuthError('Assinatura HMAC inválida');
  }

  return {
    tenantId:   record.tenantId,
    provider:   record.provider,
    instanceId,
  };
}
