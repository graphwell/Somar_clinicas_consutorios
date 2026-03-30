import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/wasender';

export const DEFAULT_LEMBRETE_TEMPLATE = `Olá, {nome}! 👋

Passando para lembrar do seu agendamento:
📅 *{data}* às *{hora}*
💆 {servico} com {profissional}

Para confirmar sua presença, responda *SIM*.
Para cancelar, responda *NÃO*.

_Equipe {clinica}_`;

export const DEFAULT_ANIVERSARIO_TEMPLATE = `🎂 *Feliz Aniversário, {nome}!*

A equipe {clinica} deseja a você um dia muito especial! 🎉

Como presente, preparamos um desconto exclusivo:
🎁 *{desconto}% OFF* na sua próxima visita!

Este desconto é válido por 30 dias. 💖

Com carinho,
_Equipe {clinica}_ 🌟`;

export const DEFAULT_COMBO_TEMPLATE = `Olá, {nome}! ✨

Temos uma oferta especial para você:

*{combo_nome}*
{combo_descricao}

💰 De ~~R$ {preco_original}~~ por apenas *R$ {preco_combo}*
💡 Economize {desconto}%!

Entre em contato para agendar! 📱

_Equipe {clinica}_`;

/** Normaliza telefone para E.164 (+5511999990000) */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
  if (digits.length >= 10) return `+55${digits}`;
  return phone; // retorna original se não conseguir normalizar
}

/** Substitui variáveis do template */
export function applyTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value ?? ''),
    template
  );
}

/** Busca a instância WhatsApp ativa do tenant */
export async function getTenantWhatsappInstance(tenantId: string) {
  return prisma.whatsappInstance.findFirst({
    where: { empresaId: tenantId, status: { not: 'OFFLINE' } },
    orderBy: { criadoEm: 'desc' },
  });
}

interface SendAndLogParams {
  tenantId: string;
  tipo: string;
  pacienteId?: string;
  pacienteNome: string;
  pacienteTelefone: string;
  mensagem: string;
  campanhaId?: string;
  comboId?: string;
}

/** Envia mensagem WhatsApp e loga o resultado em MarketingEnvio */
export async function sendAndLog(params: SendAndLogParams): Promise<{ success: boolean; msgId?: string; error?: string }> {
  const instance = await getTenantWhatsappInstance(params.tenantId);

  if (!instance) {
    await prisma.marketingEnvio.create({
      data: {
        tenantId: params.tenantId,
        tipo: params.tipo,
        pacienteId: params.pacienteId,
        pacienteNome: params.pacienteNome,
        pacienteTelefone: params.pacienteTelefone,
        mensagem: params.mensagem,
        status: 'erro',
        erroDetalhe: 'Nenhuma instância WhatsApp ativa',
        campanhaId: params.campanhaId,
        comboId: params.comboId,
      },
    });
    return { success: false, error: 'Nenhuma instância WhatsApp ativa' };
  }

  const to = normalizePhone(params.pacienteTelefone);
  const result = await sendWhatsAppMessage(
    instance.plataforma,
    instance.sessionId,
    instance.bearerToken,
    to,
    params.mensagem
  );

  await prisma.marketingEnvio.create({
    data: {
      tenantId: params.tenantId,
      tipo: params.tipo,
      pacienteId: params.pacienteId,
      pacienteNome: params.pacienteNome,
      pacienteTelefone: params.pacienteTelefone,
      mensagem: params.mensagem,
      wasenderMsgId: result.ok ? String((result.data as any)?.data?.msgId ?? '') : undefined,
      status: result.ok ? 'enviado' : 'erro',
      erroDetalhe: result.ok ? undefined : JSON.stringify(result.data),
      campanhaId: params.campanhaId,
      comboId: params.comboId,
    },
  });

  return result.ok
    ? { success: true, msgId: String((result.data as any)?.data?.msgId ?? '') }
    : { success: false, error: JSON.stringify(result.data) };
}
