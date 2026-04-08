/**
 * Camada base de comunicação HTTP para provedores WhatsApp.
 * Centraliza as chamadas de rede para evitar dependências circulares.
 */

const WASENDER_BASE = process.env.WASENDER_BASE_URL || 'https://wasenderapi.com/api';
const ULTRAMSG_BASE = 'https://api.ultramsg.com';

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

export async function ultraMsgPost(instanceId: string, token: string, endpoint: string, body: object) {
  const res = await fetch(`${ULTRAMSG_BASE}/${instanceId}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ 
      token, 
      ...Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])) 
    }).toString(),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function ultraMsgGet(instanceId: string, token: string, endpoint: string) {
  const res = await fetch(`${ULTRAMSG_BASE}/${instanceId}/${endpoint}?token=${token}`, {
    cache: 'no-store',
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}
