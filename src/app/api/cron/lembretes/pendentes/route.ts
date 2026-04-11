import prisma from '@/lib/prisma';
import { autenticarApiKey } from '@/lib/n8n-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/lembretes/pendentes
 * Chamado pelo subfluxo n8n para buscar agendamentos a lembrar.
 * Retorna lista flat — cada item vira uma execução no SplitInBatches.
 */
export async function GET(request: Request) {
  if (!autenticarApiKey(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Amanhã 00:00–23:59 Fortaleza (UTC-3)
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setUTCHours(3, 0, 0, 0);
  const amanhaFim = new Date(amanha);
  amanhaFim.setUTCHours(26, 59, 59, 999);

  try {
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        dataHora:        { gte: amanha, lte: amanhaFim },
        status:          'pendente',
        lembreteEnviado: false,
      },
      include: {
        paciente:     { select: { nome: true, telefone: true } },
        servico:      { select: { nome: true } },
        profissional: { select: { nome: true } },
        clinica:      { select: { nome: true } },
      },
    });

    const lista = agendamentos.map(ag => ({
      id:       ag.id,
      tenantId: ag.tenantId,
      horario:  new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(ag.dataHora),
      paciente:     ag.paciente,
      servico:      ag.servico,
      profissional: ag.profissional,
      clinica:      ag.clinica?.nome ?? '',
    }));

    return Response.json(lista);
  } catch (err) {
    console.error('[cron/lembretes/pendentes]', err);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
