import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { clinica: true },
    });

    if (!usuario || !usuario.senhaHash || !(await comparePassword(senha, usuario.senhaHash))) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // Verificação de email obrigatória para login com senha
    if (!usuario.emailVerificado) {
      return NextResponse.json({
        error: 'Email não verificado. Verifique sua caixa de entrada.',
        code: 'EMAIL_NAO_VERIFICADO',
      }, { status: 403 });
    }

    // Verificar acesso temporário
    if (usuario.acessoExpiraEm && usuario.acessoExpiraEm < new Date()) {
      return NextResponse.json({
        error: 'Seu acesso temporário expirou. Entre em contato com o administrador.',
        code: 'ACESSO_EXPIRADO',
      }, { status: 403 });
    }

    const token = await signToken({
      userId: usuario.id,
      email: usuario.email,
      role: usuario.role,
      tenantId: usuario.tenantId,
      profissionalId: usuario.profissionalId || undefined,
      acessoExpiraEm: usuario.acessoExpiraEm?.toISOString(),
    });

    return NextResponse.json({
      token,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        tenantId: usuario.tenantId,
        profissionalId: usuario.profissionalId || null,
        avatarUrl: usuario.avatarUrl || null,
        clinica: usuario.clinica.nome,
        slug: usuario.clinica.slug,
        onboardingCompleted: usuario.clinica.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro interno ao realizar login.' }, { status: 500 });
  }
}
