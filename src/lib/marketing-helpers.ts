import prisma from '@/lib/prisma';
import { sendWhatsAppMessage, wasenderPost, getWasenderConfig } from '@/lib/wasender';
import { formatarTelefone } from '@/lib/marketing-utils';

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
}

/**
 * Envia mensagem WhatsApp e loga o resultado em MarketingEnvio.
 *
 * Hierarquia de instâncias:
 *  1. WhatsappInstance ativa do tenant (via plataforma configurada)
 *  2. wasenderApiKey do MarketingConfig (API Key própria da clínica)
 *  3. Fallback → instância demo (WASENDER_DEMO_API_KEY)
 */
export async function sendAndLog(params: SendAndLogParams): Promise<{ success: boolean; msgId?: string; error?: string }> {
  const to = formatarTelefone(params.clienteTelefone);

  // ── Nível 1: Instância WhatsApp vinculada ao tenant ──────────────────────
  const instance = await getTenantWhatsappInstance(params.tenantId);

  // ── Nível 2/3: API Key própria ou demo ───────────────────────────────────
  const mc = !instance
    ? await prisma.marketingConfig.findUnique({ where: { tenantId: params.tenantId } })
    : null;

  const wasenderCfg = !instance ? getWasenderConfig(mc?.wasenderApiKey) : null;

  // Se demo não tem chave e não tem instância → erro
  if (!instance && !wasenderCfg?.apiKey) {
    await prisma.marketingEnvio.create({
      data: {
        tenantId: params.tenantId,
        tipo: params.tipo,
        clienteNome: params.clienteNome,
        clienteTelefone: params.clienteTelefone,
        mensagemEnviada: params.mensagemEnviada,
        status: 'erro',
        erroDetalhe: 'Nenhuma instância WhatsApp ativa e sem API key configurada (nem demo)',
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
