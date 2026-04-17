import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionInfo } from '@/lib/auth-helpers';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/permissions/create-direct
 * Cria usuário direto — admin define a senha na hora.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getSessionInfo();
    const body = await req.json();
    const { nome, email, telefone, role, senha, profissionalId } = body;

    if (!nome || !role || !senha) {
      return Response.json(
        { error: 'nome, role e senha são obrigatórios' },
        { status: 400 }
      );
    }
    if (senha.length < 6) {
      return Response.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 });
    }
    if (!email && !telefone) {
      return Response.json({ error: 'email ou telefone é obrigatório' }, { status: 400 });
    }

    // email é @unique global — verificar antes de criar
    if (email) {
      const existe = await prisma.usuario.findUnique({ where: { email } });
      if (existe) {
        return Response.json(
          { error: 'Já existe uma conta com esse email' },
          { status: 400 }
        );
      }
    }

    const senhaHash = await hashPassword(senha);

    const usuario = await prisma.usuario.create({
      data: {
        tenantId,
        nome,
        email: email ?? `sem-email-${Date.now()}@synka.internal`,
        telefone: telefone ?? null,
        role,
        senhaHash,
        profissionalId: profissionalId ?? null,
        ativo: true,
        emailVerificado: true, // admin criou diretamente
      },
      select: { id: true, nome: true, role: true },
    });

    return Response.json({ ok: true, usuarioId: usuario.id });
  } catch (err) {
    console.error('[permissions/create-direct POST]', err);
    return Response.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
}
