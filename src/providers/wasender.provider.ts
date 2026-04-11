import crypto from 'crypto';
import type { IProvider, IncomingMessage } from './provider.interface';

const WASENDER_BASE_URL = 'https://api.wasender.app/api';
const TIMEOUT_MS = 10_000;

// ── Tipos da API Wasender ─────────────────────────────────────────────────────

interface WasenderWebhookBody {
  instanceId?: string;
  messageId?:  string;
  from?:       string;
  message?:    { body?: string } | string;
  timestamp?:  number;
}

interface WasenderConnectResponse {
  instanceId: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export class WasenderProvider implements IProvider {
  readonly name = 'wasender' as const;

  parseWebhook(body: unknown): IncomingMessage | null {
    if (typeof body !== 'object' || body === null) return null;
    const b = body as WasenderWebhookBody;

    const instanceId = b.instanceId;
    const messageId  = b.messageId;
    const from       = b.from;
    const msgBody    = typeof b.message === 'string'
      ? b.message
      : b.message?.body;
    const timestamp  = b.timestamp ?? Math.floor(Date.now() / 1000);

    if (!instanceId || !messageId || !from || !msgBody) return null;

    return { instanceId, messageId, from, body: msgBody, timestamp, raw: body };
  }

  validateSignature(rawBody: Buffer, signature: string, secret: string): boolean {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // Normalizar: remover prefixo "sha256=" se presente, lowercase
    const normalized = signature.toLowerCase().replace(/^sha256=/, '');
    if (normalized.length !== expected.length) return false;

    return crypto.timingSafeEqual(
      Buffer.from(normalized),
      Buffer.from(expected),
    );
  }

  async connectInstance(apiKey: string, webhookUrl: string): Promise<string> {
    const res = await fetchWithTimeout(`${WASENDER_BASE_URL}/v1/instances`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ webhookUrl }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Wasender connectInstance ${res.status}: ${text}`);
    }

    const data = (await res.json()) as WasenderConnectResponse;
    return data.instanceId;
  }

  async disconnectInstance(apiKey: string, instanceId: string): Promise<void> {
    const res = await fetchWithTimeout(
      `${WASENDER_BASE_URL}/v1/instances/${instanceId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    // 404 = já desconectado; aceitar silenciosamente
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Wasender disconnectInstance ${res.status}: ${text}`);
    }
  }

  async sendMessage(
    apiKey: string,
    instanceId: string,
    to: string,
    text: string,
  ): Promise<void> {
    const res = await fetchWithTimeout(`${WASENDER_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ instanceId, to, text }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Wasender sendMessage ${res.status}: ${t}`);
    }
  }
}
