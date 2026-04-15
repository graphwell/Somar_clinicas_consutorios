import prisma from '@/lib/prisma';
import { autenticarApiKey } from '@/lib/n8n-auth';
import { n8nSuccess, n8nError } from '@/lib/n8n-response';

export const dynamic = 'force-dynamic';

function toHHMM(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

/**
 * POST /api/fila-espera/confirmar
 * Chamado pelo n8n quando cliente responde CONFIRMAR via WhatsApp.
 */
export async function POST(request: Request) {
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
    // Buscar paciente pelo telefone
    const paciente = await prisma.paciente.findFirst({
      where: {
        tenantId,
        telefone: { contains: telefone.slice(-8) },
      },
    });

    if (!paciente) {
      return n8nSuccess({
        confirmado: false,
        msgBot: 'Nao encontrei seu cadastro. Entre em contato com a recepção.',
      });
    }

    // Buscar notificação pendente dentro do prazo
    const fila = await prisma.filaEspera.findFirst({
      where: {
        tenantId,
        pacienteId: paciente.id,
        status: 'notificado',
        expirarNotifEm: { gte: new Date() },
      },
      include: {
        profissional: true,
        servico: true,
      },
    });

    if (!fila) {
      return n8nSuccess({
        confirmado: false,
        msgBot:
          'Nao encontrei notificacao pendente ou o tempo de 30 minutos expirou.\n' +
          'Gostaria de entrar em uma nova fila?',
      });
    }

    // Verificar race condition: slot ainda está livre?
    if (fila.profissionalId) {
      const conflito = await prisma.agendamento.findFirst({
        where: {
          tenantId,
          profissionalId: fila.profissionalId,
          dataHora: fila.dataDesejada,
          status: { notIn: ['cancelado'] },
        },
      });

      if (conflito) {
        await prisma.filaEspera.update({
          where: { id: fila.id },
          data: { status: 'expirado' },
        });

        // Acionar próximo da fila em background
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/fila-espera/verificar-e-notificar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            profissionalId: fila.profissionalId,
            servicoId: fila.servicoId,
            dataHora: fila.dataDesejada.toISOString(),
          }),
        }).catch(e => console.error('[fila confirmar next]', e));

        return n8nSuccess({
          confirmado: false,
          msgBot:
            'Infelizmente o horario foi preenchido por outro cliente agora.\n' +
            'Vou verificar o proximo horario disponivel!',
        });
      }
    }

    // Criar agendamento
    const eventoId = `fila-${fila.id}-${Date.now()}`;
    const agendamento = await prisma.agendamento.create({
      data: {
        tenantId,
        pacienteId: paciente.id,
        profissionalId: fila.profissionalId ?? undefined,
        servicoId: fila.servicoId,
        dataHora: fila.dataDesejada,
        fimDataHora: new Date(fila.dataDesejada.getTime() + (fila.servico.duracaoMinutos ?? 30) * 60000),
        durationMinutes: fila.servico.duracaoMinutos ?? 30,
        eventoId,
        status: 'confirmado',
        origemAgendamento: 'fila_espera',
      },
    });

    await prisma.filaEspera.update({
      where: { id: fila.id },
      data: { status: 'convertido' },
    });

    const horario = toHHMM(fila.dataDesejada);
    const protocolo = agendamento.id.slice(-8).toUpperCase();

    return n8nSuccess({
      confirmado: true,
      agendamentoId: agendamento.id,
      msgBot:
        `Agendamento confirmado!\n\n` +
        `Protocolo: #${protocolo}\n` +
        `${fila.servico.nome}\n` +
        `${horario}\n\n` +
        `Te esperamos!`,
    });
  } catch (err) {
    console.error('[fila-espera/confirmar]', err);
    return n8nError('Erro interno', 'INTERNAL_ERROR', 500);
  }
}
