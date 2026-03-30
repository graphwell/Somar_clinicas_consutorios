import { NextResponse } from 'next/server';
import { getSessionInfo } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const { tenantId } = await getSessionInfo();

    const [enviosPorTipo, totalCampanhas, recenteEnvios] = await Promise.all([
      prisma.marketingEnvio.groupBy({
        by: ['tipo', 'status'],
        where: { tenantId },
        _count: true,
      }),
      prisma.campanhaAviso.aggregate({
        where: { tenantId, status: 'concluida' },
        _sum: { totalEnviado: true },
        _count: true,
      }),
      prisma.marketingEnvio.findMany({
        where: { tenantId },
        orderBy: { enviadoEm: 'desc' },
        take: 20,
        select: {
          id: true,
          tipo: true,
          pacienteNome: true,
          pacienteTelefone: true,
          mensagem: true,
          status: true,
          erroDetalhe: true,
          enviadoEm: true,
        },
      }),
    ]);

    // Sumariza por tipo
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
      enviosRecentes: recenteEnvios,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
