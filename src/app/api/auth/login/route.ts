import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, generateToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { clinica: true },
    });

    if (!usuario || !(await comparePassword(senha, usuario.senhaHash))) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const token = generateToken({
      userId: usuario.id,
      email: usuario.email,
      role: usuario.role,
      tenantId: usuario.tenantId,
    });

    return NextResponse.json({
      token,
      user: {
        id: usuario.id,
        email: usuario.email,
        role: usuario.role,
        tenantId: usuario.tenantId,
        clinica: usuario.clinica.nome,
        slug: usuario.clinica.slug,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro interno ao realizar login' }, { status: 500 });
  }
}
