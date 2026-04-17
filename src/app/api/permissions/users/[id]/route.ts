import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/permissions/users/[id]
 * Altera role do usuário.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await getSessionInfo();
    const { role } = await req.json();

    const roles = ['admin', 'recepcao', 'profissional', 'temporario'];
    if (!role || !roles.includes(role)) {
      return Response.json({ error: 'Role inválido' }, { status: 400 });
    }

    await prisma.usuario.update({
      where: { id: params.id, tenantId },
      data: { role },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[permissions/users/[id] PATCH]', err);
    return Response.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
  }
}

/**
 * DELETE /api/permissions/users/[id]
 * Desativa usuário (soft delete).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId, userId } = await getSessionInfo();

    if (params.id === userId) {
      return Response.json(
        { error: 'Você não pode remover sua própria conta' },
        { status: 400 }
      );
    }

    await prisma.usuario.update({
      where: { id: params.id, tenantId },
      data: { ativo: false },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[permissions/users/[id] DELETE]', err);
    return Response.json({ error: 'Erro ao remover usuário' }, { status: 500 });
  }
}
