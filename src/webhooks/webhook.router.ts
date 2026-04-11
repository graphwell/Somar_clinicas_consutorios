/**
 * Webhook Router — Next.js App Router adapter.
 *
 * Este módulo exporta `nextWebhookHandler`, usado pelo route handler em:
 *   src/app/api/webhook/whatsapp/route.ts  →  POST /api/webhook/whatsapp
 *
 * Equivalente Express (para referência futura se migrar para microserviço):
 *   import express from 'express';
 *   const app = express();
 *   app.post(
 *     '/webhook/whatsapp',
 *     express.raw({ type: '*\/*' }),   // raw body ANTES de qualquer parse
 *     expressWebhookHandler,
 *   );
 *
 * Fluxo:
 *   1. Lê raw body UMA vez (Buffer) — necessário para HMAC
 *   2. Valida assinatura HMAC via hmac.middleware
 *   3. Parseia body como JSON
 *   4. Responde 200 imediatamente
 *   5. Processa em background (fire-and-forget)
 */

import { validateWebhookSignature } from '../webhook-middleware/hmac.middleware';
import { handleWebhook } from './webhook.controller';
import { ProviderAuthError, InstanceNotFoundError } from './errors';

export async function nextWebhookHandler(req: Request): Promise<Response> {
  // Lê raw body UMA vez — necessário para validação HMAC E parse JSON
  const rawBodyBuffer = Buffer.from(await req.arrayBuffer());

  // Normalizar headers para lowercase
  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });

  // ── HMAC validation (antes de qualquer parse) ─────────────────────────────
  let context: { tenantId: string; provider: string; instanceId: string };

  try {
    context = await validateWebhookSignature(rawBodyBuffer, headers);
  } catch (err) {
    if (err instanceof InstanceNotFoundError) {
      // Não revelar se a instância existe — responder 200 silenciosamente
      return Response.json({ received: true });
    }
    if (err instanceof ProviderAuthError) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[webhook.router] Erro inesperado na validação HMAC:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBodyBuffer.toString('utf-8'));
  } catch {
    // Body não é JSON válido — UltraMsg às vezes envia form-encoded
    return Response.json({ received: true });
  }

  // ── Resposta 200 + processamento background ───────────────────────────────
  const { status, data } = await handleWebhook(parsedBody, context);
  return Response.json(data, { status });
}
