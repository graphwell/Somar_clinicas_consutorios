import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/fila-expirar
 * Expira notificações de fila sem resposta após 30 min e aciona o próximo.
 * Chamado pelo Vercel Cron a cada 5 min.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const expiradas = await prisma.filaEspera.findMany({
      where: {
        status: 'notificado',
        expirarNotifEm: { lte: new Date() },
      },
    });

    for (const fila of expiradas) {
      await prisma.filaEspera.update({
        where: { id: fila.id },
        data: { status: 'expirado' },
      });

      // Acionar próximo
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/fila-espera/verificar-e-notificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: fila.tenantId,
          profissionalId: fila.profissionalId,
          servicoId: fila.servicoId,
          dataHora: fila.dataDesejada.toISOString(),
        }),
      }).catch(e => console.error('[cron fila]', e));
    }

    return Response.json({ expiradas: expiradas.length });
  } catch (err) {
    console.error('[cron/fila-expirar]', err);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
