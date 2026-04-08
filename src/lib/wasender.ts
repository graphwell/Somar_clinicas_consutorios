import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { wasenderGet, wasenderPost, wasenderDelete, ultraMsgPost, ultraMsgGet } from './whatsapp-api';

export { wasenderGet, wasenderPost, wasenderDelete, ultraMsgPost, ultraMsgGet };

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
 */
export function getWasenderConfig(clinicaApiKey?: string | null): WasenderConfig {
  const ultraInstanceId = process.env.ULTRAMSG_INSTANCE_ID ?? '';
  const ultraToken = process.env.ULTRAMSG_TOKEN ?? '';
  const demoKey = process.env.WASENDER_DEMO_API_KEY ?? '';

  const ultraMsgDisponivel = !!(ultraInstanceId && ultraToken);
  const centralUltraMsg = ultraMsgDisponivel
    ? { instanceId: ultraInstanceId, token: ultraToken }
    : undefined;

  if (process.env.MARKETING_DEMO_MODE === 'true') {
    return ultraMsgDisponivel
      ? { apiKey: '', isDemo: true, ultraMsg: centralUltraMsg }
      : { apiKey: demoKey, isDemo: true };
  }

  if (clinicaApiKey) {
    return { apiKey: clinicaApiKey, isDemo: false };
  }

  return ultraMsgDisponivel
    ? { apiKey: '', isDemo: true, ultraMsg: centralUltraMsg }
    : { apiKey: demoKey, isDemo: true };
}

/** Retorna true se a clínica tem API Key própria configurada (não demo) */
export function clinicaTemInstanciaPropria(clinicaApiKey?: string | null): boolean {
  if (process.env.MARKETING_DEMO_MODE === 'true') return false;
  return !!clinicaApiKey;
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
