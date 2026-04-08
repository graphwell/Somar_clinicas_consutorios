import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

const WASENDER_BASE = process.env.WASENDER_BASE_URL || 'https://wasenderapi.com/api';

// ── Seleção de Instância ───────────────────────────────────────────────────────

export interface WasenderConfig {
  apiKey: string;
  /** true quando está usando a instância central/demo compartilhada */
  isDemo: boolean;
  /** Presente quando o fallback central é UltraMsg (substitui WASENDER_DEMO_API_KEY) */
  ultraMsg?: { instanceId: string; token: string };
}

/**
 * Determina qual provedor WhatsApp usar.
 *
 * Prioridade:
 * 1. MARKETING_DEMO_MODE=true → UltraMsg central se configurado, senão WaSender demo
 * 2. clinicaApiKey fornecida  → WaSender com API Key própria da clínica
 * 3. Fallback                 → UltraMsg central (ULTRAMSG_INSTANCE_ID + ULTRAMSG_TOKEN)
 *                               ou WaSender demo (WASENDER_DEMO_API_KEY) se UltraMsg ausente
 */
export function getWasenderConfig(clinicaApiKey?: string | null): WasenderConfig {
  const ultraInstanceId = process.env.ULTRAMSG_INSTANCE_ID ?? '';
  const ultraToken = process.env.ULTRAMSG_TOKEN ?? '';
  const demoKey = process.env.WASENDER_DEMO_API_KEY ?? '';

  const ultraMsgDisponivel = !!(ultraInstanceId && ultraToken);
  const centralUltraMsg = ultraMsgDisponivel
    ? { instanceId: ultraInstanceId, token: ultraToken }
    : undefined;

  // Modo demo forçado (env)
  if (process.env.MARKETING_DEMO_MODE === 'true') {
    return ultraMsgDisponivel
      ? { apiKey: '', isDemo: true, ultraMsg: centralUltraMsg }
      : { apiKey: demoKey, isDemo: true };
  }

  // Clínica tem API Key própria WaSender
  if (clinicaApiKey) {
    return { apiKey: clinicaApiKey, isDemo: false };
  }

  // Fallback: UltraMsg central (preferido) ou WaSender demo
  return ultraMsgDisponivel
    ? { apiKey: '', isDemo: true, ultraMsg: centralUltraMsg }
    : { apiKey: demoKey, isDemo: true };
}

/** Retorna true se a clínica tem API Key própria configurada (não demo) */
export function clinicaTemInstanciaPropria(clinicaApiKey?: string | null): boolean {
  if (process.env.MARKETING_DEMO_MODE === 'true') return false;
  return !!clinicaApiKey;
}



export async function wasenderGet(bearerToken: string, path: string) {
  const res = await fetch(`${WASENDER_BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function wasenderPost(bearerToken: string, path: string, body?: object) {
  const res = await fetch(`${WASENDER_BASE}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function wasenderDelete(bearerToken: string, path: string) {
  const res = await fetch(`${WASENDER_BASE}${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${bearerToken}` },
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

// ── UltraMsg ──────────────────────────────────────────────────────────────────
// sessionId = instanceId do UltraMsg | bearerToken = token da instância

const ULTRAMSG_BASE = 'https://api.ultramsg.com';

export async function ultraMsgPost(instanceId: string, token: string, endpoint: string, body: object) {
  const res = await fetch(`${ULTRAMSG_BASE}/${instanceId}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token, ...Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])) }).toString(),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function ultraMsgGet(instanceId: string, token: string, endpoint: string) {
  const res = await fetch(`${ULTRAMSG_BASE}/${instanceId}/${endpoint}?token=${token}`, {
    cache: 'no-store',
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

/** Envia mensagem usando a plataforma correta (WasenderAPI ou UltraMsg). */
export async function sendWhatsAppMessage(
  plataforma: string,
  sessionId: string,
  bearerToken: string,
  to: string,
  message: string
) {
  if (plataforma === 'ULTRAMSG') {
    return ultraMsgPost(sessionId, bearerToken, 'messages/chat', { to, body: message });
  }
  return wasenderPost(bearerToken, '/messages/send', { to, message });
}

/** Verifica JWT e exige role synka_admin. Retorna payload ou null. */
export async function requireSynkaAdmin(request: Request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;

  // Role no token (cacheado)
  if (payload.role === 'synka_admin') return payload;

  // Fallback para o Banco (permite promoção em tempo real sem logout)
  const user = await prisma.usuario.findUnique({
    where: { id: payload.userId },
    select: { role: true }
  });

  if (user?.role === 'synka_admin') {
    return { ...payload, role: 'synka_admin' };
  }

  return null;
}

/** Verifica JWT de empresa autenticada. Retorna payload (com tenantId) ou null. */
export async function requireTenant(request: Request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.tenantId) return null;
  return payload;
}

/** Campos públicos de uma WhatsappInstance — nunca inclui bearerToken */
export const INSTANCE_SELECT = {
  id: true,
  sessionId: true,
  numeroWa: true,
  status: true,
  plataforma: true,
  empresaId: true,
  webhookUrl: true,
  observacoes: true,
  criadoEm: true,
  conectadoEm: true,
  ultimoPing: true,
  empresa: { select: { nome: true, tenantId: true } },
} as const;
