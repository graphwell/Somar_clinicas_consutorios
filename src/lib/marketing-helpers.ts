import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/wasender';
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
 * Usa a instância WhatsApp associada ao tenant (WhatsappInstance).
 * Se não houver instância ativa, tenta usar wasenderApiKey do MarketingConfig.
 */
export async function sendAndLog(params: SendAndLogParams): Promise<{ success: boolean; msgId?: string; error?: string }> {
  const to = formatarTelefone(params.clienteTelefone);

  // Busca instância WhatsApp padrão do tenant
  let instance = await getTenantWhatsappInstance(params.tenantId);

  // Fallback: usa wasenderApiKey do MarketingConfig se não há instância
  let useDirectKey = false;
  let directApiKey: string | null = null;
  if (!instance) {
    const mc = await prisma.marketingConfig.findUnique({ where: { tenantId: params.tenantId } });
    if (mc?.wasenderApiKey) {
      useDirectKey = true;
      directApiKey = mc.wasenderApiKey;
    }
  }

  if (!instance && !useDirectKey) {
    await prisma.marketingEnvio.create({
      data: {
        tenantId: params.tenantId,
        tipo: params.tipo,
        clienteNome: params.clienteNome,
        clienteTelefone: params.clienteTelefone,
        mensagemEnviada: params.mensagemEnviada,
        status: 'erro',
        erroDetalhe: 'Nenhuma instância WhatsApp ativa e sem API key configurada',
        comboId: params.comboId,
      },
    });
    return { success: false, error: 'Nenhuma instância WhatsApp ativa' };
  }

  let result: { ok: boolean; data: any };
  if (useDirectKey && directApiKey) {
    const { wasenderPost } = await import('@/lib/wasender');
    result = await wasenderPost(directApiKey, '/messages/send', { to, message: params.mensagemEnviada });
  } else {
    result = await sendWhatsAppMessage(
      instance!.plataforma,
      instance!.sessionId,
      instance!.bearerToken,
      to,
      params.mensagemEnviada
    );
  }

  const msgId = result.ok ? String((result.data as any)?.data?.msgId ?? '') : undefined;

  await prisma.marketingEnvio.create({
    data: {
      tenantId: params.tenantId,
      tipo: params.tipo,
      clienteNome: params.clienteNome,
      clienteTelefone: params.clienteTelefone,
      mensagemEnviada: params.mensagemEnviada,
      wasenderMsgId: msgId,
      status: result.ok ? 'enviado' : 'erro',
      erroDetalhe: result.ok ? undefined : JSON.stringify(result.data),
      comboId: params.comboId,
    },
  });

  return result.ok
    ? { success: true, msgId }
    : { success: false, error: JSON.stringify(result.data) };
}
