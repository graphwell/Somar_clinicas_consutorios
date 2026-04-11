import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { autenticarApiKey, UNAUTHORIZED } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/n8n/agenda/marcar-lembrete
 * Body: { agendamentoId, tenantId }
 *
 * Marca lembreteEnviado = true após o subfluxo n8n enviar a mensagem.
 */
export async function PATCH(req: NextRequest) {
  if (!autenticarApiKey(req)) return UNAUTHORIZED();

  let body: { agendamentoId?: string; tenantId?: string };
  try {
    body = await req.json();
  } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { agendamentoId, tenantId } = body;
  if (!agendamentoId || !tenantId)
    return n8nError('agendamentoId e tenantId são obrigatórios', 'MISSING_PARAM', 400);

  try {
    await prisma.agendamento.updateMany({
      where: { id: agendamentoId, tenantId },
      data:  { lembreteEnviado: true },
    });

    return n8nSuccess({ marcado: true, agendamentoId });
  } catch (err) {
    console.error('[n8n/agenda/marcar-lembrete]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
