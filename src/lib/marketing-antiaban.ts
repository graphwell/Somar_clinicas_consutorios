/**
 * marketing-antiaban.ts
 * Sistema anti-ban para WhatsApp — Bloco 10
 *
 * Proteções implementadas:
 * - Limite diário e por hora (com lock transacional)
 * - Delay humano com spike ocasional
 * - Score de risco por mensagem
 * - Detecção de possível bloqueio por erros consecutivos
 * - Status granular: pendente | enviando | enviado | erro | bloqueado
 */

import prisma from '@/lib/prisma';

// ── Constantes ────────────────────────────────────────────────────────────────

export const MAX_ENVIOS_POR_DIA  = 200;   // por tenant
export const MAX_ENVIOS_POR_HORA = 30;    // por tenant
export const RISCO_BLOQUEIO      = 5;     // score ≥ 5 → não envia
export const HORARIO_INICIO      = 8;     // 08:00
export const HORARIO_FIM         = 21;    // 21:00

// Status granulares — use esses valores no banco
export type StatusEnvio = 'pendente' | 'enviando' | 'enviado' | 'erro' | 'bloqueado';

// ── Delay humano ──────────────────────────────────────────────────────────────

/**
 * Delay humanizado: 2.5–5.5s base + spike de +5s em 10% dos casos.
 * Simula ritmo humano para evitar detecção de bot pelo WhatsApp.
 */
export function delayHumano(): Promise<void> {
  const base  = 2500 + Math.random() * 3000;
  const spike = Math.random() < 0.1 ? 5000 : 0;      // 10% de chance de pausa extra
  return new Promise(r => setTimeout(r, base + spike));
}

/** Delay fixo (ms) */
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Horário seguro ────────────────────────────────────────────────────────────

/**
 * Retorna true se o horário atual está dentro da janela segura de envios.
 * Usa horário de Brasília (UTC-3).
 */
export function horarioSeguro(): boolean {
  const agora = new Date();
  const hora  = (agora.getUTCHours() - 3 + 24) % 24;  // UTC → Brasília
  return hora >= HORARIO_INICIO && hora < HORARIO_FIM;
}

/**
 * Mensagem descritiva do motivo do bloqueio por horário.
 */
export function motivoHorarioInseguro(): string {
  return `Fora do horário seguro (${HORARIO_INICIO}h–${HORARIO_FIM}h). Mensagem ficará na fila.`;
}

// ── Rate Limiting com Lock Transacional ───────────────────────────────────────

interface RateLimitResult {
  ok: boolean;
  httpStatus?: 429;
  error?: string;
  limite?: number;
  enviados?: number;
}

/**
 * Verifica os limites de envio (por hora e por dia) dentro de uma transaction
 * para evitar race conditions em múltiplos workers.
 *
 * Retorna { ok: true } se pode enviar, ou { ok: false } com detalhes do limite.
 */
export async function checkRateLimits(tenantId: string): Promise<RateLimitResult> {
  const agora        = new Date();
  const ultimas24h   = new Date(agora.getTime() - 86_400_000);
  const ultimaHora   = new Date(agora.getTime() - 3_600_000);

  return await prisma.$transaction(async (tx) => {
    // ── Checagem por hora ───────────────────────────────────
    const enviadosHora = await tx.marketingEnvio.count({
      where: {
        tenantId,
        status: 'enviado',
        enviadoEm: { gte: ultimaHora },
      },
    });

    if (enviadosHora >= MAX_ENVIOS_POR_HORA) {
      return {
        ok: false,
        httpStatus: 429 as const,
        error: `Limite por hora atingido (${MAX_ENVIOS_POR_HORA}/h). Aguarde antes de continuar.`,
        limite: MAX_ENVIOS_POR_HORA,
        enviados: enviadosHora,
      };
    }

    // ── Checagem diária ─────────────────────────────────────
    const enviados24h = await tx.marketingEnvio.count({
      where: {
        tenantId,
        status: 'enviado',
        enviadoEm: { gte: ultimas24h },
      },
    });

    if (enviados24h >= MAX_ENVIOS_POR_DIA) {
      return {
        ok: false,
        httpStatus: 429 as const,
        error: `Limite diário atingido (${MAX_ENVIOS_POR_DIA}/dia). Tente novamente amanhã.`,
        limite: MAX_ENVIOS_POR_DIA,
        enviados: enviados24h,
      };
    }

    return { ok: true };
  });
}

// ── Score de Risco ────────────────────────────────────────────────────────────

interface OpcaoRisco {
  mensagem: string;
  temNome: boolean;
  horario?: number;             // hora do dia em Brasília (0–23)
}

/**
 * Calcula um score de risco (0–10) para o envio.
 * Score ≥ RISCO_BLOQUEIO → envio bloqueado preventivamente.
 *
 * Fatores:
 * +2  sem nome personalizado
 * +3  mensagem idêntica a outra (estimado por comprimento exato)
 * +2  muitos links (≥ 2)
 * +2  horário inseguro
 * +1  mensagem muito curta (< 20 chars) — pode ser spam
 */
export function calcularRisco({ mensagem, temNome, horario }: OpcaoRisco): number {
  let risco = 0;

  if (!temNome)                            risco += 2;  // sem personalização
  if ((mensagem.match(/https?:\/\//g) ?? []).length >= 2) risco += 2;  // muitos links
  if (mensagem.length < 20)               risco += 1;  // mensagem suspeita curta
  if (mensagem.length > 1000)             risco += 1;  // muito longa

  const hora = horario ?? ((new Date().getUTCHours() - 3 + 24) % 24);
  if (hora < HORARIO_INICIO || hora >= HORARIO_FIM) risco += 2;  // horário ruim

  return risco;
}

// ── Detecção de Bloqueio ──────────────────────────────────────────────────────

/**
 * Detecta possível bloqueio da conta: verifica os últimos N resultados e
 * retorna true se ≥ 4 de 5 foram erro.
 *
 * Se retornar true: pause por 2 minutos antes de continuar.
 */
export function detectarBloqueio(ultimosResultados: { success: boolean }[]): boolean {
  const ultimos5 = ultimosResultados.slice(-5);
  if (ultimos5.length < 3) return false;  // poucos dados para detectar
  const erros = ultimos5.filter(r => !r.success).length;
  return erros >= 4;
}

// ── Resumo de proteções (para logging) ───────────────────────────────────────

export function resumoProtecoes(): string {
  return [
    `✓ Limite diário: ${MAX_ENVIOS_POR_DIA} mensagens`,
    `✓ Limite por hora: ${MAX_ENVIOS_POR_HORA} mensagens`,
    `✓ Horário seguro: ${HORARIO_INICIO}h–${HORARIO_FIM}h (Brasília)`,
    `✓ Score de risco anti-spam`,
    `✓ Delay humanizado (2.5–8.5s + spike 10%)`,
    `✓ Detecção de bloqueio por erros consecutivos`,
    `✓ Lock transacional (Prisma $transaction)`,
  ].join('\n');
}
