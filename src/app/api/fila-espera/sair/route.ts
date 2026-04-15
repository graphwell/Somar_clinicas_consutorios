import prisma from '@/lib/prisma';
import { autenticarApiKey } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/fila-espera/sair
 * Chamado pelo n8n quando cliente responde SAIR DA FILA.
 */
export async function PATCH(request: Request) {
  if (!autenticarApiKey(request)) {
    return n8nError('Não autorizado', 'UNAUTHORIZED', 401);
  }

  let body: any;
  try { body = await request.json(); } catch {
    return n8nError('Corpo JSON inválido', 'INVALID_BODY');
  }

  const { telefone, tenantId } = body;
  if (!telefone || !tenantId) {
    return n8nError('telefone e tenantId são obrigatórios', 'MISSING_PARAM');
  }

  try {
    const paciente = await prisma.paciente.findFirst({
      where: {
        tenantId,
        telefone: { contains: telefone.slice(-8) },
      },
    });

    if (!paciente) {
      return n8nSuccess({
        saiu: false,
        msgBot: 'Nao encontrei seu cadastro na fila.',
      });
    }

    const { count } = await prisma.filaEspera.updateMany({
      where: {
        tenantId,
        pacienteId: paciente.id,
        status: { in: ['aguardando', 'notificado'] },
      },
      data: { status: 'cancelado' },
    });

    return n8nSuccess({
      saiu: true,
      removidos: count,
      msgBot: count > 0
        ? 'Voce saiu da fila de espera. Quando quiser reagendar, e so me chamar!'
        : 'Voce nao estava em nenhuma fila de espera.',
    });
  } catch (err) {
    console.error('[fila-espera/sair]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
