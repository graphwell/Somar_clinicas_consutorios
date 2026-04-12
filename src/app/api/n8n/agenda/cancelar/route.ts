import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/n8n/agenda/cancelar
 * Body: { agendamentoId, tenantId, motivo? }
 * Cancela agendamento via bot/n8n.
 */
export async function POST(req: NextRequest) {
  return handleCancelation(req, await getBodyParams(req));
}

export async function PATCH(req: NextRequest) {
  return handleCancelation(req, await getBodyParams(req));
}

async function getBodyParams(req: NextRequest) {
  const url = req.nextUrl;
  let body: any = {};
  if (req.method !== 'GET') {
    try { body = await req.json(); } catch {}
  }
  return {
    agendamentoId: body.agendamentoId || body.id || url.searchParams.get('id'),
    tenantId: body.tenantId || url.searchParams.get('tenantId'),
    motivo: body.motivo || url.searchParams.get('motivo'),
  };
}

async function handleCancelation(req: NextRequest, body: { agendamentoId?: string, tenantId?: string, motivo?: string }) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  if (!body.agendamentoId || !body.tenantId) {
    return n8nError('agendamentoId(id) e tenantId são obrigatórios', 'MISSING_PARAM');
  }

  try {
    const agendamento = await prisma.agendamento.findFirst({
      where: { id: body.agendamentoId, tenantId: body.tenantId },
      select: { id: true, status: true },
    });

    if (!agendamento) {
      return n8nError('Agendamento não encontrado', 'NOT_FOUND', 404);
    }
    if (agendamento.status === 'cancelado') {
      return n8nError('Agendamento já está cancelado', 'ALREADY_CANCELLED', 409);
    }

    const agendamentoCompleto = await prisma.agendamento.findUnique({
      where: { id: agendamento.id },
      include: {
        servico: { select: { nome: true } },
        profissional: { select: { nome: true } },
      },
    });

    await prisma.agendamento.update({
      where: { id: agendamento.id },
      data: {
        status: 'cancelado',
        observacoes: body.motivo ? `Cancelado via bot: ${body.motivo}` : 'Cancelado via bot WhatsApp',
      },
    });

    // Notificação WA em background
    import('@/lib/whatsapp-service')
      .then(({ notificarCancelamento }) => notificarCancelamento(agendamento.id))
      .catch(e => console.error('[WA]', e));

    const msgBot =
      `❌ Agendamento cancelado.\n\n` +
      (agendamentoCompleto?.servico ? `${agendamentoCompleto.servico.nome} ` : '') +
      (agendamentoCompleto?.profissional ? `com ${agendamentoCompleto.profissional.nome} ` : '') +
      `foi cancelado com sucesso.\n\nPara reagendar, é só me avisar! 😊`;

    return n8nSuccess({
      cancelado: true,
      mensagem: 'Agendamento cancelado com sucesso',
      msgBot,
    });
  } catch (err) {
    console.error('[n8n/agenda/cancelar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
