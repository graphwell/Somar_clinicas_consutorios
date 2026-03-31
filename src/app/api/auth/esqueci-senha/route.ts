import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { enviarResetSenha } from '@/lib/emails';
import { randomUUID } from 'crypto';

// POST /api/auth/esqueci-senha — solicitar reset de senha
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }

    // SEMPRE retorna sucesso — não revelar se email existe (segurança)
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (usuario) {
      const token = randomUUID();
      const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Invalidar tokens anteriores não usados para este email
      await prisma.senhaReset.updateMany({
        where: { email, usado: false },
        data: { usado: true },
      });

      await prisma.senhaReset.create({ data: { email, token, expiraEm } });

      // Enviar email (não bloquear a resposta se falhar)
      enviarResetSenha(email, usuario.nome || email.split('@')[0], token).catch((err) =>
        console.error('[ESQUECI_SENHA] Email error:', err)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Se esse email estiver cadastrado, você receberá as instruções em breve.',
    });
  } catch (err: any) {
    console.error('[ESQUECI_SENHA_ERROR]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
