import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/fila-espera
 * Painel da recepção — lista fila ativa do tenant
 */
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const { searchParams } = new URL(request.url);
    const profissionalId = searchParams.get('profissionalId');

    const fila = await prisma.filaEspera.findMany({
      where: {
        tenantId,
        status: { in: ['aguardando', 'notificado'] },
        ...(profissionalId ? { profissionalId } : {}),
      },
      include: {
        paciente:     { select: { nome: true, telefone: true } },
        profissional: { select: { nome: true } },
        servico:      { select: { nome: true } },
      },
      orderBy: [
        { dataDesejada: 'asc' },
        { prioridade: 'desc' },
        { posicao: 'asc' },
      ],
    });

    return Response.json(fila);
  } catch (err) {
    console.error('[fila-espera GET]', err);
    return Response.json({ error: 'Erro ao buscar fila' }, { status: 500 });
  }
}
