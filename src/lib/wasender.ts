import { verifyToken } from '@/lib/auth';

const WASENDER_BASE = process.env.WASENDER_BASE_URL || 'https://wasenderapi.com/api';

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
  if (!payload || payload.role !== 'synka_admin') return null;
  return payload;
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
