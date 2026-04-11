import crypto from 'crypto';
import type { IProvider, IncomingMessage } from './provider.interface';

const ULTRAMSG_BASE_URL = 'https://api.ultramsg.com';
const TIMEOUT_MS = 10_000;

// ── Tipos da API UltraMsg ─────────────────────────────────────────────────────

interface UltraMsgWebhookBody {
  event_type?:  string;
  instanceId?:  string;
  instance_id?: string;
  data?: {
    id?:      string;
    from?:    string;
    body?:    string;
    fromMe?:  boolean;
    time?:    number;
  };
}

interface UltraMsgConnectResponse {
  id: string; // instanceToken
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

export class UltraMsgProvider implements IProvider {
  readonly name = 'ultramsg' as const;

  parseWebhook(body: unknown): IncomingMessage | null {
    if (typeof body !== 'object' || body === null) return null;
    const b = body as UltraMsgWebhookBody;

    // Apenas mensagens recebidas
    if (b.event_type !== 'message_received') return null;
    // Ignorar mensagens próprias
    if (b.data?.fromMe === true) return null;
    // Ignorar grupos
    if (typeof b.data?.from === 'string' && b.data.from.includes('@g.us')) return null;

    const instanceId = b.instanceId ?? b.instance_id;
    const messageId  = b.data?.id;
    const rawFrom    = b.data?.from ?? '';
    const from       = rawFrom.replace(/@c\.us$/, '').replace(/\D/g, '');
    const msgBody    = b.data?.body;
    const timestamp  = b.data?.time ?? Math.floor(Date.now() / 1000);

    if (!instanceId || !messageId || !from || !msgBody) return null;

    return { instanceId, messageId, from, body: msgBody, timestamp, raw: body };
  }

  validateSignature(rawBody: Buffer, signature: string, secret: string): boolean {
    const expected   = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const normalized = signature.toLowerCase().replace(/^sha256=/, '');
    if (normalized.length !== expected.length) return false;

    return crypto.timingSafeEqual(
      Buffer.from(normalized),
      Buffer.from(expected),
    );
  }

  async connectInstance(apiKey: string, webhookUrl: string): Promise<string> {
    // Para UltraMsg, apiKey é o token da conta (não da instância)
    const url = new URL(`${ULTRAMSG_BASE_URL}/instance/create`);
    url.searchParams.set('token', apiKey);

    const res = await fetchWithTimeout(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`UltraMsg connectInstance ${res.status}: ${text}`);
    }

    const data = (await res.json()) as UltraMsgConnectResponse;
    // Para UltraMsg, instanceToken === instanceId (chave de lookup)
    return data.id;
  }

  async disconnectInstance(apiKey: string, instanceId: string): Promise<void> {
    // instanceId === instanceToken no UltraMsg
    const url = new URL(`${ULTRAMSG_BASE_URL}/${instanceId}/instance/logout`);
    url.searchParams.set('token', apiKey);

    const res = await fetchWithTimeout(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`UltraMsg disconnectInstance ${res.status}: ${text}`);
    }
  }

  async sendMessage(
    apiKey: string,
    instanceId: string,
    to: string,
    text: string,
  ): Promise<void> {
    const url = `${ULTRAMSG_BASE_URL}/${instanceId}/messages/chat`;

    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: apiKey, to, body: text }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`UltraMsg sendMessage ${res.status}: ${t}`);
    }
  }
}
