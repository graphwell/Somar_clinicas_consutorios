import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/auth';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://synka.somar.ia.br';

// GET /api/auth/verificar-email?token=xxxxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/auth/login?error=token_invalido`);
  }

  try {
    const verificacao = await prisma.emailVerificacao.findUnique({ where: { token } });

    if (!verificacao || verificacao.usado || verificacao.expiraEm < new Date()) {
      return NextResponse.redirect(`${APP_URL}/auth/login?error=token_expirado`);
    }

    // Marcar como usado e verificar email do usuário
    await prisma.emailVerificacao.update({ where: { token }, data: { usado: true } });

    const usuario = await prisma.usuario.update({
      where: { email: verificacao.email },
      data: { emailVerificado: true },
      include: { clinica: true },
    });

    // Gerar JWT e redirecionar para onboarding
    const jwt = await signToken({
      userId: usuario.id,
      email: usuario.email,
      role: usuario.role,
      tenantId: usuario.tenantId,
      profissionalId: usuario.profissionalId || undefined,
    });

    const redirectTo = usuario.clinica?.onboardingCompleted ? '/dashboard' : '/onboarding';
    return NextResponse.redirect(
      `${APP_URL}/auth/google-success?token=${jwt}&redirect=${redirectTo}`
    );
  } catch (err: any) {
    console.error('[VERIFICAR_EMAIL_ERROR]', err);
    return NextResponse.redirect(`${APP_URL}/auth/login?error=erro_interno`);
  }
}
