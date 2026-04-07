import { NextRequest } from 'next/server';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';
import { ultraMsgPost, getWasenderConfig, wasenderPost } from '@/lib/wasender';

export const dynamic = 'force-dynamic';

// Controle anti-spam: timestamp do último envio por número
const ultimoEnvio = new Map<string, number>();

function horarioSeguro(): boolean {
  const hora = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Fortaleza',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
    10
  );
  return hora >= 8 && hora < 20;
}

/**
 * POST /api/n8n/whatsapp/enviar
 * Body: { para, mensagem, tenantId, tipo? }
 * Envia via UltraMsg central (ou WaSender demo como fallback).
 * Proteção anti-spam: mínimo 1s entre mensagens para o mesmo número.
 * Horário seguro: 8h–20h (Fortaleza).
 */
export async function POST(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: { para?: string; mensagem?: string; tenantId?: string; tipo?: string };
  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { para, mensagem } = body;
  if (!para || !mensagem) {
    return n8nError('para e mensagem são obrigatórios', 'MISSING_PARAM');
  }

  if (!horarioSeguro()) {
    return n8nError(
      'Fora do horário permitido (8h–20h horário de Fortaleza)',
      'OUTSIDE_HOURS',
      403
    );
  }

  const clean = para.replace(/\D/g, '');
  const agora = Date.now();
  const ultimo = ultimoEnvio.get(clean) ?? 0;
  if (agora - ultimo < 1000) {
    return n8nError('Aguarde 1 segundo entre mensagens para o mesmo número', 'RATE_LIMIT', 429);
  }
  ultimoEnvio.set(clean, agora);

  try {
    const cfg = getWasenderConfig(null);

    let result: { ok: boolean; data: unknown };

    if (cfg.ultraMsg) {
      result = await ultraMsgPost(cfg.ultraMsg.instanceId, cfg.ultraMsg.token, 'messages/chat', {
        to: clean,
        body: mensagem,
      });
    } else if (cfg.apiKey) {
      result = await wasenderPost(cfg.apiKey, '/messages/send', { to: clean, message: mensagem });
    } else {
      return n8nError('Nenhuma instância WhatsApp central configurada', 'NO_INSTANCE', 503);
    }

    if (!result.ok) {
      console.error('[n8n/whatsapp/enviar] Falha no provider:', result.data);
      return n8nError('Falha ao enviar mensagem', 'PROVIDER_ERROR', 502);
    }

    return n8nSuccess({ enviado: true, para: clean });
  } catch (err) {
    console.error('[n8n/whatsapp/enviar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
