import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

// POST /api/auth/reset-senha — { token, novaSenha }
export async function POST(request: Request) {
  try {
    const { token, novaSenha } = await request.json();

    if (!token || !novaSenha) {
      return NextResponse.json({ error: 'Token e nova senha são obrigatórios.' }, { status: 400 });
    }

    // Validar força da senha
    if (novaSenha.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
    }
    if (!/[A-Z]/.test(novaSenha)) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos uma letra maiúscula.' }, { status: 400 });
    }
    if (!/[0-9]/.test(novaSenha)) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos um número.' }, { status: 400 });
    }

    const reset = await prisma.senhaReset.findUnique({ where: { token } });
    if (!reset || reset.usado || reset.expiraEm < new Date()) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 400 });
    }

    const senhaHash = await hashPassword(novaSenha);
    await prisma.usuario.update({
      where: { email: reset.email },
      data: { senhaHash },
    });
    await prisma.senhaReset.update({ where: { token }, data: { usado: true } });

    return NextResponse.json({ success: true, message: 'Senha redefinida com sucesso!' });
  } catch (err: any) {
    console.error('[RESET_SENHA_ERROR]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
