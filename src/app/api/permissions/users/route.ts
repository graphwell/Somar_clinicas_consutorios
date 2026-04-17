import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/permissions/users
 * Lista usuários ativos + convites pendentes do tenant.
 */
export async function GET(_req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();

    const [usuarios, convites] = await Promise.all([
      prisma.usuario.findMany({
        where: { tenantId, ativo: true },
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          telefone: true,
          avatarUrl: true,
          createdAt: true,
          profissionalId: true,
          profissional: { select: { nome: true, fotoUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.convite.findMany({
        where: {
          tenantId,
          status: 'pendente',
          expirarEm: { gte: new Date() },
        },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          role: true,
          createdAt: true,
          expirarEm: true,
          token: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return Response.json({ usuarios, convites });
  } catch (err) {
    console.error('[permissions/users GET]', err);
    return Response.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
  }
}
