import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const perPage = 20;
    const filtroTipo = searchParams.get('tipo') ?? undefined;
    const filtroStatus = searchParams.get('status') ?? undefined;

    const where: any = { tenantId };
    if (filtroTipo) where.tipo = filtroTipo;
    if (filtroStatus) where.status = filtroStatus;

    const [enviosPorTipo, totalCampanhas, envios, totalCount] = await Promise.all([
      prisma.marketingEnvio.groupBy({
        by: ['tipo', 'status'],
        where: { tenantId },
        _count: true,
      }),
      prisma.marketingCampanha.aggregate({
        where: { tenantId, status: 'concluida' },
        _sum: { totalEnviados: true },
        _count: true,
      }),
      prisma.marketingEnvio.findMany({
        where,
        orderBy: { enviadoEm: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true, tipo: true, clienteNome: true, clienteTelefone: true,
          mensagemEnviada: true, status: true, erroDetalhe: true, enviadoEm: true,
        },
      }),
      prisma.marketingEnvio.count({ where }),
    ]);

    const summary: Record<string, { enviado: number; erro: number }> = {};
    for (const row of enviosPorTipo) {
      if (!summary[row.tipo]) summary[row.tipo] = { enviado: 0, erro: 0 };
      if (row.status === 'enviado') summary[row.tipo].enviado += row._count;
      else summary[row.tipo].erro += row._count;
    }

    const totalEnviados = Object.values(summary).reduce((s, v) => s + v.enviado, 0);
    const totalErros = Object.values(summary).reduce((s, v) => s + v.erro, 0);

    return NextResponse.json({
      summary,
      totalEnviados,
      totalErros,
      campanhasConcluidas: totalCampanhas._count,
      envios,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / perPage),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
