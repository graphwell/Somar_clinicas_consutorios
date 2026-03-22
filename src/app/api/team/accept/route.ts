import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateEventoId } from '@/lib/utils-saas';

// @ts-ignore
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, nome, senha } = await request.json();

    if (!token || !nome || !senha) {
      return NextResponse.json({ error: 'token, nome e senha são obrigatórios.' }, { status: 400 });
    }

    const invite = await prisma.inviteToken.findUnique({ where: { token } });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Convite inválido ou expirado.' }, { status: 404 });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const usuario = await prisma.usuario.create({
      data: {
        email: invite.email,
        senhaHash,
        role: invite.role,
        tenantId: invite.tenantId,
        nome,
      },
    });

    // Invalidar convite
    await prisma.inviteToken.update({ where: { token }, data: { used: true } });

    return NextResponse.json({ success: true, userId: usuario.id });
  } catch (error) {
    console.error('[ACCEPT_INVITE_ERROR]', error);
    return NextResponse.json({ error: 'Erro ao aceitar convite.' }, { status: 500 });
  }
}
