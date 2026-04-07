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
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: { agendamentoId?: string; tenantId?: string; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  if (!body.agendamentoId || !body.tenantId) {
    return n8nError('agendamentoId e tenantId são obrigatórios', 'MISSING_PARAM');
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

    await prisma.agendamento.update({
      where: { id: agendamento.id },
      data: {
        status: 'cancelado',
        observacoes: body.motivo ? `Cancelado via bot: ${body.motivo}` : 'Cancelado via bot WhatsApp',
      },
    });

    return n8nSuccess({
      cancelado: true,
      mensagem: 'Agendamento cancelado com sucesso',
    });
  } catch (err) {
    console.error('[n8n/agenda/cancelar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
