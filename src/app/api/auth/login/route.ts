import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';

async function registrarLog(
  request: Request,
  email: string,
  resultado: string,
  detalhe?: string
) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null;
    const userAgent = request.headers.get('user-agent') ?? null;
    await prisma.loginLog.create({
      data: { email, resultado, detalhe: detalhe ?? null, ip, userAgent },
    });
  } catch {
    // Não deixar falha de log quebrar o login
  }
}

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

    if (!usuario) {
      await registrarLog(request, email, 'email_nao_encontrado');
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    if (!usuario.senhaHash || !(await comparePassword(senha, usuario.senhaHash))) {
      await registrarLog(request, email, 'credenciais_invalidas');
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // Verificar acesso temporário
    if (usuario.acessoExpiraEm && usuario.acessoExpiraEm < new Date()) {
      await registrarLog(request, email, 'acesso_expirado');
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

    await registrarLog(request, email, 'sucesso');

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
