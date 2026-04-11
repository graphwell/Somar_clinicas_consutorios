/**
 * POST /api/webhook/whatsapp
 *
 * Único endpoint público que recebe mensagens de TODOS os provedores WhatsApp
 * (Wasender + UltraMsg) para TODOS os tenants.
 *
 * O roteamento tenant ← instanceId é feito por instance_registry.
 * Autenticação via HMAC — sem API Key de entrada.
 *
 * Registrar este URL nos painéis dos provedores:
 *   https://synka.somar.ia.br/api/webhook/whatsapp
 */

import { nextWebhookHandler } from '@/webhooks/webhook.router';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  return nextWebhookHandler(req);
}
