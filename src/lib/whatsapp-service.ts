/**
 * whatsapp-service.ts
 * Notificações transacionais via WhatsApp.
 * Usa sendAndLog de marketing-helpers (anti-ban, rate limit, log).
 */
import prisma from '@/lib/prisma';
import { sendAndLog } from '@/lib/marketing-helpers';
import { TPL, formatarDataBR, formatarHoraBR } from '@/lib/whatsapp-templates';

// ─── Confirmação imediata após novo agendamento ───────────────────────────────

export async function notificarNovoAgendamento(agId: string): Promise<void> {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { id: agId },
      include: {
        paciente:     { select: { nome: true, telefone: true } },
        servico:      { select: { nome: true } },
        profissional: { select: { nome: true } },
        clinica:      { select: { nome: true } },
      },
    });
    if (!ag || !ag.paciente.telefone) return;

    const mc = await prisma.marketingConfig.findUnique({
      where: { tenantId: ag.tenantId },
    });
    if (mc && mc.confirmacaoAtivo === false) return;

    const mensagem = mc?.confirmacaoTemplate ?? TPL.confirmacaoImediata({
      nome:        ag.paciente.nome.split(' ')[0],
      servico:     ag.servico?.nome ?? 'Consulta',
      data:        formatarDataBR(ag.dataHora),
      hora:        formatarHoraBR(ag.dataHora),
      profissional: ag.profissional?.nome ?? '',
      clinica:     ag.clinica?.nome ?? '',
      protocolo:   ag.id.slice(-8).toUpperCase(),
    });

    await sendAndLog({
      tenantId:        ag.tenantId,
      tipo:            'confirmacao_agendamento',
      clienteNome:     ag.paciente.nome,
      clienteTelefone: ag.paciente.telefone,
      mensagemEnviada: mensagem,
      forcarHorario:   true,   // confirmação imediata, sempre envia
      ignorarRisco:    true,   // mensagem transacional, não é spam
    });
  } catch (e) {
    console.error('[notificarNovoAgendamento]', e);
  }
}

// ─── Notificação de cancelamento ──────────────────────────────────────────────

export async function notificarCancelamento(agId: string): Promise<void> {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { id: agId },
      include: {
        paciente: { select: { nome: true, telefone: true } },
        servico:  { select: { nome: true } },
        clinica:  { select: { nome: true } },
      },
    });
    if (!ag || !ag.paciente.telefone) return;

    const mc = await prisma.marketingConfig.findUnique({
      where: { tenantId: ag.tenantId },
    });
    if (mc && mc.cancelamentoAtivo === false) return;

    const mensagem = mc?.cancelamentoTemplate ?? TPL.cancelamento({
      nome:    ag.paciente.nome.split(' ')[0],
      servico: ag.servico?.nome ?? 'Consulta',
      data:    formatarDataBR(ag.dataHora),
      hora:    formatarHoraBR(ag.dataHora),
      clinica: ag.clinica?.nome ?? '',
    });

    await sendAndLog({
      tenantId:        ag.tenantId,
      tipo:            'cancelamento',
      clienteNome:     ag.paciente.nome,
      clienteTelefone: ag.paciente.telefone,
      mensagemEnviada: mensagem,
      forcarHorario:   true,
      ignorarRisco:    true,
    });
  } catch (e) {
    console.error('[notificarCancelamento]', e);
  }
}

// ─── Notificação de remarcação ────────────────────────────────────────────────

export async function notificarRemarcacao(
  agId: string,
  dataHoraAntiga: Date,
): Promise<void> {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { id: agId },
      include: {
        paciente: { select: { nome: true, telefone: true } },
        servico:  { select: { nome: true } },
        clinica:  { select: { nome: true } },
      },
    });
    if (!ag || !ag.paciente.telefone) return;

    const mc = await prisma.marketingConfig.findUnique({
      where: { tenantId: ag.tenantId },
    });
    if (mc && mc.remarcacaoAtivo === false) return;

    const mensagem = mc?.remarcacaoTemplate ?? TPL.remarcacao({
      nome:       ag.paciente.nome.split(' ')[0],
      servico:    ag.servico?.nome ?? 'Consulta',
      dataAntiga: formatarDataBR(dataHoraAntiga),
      horaAntiga: formatarHoraBR(dataHoraAntiga),
      dataNova:   formatarDataBR(ag.dataHora),
      horaNova:   formatarHoraBR(ag.dataHora),
      clinica:    ag.clinica?.nome ?? '',
    });

    await sendAndLog({
      tenantId:        ag.tenantId,
      tipo:            'remarcacao',
      clienteNome:     ag.paciente.nome,
      clienteTelefone: ag.paciente.telefone,
      mensagemEnviada: mensagem,
      forcarHorario:   true,
      ignorarRisco:    true,
    });
  } catch (e) {
    console.error('[notificarRemarcacao]', e);
  }
}
