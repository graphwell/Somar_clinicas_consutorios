import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function toHHMM(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

/**
 * POST /api/fila-espera/verificar-e-notificar
 * Chamado internamente quando um agendamento é cancelado ou slot abre.
 * Sem autenticação por ser rota interna (server-to-server).
 */
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'corpo inválido' }, { status: 400 });
  }

  const { tenantId, profissionalId, servicoId, dataHora } = body;
  if (!tenantId || !servicoId || !dataHora) {
    return Response.json({ notificado: false, erro: 'parametros insuficientes' });
  }

  try {
    const horario = toHHMM(new Date(dataHora));
    const dataDesejada = new Date(dataHora);
    dataDesejada.setUTCHours(0, 0, 0, 0);

    // Buscar próximo da fila com match por profissional E horário
    const proximo = await prisma.filaEspera.findFirst({
      where: {
        tenantId,
        servicoId,
        dataDesejada,
        status: 'aguardando',
        AND: [
          {
            OR: [
              ...(profissionalId ? [{ profissionalId }] : []),
              { profissionalId: null },
            ],
          },
          {
            OR: [
              { horarioDesejado: horario },
              { horarioDesejado: null },
            ],
          },
        ],
      },
      orderBy: [
        { prioridade: 'desc' },
        { posicao: 'asc' },
      ],
      include: {
        paciente:     { select: { nome: true, telefone: true } },
        profissional: { select: { nome: true } },
        servico:      { select: { nome: true } },
      },
    });

    if (!proximo) return Response.json({ notificado: false });

    const expira = new Date(Date.now() + 30 * 60000);

    await prisma.filaEspera.update({
      where: { id: proximo.id },
      data: {
        status: 'notificado',
        notificadoEm: new Date(),
        expirarNotifEm: expira,
      },
    });

    const dataFmt = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza',
      weekday: 'long', day: '2-digit', month: '2-digit',
    }).format(new Date(dataHora));

    const nome = proximo.paciente.nome.split(' ')[0];
    const mensagem =
      `${nome}, abriu um horario!\n\n` +
      `${proximo.servico.nome}\n` +
      `${dataFmt} as ${horario}\n` +
      `${proximo.profissional?.nome ?? 'Qualquer profissional'}\n\n` +
      `Para CONFIRMAR responda: CONFIRMAR\n` +
      `Voce tem 30 minutos para responder.\n` +
      `Apos isso o horario vai para o proximo da fila.`;

    // Enviar WhatsApp em background
    import('@/lib/whatsapp-service')
      .then(async (mod: any) => {
        if (mod.enviarMensagem) {
          await mod.enviarMensagem(proximo.paciente.telefone, mensagem, tenantId, 'fila_espera_notificacao');
        } else if (mod.notificarNovoAgendamento) {
          // fallback: logar apenas
          console.log('[fila-espera] WA para:', proximo.paciente.telefone, mensagem);
        }
      })
      .catch(e => console.error('[fila-espera WA]', e));

    return Response.json({ notificado: true, filaId: proximo.id });
  } catch (err) {
    console.error('[fila-espera/verificar-e-notificar]', err);
    return Response.json({ notificado: false, erro: 'erro interno' }, { status: 500 });
  }
}
