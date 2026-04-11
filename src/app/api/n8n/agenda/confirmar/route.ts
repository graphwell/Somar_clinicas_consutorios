import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/n8n/agenda/confirmar
 * Body: { telefone, tenantId }
 *
 * Chamado pelo n8n quando o cliente responde SIM no WhatsApp.
 * Confirma o próximo agendamento pendente do cliente.
 */
export async function PATCH(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: { telefone?: string; tenantId?: string };
  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { telefone, tenantId } = body;
  if (!telefone)  return n8nError('telefone é obrigatório', 'MISSING_PARAM');
  if (!tenantId)  return n8nError('tenantId é obrigatório', 'MISSING_PARAM');

  try {
    const telefoneClean = telefone.replace(/\D/g, '');

    const paciente = await prisma.paciente.findFirst({
      where: {
        tenantId,
        OR: [
          { telefone },
          { telefone: telefoneClean },
          { telefone: { endsWith: telefoneClean.slice(-8) } },
        ],
      },
      select: { id: true, nome: true },
    });

    if (!paciente) {
      return n8nError('Cliente não encontrado', 'NOT_FOUND', 404);
    }

    const agendamento = await prisma.agendamento.findFirst({
      where: {
        pacienteId: paciente.id,
        tenantId,
        status:  'pendente',
        dataHora: { gte: new Date() },
      },
      orderBy: { dataHora: 'asc' },
      include: {
        servico:      { select: { nome: true } },
        profissional: { select: { nome: true } },
      },
    });

    if (!agendamento) {
      return n8nSuccess({
        confirmado: false,
        msgBot: 'Não encontrei agendamento pendente para confirmar. Se precisar agendar, é só me avisar! 😊',
      });
    }

    await prisma.agendamento.update({
      where: { id: agendamento.id },
      data: {
        status:      'confirmado',
        confirmedAt: new Date(),
        confirmedBy: 'whatsapp',
      },
    });

    const hora = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(agendamento.dataHora);
    const data = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza', weekday: 'long', day: '2-digit', month: '2-digit',
    }).format(agendamento.dataHora);

    return n8nSuccess({
      confirmado:    true,
      agendamentoId: agendamento.id,
      msgBot:
        `✅ Confirmado! Te esperamos:\n\n` +
        `📋 ${agendamento.servico?.nome ?? 'Consulta'}\n` +
        `📅 ${data} às ${hora}\n` +
        (agendamento.profissional ? `👤 ${agendamento.profissional.nome}\n` : '') +
        `\nAté lá! 😊`,
    });
  } catch (err) {
    console.error('[n8n/agenda/confirmar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
