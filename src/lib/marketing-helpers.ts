import prisma from '@/lib/prisma';
import { sendWhatsAppMessage, wasenderPost, getWasenderConfig } from '@/lib/wasender';
import { formatarTelefone } from '@/lib/marketing-utils';
import {
  checkRateLimits,
  calcularRisco,
  horarioSeguro,
  motivoHorarioInseguro,
  RISCO_BLOQUEIO,
} from '@/lib/marketing-antiaban';

/** Busca a instância WhatsApp ativa do tenant */
export async function getTenantWhatsappInstance(tenantId: string) {
  return prisma.whatsappInstance.findFirst({
    where: { empresaId: tenantId, status: { not: 'OFFLINE' } },
    orderBy: { criadoEm: 'desc' },
  });
}

interface SendAndLogParams {
  tenantId: string;
  tipo: string;           // lembrete | aniversario | combo | campanha
  clienteNome?: string;
  clienteTelefone: string;
  mensagemEnviada: string;
  comboId?: string;
  /** Se true, pula a verificação de horário seguro (para testes manuais) */
  forcarHorario?: boolean;
  /** Se true, pula score de risco (para envios explicitamente aprovados) */
  ignorarRisco?: boolean;
}

/**
 * Envia mensagem WhatsApp com proteções anti-ban e loga o resultado.
 *
 * Proteções aplicadas (em ordem):
 *  1. Verificação de horário seguro (08h–21h Brasília)
 *  2. Score de risco anti-spam
 *  3. Rate limiting diário e por hora (com lock transacional)
 *  4. Hierarquia de instâncias: WhatsApp Instance → API Key própria → Demo
 */
export async function sendAndLog(params: SendAndLogParams): Promise<{
  success: boolean;
  msgId?: string;
  error?: string;
  bloqueado?: boolean;
  motivo?: string;
}> {
  const to = formatarTelefone(params.clienteTelefone);

  // ── Guard 1: Horário seguro ───────────────────────────────────────────────
  if (!params.forcarHorario && !horarioSeguro()) {
    await prisma.marketingEnvio.create({
      data: {
        tenantId: params.tenantId,
        tipo: params.tipo,
        clienteNome: params.clienteNome,
        clienteTelefone: params.clienteTelefone,
        mensagemEnviada: params.mensagemEnviada,
        status: 'pendente',
        erroDetalhe: motivoHorarioInseguro(),
        comboId: params.comboId,
      },
    });
    return { success: false, bloqueado: true, motivo: motivoHorarioInseguro() };
  }

  // ── Guard 2: Score de risco ───────────────────────────────────────────────
  if (!params.ignorarRisco) {
    const risco = calcularRisco({
      mensagem: params.mensagemEnviada,
      temNome: !!params.clienteNome,
    });

    if (risco >= RISCO_BLOQUEIO) {
      await prisma.marketingEnvio.create({
        data: {
          tenantId: params.tenantId,
          tipo: params.tipo,
          clienteNome: params.clienteNome,
          clienteTelefone: params.clienteTelefone,
          mensagemEnviada: params.mensagemEnviada,
          status: 'bloqueado',
          erroDetalhe: `Score de risco ${risco}/${RISCO_BLOQUEIO} — envio bloqueado preventivamente`,
          comboId: params.comboId,
        },
      });
      return { success: false, bloqueado: true, motivo: `Risco anti-spam: score ${risco}` };
    }
  }

  // ── Guard 3: Rate limits (com lock transacional) ──────────────────────────
  const rateCheck = await checkRateLimits(params.tenantId);
  if (!rateCheck.ok) {
    await prisma.marketingEnvio.create({
      data: {
        tenantId: params.tenantId,
        tipo: params.tipo,
        clienteNome: params.clienteNome,
        clienteTelefone: params.clienteTelefone,
        mensagemEnviada: params.mensagemEnviada,
        status: 'bloqueado',
        erroDetalhe: rateCheck.error,
        comboId: params.comboId,
      },
    });
    return { success: false, bloqueado: true, motivo: rateCheck.error };
  }

  // ── Nível 1: Instância WhatsApp vinculada ao tenant ───────────────────────
  const instance = await getTenantWhatsappInstance(params.tenantId);

  // ── Nível 2/3: API Key própria ou demo ────────────────────────────────────
  const mc = !instance
    ? await prisma.marketingConfig.findUnique({ where: { tenantId: params.tenantId } })
    : null;

  const wasenderCfg = !instance ? getWasenderConfig(mc?.wasenderApiKey) : null;

  if (!instance && !wasenderCfg?.apiKey) {
    await prisma.marketingEnvio.create({
      data: {
        tenantId: params.tenantId,
        tipo: params.tipo,
        clienteNome: params.clienteNome,
        clienteTelefone: params.clienteTelefone,
        mensagemEnviada: params.mensagemEnviada,
        status: 'erro',
        erroDetalhe: 'Nenhuma instância WhatsApp configurada (nem demo)',
        comboId: params.comboId,
      },
    });
    return { success: false, error: 'Nenhuma instância WhatsApp configurada' };
  }

  // ── Envio ─────────────────────────────────────────────────────────────────
  let result: { ok: boolean; data: any };

  if (instance) {
    result = await sendWhatsAppMessage(
      instance.plataforma,
      instance.sessionId,
      instance.bearerToken,
      to,
      params.mensagemEnviada
    );
  } else {
    result = await wasenderPost(wasenderCfg!.apiKey, '/messages/send', { to, message: params.mensagemEnviada });
  }

  const msgId = result.ok ? String((result.data as any)?.data?.msgId ?? '') : undefined;
  const usandoDemo = !instance && (wasenderCfg?.isDemo ?? false);

  await prisma.marketingEnvio.create({
    data: {
      tenantId: params.tenantId,
      tipo: params.tipo,
      clienteNome: params.clienteNome,
      clienteTelefone: params.clienteTelefone,
      mensagemEnviada: params.mensagemEnviada,
      wasenderMsgId: msgId,
      status: result.ok ? 'enviado' : 'erro',
      erroDetalhe: result.ok
        ? (usandoDemo ? '[via instância demo]' : undefined)
        : JSON.stringify(result.data),
      comboId: params.comboId,
    },
  });

  return result.ok
    ? { success: true, msgId }
    : { success: false, error: JSON.stringify(result.data) };
}
